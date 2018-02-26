import { ILoggerEntity, ISourceLocation } from '../idl/ILogger';
import { IMap } from '../idl/IMap';
import { ETokenType, ILexer, IParser, IToken, ITokenPosition, ITokenLocation } from '../idl/parser/IParser';
import { logger } from '../logger';
import { END_SYMBOL, EOF, T_FLOAT, T_NON_TYPE_ID, T_STRING, T_TYPE_ID, T_UINT, UNKNOWN_TOKEN } from './symbols';

const LEXER_UNKNOWN_TOKEN = 2101;
const LEXER_BAD_TOKEN = 2102;

logger.registerCodeFamily(2000, 2199, "ParserSyntaxErrors");

logger.registerCode(LEXER_UNKNOWN_TOKEN, "Unknown token: {tokenValue}");
logger.registerCode(LEXER_BAD_TOKEN, "Bad token: {tokenValue}");

export class Lexer implements ILexer {
    private _iLineNumber: number;
    private _iColumnNumber: number;
    private _sSource: string;
    private _iIndex: number;
    private _pParser: IParser;
    private _pPunctuatorsMap: IMap<string>;
    private _pKeywordsMap: IMap<string>;
    private _pPunctuatorsFirstSymbols: IMap<boolean>;

    constructor(pParser: IParser) {
        this._iLineNumber = 0;
        this._iColumnNumber = 0;
        this._sSource = '';
        this._iIndex = 0;
        this._pParser = pParser;
        this._pPunctuatorsMap = <IMap<string>>{};
        this._pKeywordsMap = <IMap<string>>{};
        this._pPunctuatorsFirstSymbols = <IMap<boolean>>{};
    }

    public static getPunctuatorName(sValue: string): string {
        return "T_PUNCTUATOR_" + sValue.charCodeAt(0);
    }

    addPunctuator(sValue: string, sName: string = Lexer.getPunctuatorName(sValue)): string {
        this._pPunctuatorsMap[sValue] = sName;
        this._pPunctuatorsFirstSymbols[sValue[0]] = true;
        return sName;
    }

    public addKeyword(sValue: string, sName: string): string {
        this._pKeywordsMap[sValue] = sName;
        return sName;
    }

    public getTerminalValueByName(sName: string): string {
        var sValue: string = "";

        for (sValue in this._pPunctuatorsMap) {
            if (this._pPunctuatorsMap[sValue] === sName) {
                return sValue;
            }
        }

        for (sValue in this._pKeywordsMap) {
            if (this._pKeywordsMap[sValue] === sName) {
                return sValue;
            }
        }

        return sName;
    }

    public init(sSource: string): void {
        this._sSource = sSource;
        this._iLineNumber = 0;
        this._iColumnNumber = 0;
        this._iIndex = 0;
    }

    public getNextToken(): IToken | null {
        var ch: string = this.currentChar();
        if (!ch) {
            let pos = this.pos();
            return <IToken>{
                name: END_SYMBOL,
                value: END_SYMBOL,
                loc: { 
                    start: pos, 
                    end: pos 
                }
            };
        }
        var eType: ETokenType = this.identityTokenType();
        var pToken: IToken | null = null;
        switch (eType) {
            case ETokenType.k_NumericLiteral:
                pToken = this.scanNumber();
                break;
            case ETokenType.k_CommentLiteral:
                this.scanComment();
                pToken = this.getNextToken();
                break;
            case ETokenType.k_StringLiteral:
                pToken = this.scanString();
                break;
            case ETokenType.k_PunctuatorLiteral:
                pToken = this.scanPunctuator();
                break;
            case ETokenType.k_IdentifierLiteral:
                pToken = this.scanIdentifier();
                break;
            case ETokenType.k_WhitespaceLiteral:
                this.scanWhiteSpace();
                pToken = this.getNextToken();
                break;
            default:
                this.error(LEXER_UNKNOWN_TOKEN,
                    <IToken>{
                        name: UNKNOWN_TOKEN,
                        value: ch + this._sSource[this._iIndex + 1],
                        loc: {
                            start: this.pos(),
                            end: this.pos(1)
                        }
                    });
        }
        return pToken;
    }

    public getIndex(): number {
        return this._iIndex;
    }

    public setSource(sSource: string): void {
        this._sSource = sSource;
    }

    public setIndex(iIndex: number): void {
        this._iIndex = iIndex;
    }

    private pos(n: number = 0): ITokenPosition {
        return { 
            line: this._iLineNumber, 
            column: this._iColumnNumber + n
        };
    }

    private error(eCode: number, pToken: IToken): void {
        let pLocation: ISourceLocation = <ISourceLocation>{
            file: this._pParser.getParseFileName(),
            line: this._iLineNumber
        };
        let pInfo: Object = {
            tokenValue: pToken.value,
            tokenType: pToken.type
        };

        let pLogEntity: ILoggerEntity = <ILoggerEntity>{ code: eCode, info: pInfo, location: pLocation };

        logger.error(pLogEntity);

        throw new Error(eCode.toString());
    }

    private identityTokenType(): ETokenType {
        if (this.isIdentifierStart()) {
            return ETokenType.k_IdentifierLiteral;
        }
        if (this.isWhiteSpaceStart()) {
            return ETokenType.k_WhitespaceLiteral;
        }
        if (this.isStringStart()) {
            return ETokenType.k_StringLiteral;
        }
        if (this.isCommentStart()) {
            return ETokenType.k_CommentLiteral;
        }
        if (this.isNumberStart()) {
            return ETokenType.k_NumericLiteral;
        }
        if (this.isPunctuatorStart()) {
            return ETokenType.k_PunctuatorLiteral;
        }
        return ETokenType.k_Unknown;
    }

    private isNumberStart(): boolean {
        let ch: string = this.currentChar();

        if ((ch >= "0") && (ch <= "9")) {
            return true;
        }

        let ch1: string = this.nextChar();
        if (ch === "." && (ch1 >= "0") && (ch1 <= "9")) {
            return true;
        }

        return false;
    }

    private isCommentStart(): boolean {
        let ch: string = this.currentChar();
        let ch1: string = this.nextChar();

        if (ch === "/" && (ch1 === "/" || ch1 === "*")) {
            return true;
        }

        return false;
    }

    private isStringStart(): boolean {
        let ch: string = this.currentChar();
        if (ch === "\"" || ch === "'") {
            return true;
        }
        return false;
    }

    private isPunctuatorStart(): boolean {
        let ch: string = this.currentChar();
        if (this._pPunctuatorsFirstSymbols[ch]) {
            return true;
        }
        return false;
    }

    private isWhiteSpaceStart(): boolean {
        let ch: string = this.currentChar();
        if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
            return true;
        }
        return false;
    }

    private isIdentifierStart(): boolean {
        let ch: string = this.currentChar();
        if ((ch === "_") || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
            return true;
        }
        return false;
    }

    private isLineTerminator(sSymbol: string): boolean {
        return (sSymbol === "\n" || sSymbol === "\r" || sSymbol === "\u2028" || sSymbol === "\u2029");
    }

    // private isWhiteSpace(sSymbol: string): boolean {
    //     return (sSymbol === " ") || (sSymbol === "\t");
    // }

    private isKeyword(sValue: string): boolean {
        return !!(this._pKeywordsMap[sValue]);
    }

    private isPunctuator(sValue: string): boolean {
        return !!(this._pPunctuatorsMap[sValue]);
    }

    private nextChar(): string {
        return this._sSource[this._iIndex + 1];
    }

    private currentChar(): string {
        return this._sSource[<number>this._iIndex];
    }

    private readNextChar(): string {
        this._iIndex++;
        this._iColumnNumber++;
        return this._sSource[<number>this._iIndex];
    }

    private scanString(): IToken | null {
        let chFirst: string = this.currentChar();
        let sValue: string = chFirst;
        let ch: string = "";
        let chPrevious: string = chFirst;
        let isGoodFinish: boolean = false;
        let start = this.pos();

        while (true) {
            ch = this.readNextChar();
            if (!ch) {
                break;
            }
            sValue += ch;
            if (ch === chFirst && chPrevious !== "\\") {
                isGoodFinish = true;
                this.readNextChar();
                break;
            }
            chPrevious = ch;
        }

        if (isGoodFinish) {
            return <IToken>{
                name: T_STRING,
                value: sValue,
                loc: {
                    start: start,
                    end: this.pos()
                }
            };
        }
        else {
            if (!ch) {
                ch = EOF;
            }
            sValue += ch;

            this.error(LEXER_BAD_TOKEN, <IToken>{
                type: ETokenType.k_StringLiteral,
                value: sValue,
                loc: {
                    start: start,
                    end: this.pos()
                }
            });
            return null;
        }
    }

    private scanPunctuator(): IToken {
        let sValue: string = this.currentChar();
        let ch: string;
        let start = this.pos();
        while (true) {
            ch = this.readNextChar();
            if (ch) {
                sValue += ch;
                if (!this.isPunctuator(sValue)) {
                    sValue = sValue.slice(0, sValue.length - 1);
                    break;
                }
            }
            else {
                break;
            }
        }
        return <IToken>{
            name: this._pPunctuatorsMap[sValue],
            value: sValue,
            loc: {
                start: start,
                end: this.pos()
            }
        };
    }

    private scanNumber(): IToken | null {
        let ch: string = this.currentChar();
        let sValue: string = "";
        let isFloat: boolean = false;
        let chPrevious: string = ch;
        let isGoodFinish: boolean = false;
        let start = this.pos();
        let isE: boolean = false;

        if (ch === ".") {
            sValue += 0;
            isFloat = true;
        }

        sValue += ch;

        while (true) {
            ch = this.readNextChar();
            if (ch === ".") {
                if (isFloat) {
                    break;
                }
                else {
                    isFloat = true;
                }
            }
            else if (ch === "e") {
                if (isE) {
                    break;
                }
                else {
                    isE = true;
                }
            }
            else if (((ch === "+" || ch === "-") && chPrevious === "e")) {
                sValue += ch;
                chPrevious = ch;
                continue;
            }
            else if (ch === "f" && isFloat) {
                ch = this.readNextChar();
                if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
                    break;
                }
                isGoodFinish = true;
                break;
            }
            else if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
                break;
            }
            else if (!((ch >= "0") && (ch <= "9")) || !ch) {
                if ((isE && chPrevious !== "+" && chPrevious !== "-" && chPrevious !== "e") || !isE) {
                    isGoodFinish = true;
                }
                break;
            }
            sValue += ch;
            chPrevious = ch;
        }

        if (isGoodFinish) {
            let sName = isFloat ? T_FLOAT : T_UINT;
            return <IToken>{
                name: sName,
                value: sValue,
                loc: {
                    start: start,
                    end: this.pos()
                }
            };
        }
        else {
            if (!ch) {
                ch = EOF;
            }
            sValue += ch;
            this.error(LEXER_BAD_TOKEN, <IToken>{
                type: ETokenType.k_NumericLiteral,
                value: sValue,
                loc: {
                    start: start,
                    end: this.pos()
                }
            });
            return null;
        }
    }

    private scanIdentifier(): IToken | null {
        let ch: string = this.currentChar();
        let sValue: string = ch;
        let start = this.pos();
        let isGoodFinish: boolean = false;

        while (true) {
            ch = this.readNextChar();
            if (!ch) {
                isGoodFinish = true;
                break;
            }
            if (!((ch === "_") || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9"))) {
                isGoodFinish = true;
                break;
            }
            sValue += ch;
        }

        if (isGoodFinish) {
            if (this.isKeyword(sValue)) {
                return <IToken>{
                    name: this._pKeywordsMap[sValue],
                    value: sValue,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
                };
            }
            else {
                let sName = this._pParser.isTypeId(sValue) ? T_TYPE_ID : T_NON_TYPE_ID;
                return <IToken>{
                    name: sName,
                    value: sValue,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
                };
            }
        }
        else {
            if (!ch) {
                ch = EOF;
            }
            sValue += ch;
            this.error(LEXER_BAD_TOKEN, <IToken>{
                type: ETokenType.k_IdentifierLiteral,
                value: sValue,
                loc: {
                    start: start,
                    end: this.pos()
                }
            });
            return null;
        }
    }

    private scanWhiteSpace(): boolean {
        let ch: string = this.currentChar();

        while (true) {
            if (!ch) {
                break;
            }
            if (this.isLineTerminator(ch)) {
                if (ch === "\r" && this.nextChar() === "\n") {
                    this._iLineNumber--;
                }
                this._iLineNumber++;
                ch = this.readNextChar();
                this._iColumnNumber = 0;
                continue;
            }
            else if (ch === "\t") {
                this._iColumnNumber += 3;
            }
            else if (ch !== " ") {
                break;
            }
            ch = this.readNextChar();
        }

        return true;
    }

    private scanComment(): boolean {
        let sValue: string = this.currentChar();
        let ch: string = this.readNextChar();
        sValue += ch;

        if (ch === "/") {
            //Line Comment
            while (true) {
                ch = this.readNextChar();
                if (!ch) {
                    break;
                }
                if (this.isLineTerminator(ch)) {
                    if (ch === "\r" && this.nextChar() === "\n") {
                        this._iLineNumber--;
                    }
                    this._iLineNumber++;
                    this.readNextChar();
                    this._iColumnNumber = 0;
                    break;
                }
                sValue += ch;
            }

            return true;
        }
        else {
            //Multiline Comment
            let chPrevious: string = ch;
            let isGoodFinish: boolean = false;
            let start = this.pos();

            while (true) {
                ch = this.readNextChar();
                if (!ch) {
                    break;
                }
                sValue += ch;
                if (ch === "/" && chPrevious === "*") {
                    isGoodFinish = true;
                    this.readNextChar();
                    break;
                }
                if (this.isLineTerminator(ch)) {
                    if (ch === "\r" && this.nextChar() === "\n") {
                        this._iLineNumber--;
                    }
                    this._iLineNumber++;
                    this._iColumnNumber = -1;
                }
                chPrevious = ch;
            }

            if (isGoodFinish) {
                return true;
            }
            else {
                if (!ch) {
                    ch = EOF;
                }
                sValue += ch;
                this.error(LEXER_BAD_TOKEN, <IToken>{
                    type: ETokenType.k_CommentLiteral,
                    value: sValue,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
                });
                return false;
            }
        }
    }
}
