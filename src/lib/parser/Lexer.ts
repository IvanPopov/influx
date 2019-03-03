import { IMap } from '@lib/idl/IMap';
import { ETokenType, IFile, IPosition, IRange, IToken } from '@lib/idl/parser/IParser';
import { Diagnostics, IDiagnosticReport } from '@lib/util/Diagnostics';
import { END_SYMBOL, EOF, T_FLOAT, T_NON_TYPE_ID, T_STRING, T_TYPE_ID, T_UINT, UNKNOWN_TOKEN } from './symbols';


interface ILexerDiagDesc {
    file: string;
    token: IToken;
}


enum ELexerErrors {
    UnknownToken = 2101,
    InvalidToken = 2102
};


class LexerDiagnostics extends Diagnostics<ILexerDiagDesc> {
    constructor() {
        super("Lexer Diagnostics", 'L');
    }

    protected resolveFilename(code: number, desc: ILexerDiagDesc): string {
        return desc.file;
    }

    protected resolveRange(code: number, desc: ILexerDiagDesc): IRange {
        return desc.token.loc;
    }

    protected diagnosticMessages() {
        return {
            [ELexerErrors.UnknownToken] : "Unknown token: {token.value}.",
            [ELexerErrors.InvalidToken] : "Invalid token: {token.value}."
        };
    }
}


export class Lexer {
    private _lineNumber: number;
    private _columnNumber: number;
    private _source: string;
    private _index: number;
    private _punctuatorsMap: IMap<string>;
    private _keywordsMap: IMap<string>;
    private _punctuatorsFirstSymbols: IMap<boolean>;
    private _diag: LexerDiagnostics;
    private _onResolveTypeID: (value: string) => boolean;
    // todo: remove this callback in favor of string member; 
    private _onResolveFilename: () => IFile; // optional, only for debug diagnostics


    constructor({ onResolveFilename, onResolveTypeId }: { onResolveFilename?: () => IFile; onResolveTypeId: (value: string) => boolean; }) {
        this._lineNumber = 0;
        this._columnNumber = 0;
        this._source = '';
        this._index = 0;
        this._punctuatorsMap = <IMap<string>>{};
        this._keywordsMap = <IMap<string>>{};
        this._punctuatorsFirstSymbols = <IMap<boolean>>{};
        this._diag = new LexerDiagnostics;
        this._onResolveTypeID = onResolveTypeId;
        this._onResolveFilename = onResolveFilename;
    }


    static getPunctuatorName(value: string): string {
        return "T_PUNCTUATOR_" + value.charCodeAt(0);
    }

    getDiagnostics(): IDiagnosticReport {
        return this._diag.resolve();
    }

    addPunctuator(value: string, sName: string = Lexer.getPunctuatorName(value)): string {
        this._punctuatorsMap[value] = sName;
        this._punctuatorsFirstSymbols[value[0]] = true;
        return sName;
    }


    addKeyword(value: string, sName: string): string {
        this._keywordsMap[value] = sName;
        return sName;
    }


    getTerminalValueByName(sName: string): string {
        var value: string = "";

        for (value in this._punctuatorsMap) {
            if (this._punctuatorsMap[value] === sName) {
                return value;
            }
        }

        for (value in this._keywordsMap) {
            if (this._keywordsMap[value] === sName) {
                return value;
            }
        }

        return sName;
    }


    init(source: string): void {
        this._source = source;
        this._lineNumber = 0;
        this._columnNumber = 0;
        this._index = 0;
        this._diag.reset();
    }


    getNextToken(): IToken | null {
        var ch: string = this.currentChar();
        if (!ch) {
            let pos = this.pos();
            return <IToken>{
                name: END_SYMBOL,
                value: END_SYMBOL,
                loc: {
                    start: pos,
                    end: { ...pos }
                }
            };
        }
        var tokenType = this.identityTokenType();
        var token: IToken | null = null;
        switch (tokenType) {
            case ETokenType.k_NumericLiteral:
                token = this.scanNumber();
                break;
            case ETokenType.k_CommentLiteral:
                this.scanComment();
                token = this.getNextToken();
                break;
            case ETokenType.k_StringLiteral:
                token = this.scanString();
                break;
            case ETokenType.k_PunctuatorLiteral:
                token = this.scanPunctuator();
                break;
            case ETokenType.k_IdentifierLiteral:
                token = this.scanIdentifier();
                break;
            case ETokenType.k_WhitespaceLiteral:
                this.scanWhiteSpace();
                token = this.getNextToken();
                break;
            default:
                this.critical(ELexerErrors.UnknownToken, {
                    file: `${this._onResolveFilename()}`,
                    token: {
                        name: UNKNOWN_TOKEN,
                        value: ch + this._source[this._index + 1],
                        loc: {
                            start: this.pos(),
                            end: this.pos(1)
                        }
                    }
                });
        }
        return token;
    }


    private loc() {
        return { line: this._lineNumber, file: this._onResolveFilename() };
    }


    getIndex(): number {
        return this._index;
    }


    setSource(sSource: string): void {
        this._source = sSource;
    }


    setIndex(iIndex: number): void {
        this._index = iIndex;
    }


    private pos(n: number = 0): IPosition {
        return {
            file: this._onResolveFilename(),
            line: this._lineNumber,
            column: this._columnNumber + n
        };
    }


    private critical(code: number, desc: ILexerDiagDesc): void {
        this._diag.critical(code, desc);
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
        if (this._punctuatorsFirstSymbols[ch]) {
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


    private isLineTerminator(symbol: string): boolean {
        return (symbol === "\n" || symbol === "\r" || symbol === "\u2028" || symbol === "\u2029");
    }


    private isKeyword(value: string): boolean {
        return !!(this._keywordsMap[value]);
    }


    private isPunctuator(value: string): boolean {
        return !!(this._punctuatorsMap[value]);
    }


    private nextChar(): string {
        return this._source[this._index + 1];
    }


    private currentChar(): string {
        return this._source[<number>this._index];
    }


    private readNextChar(): string {
        this._index++;
        this._columnNumber++;
        return this._source[<number>this._index];
    }


    private scanString(): IToken | null {
        let chFirst: string = this.currentChar();
        let value: string = chFirst;
        let ch: string = "";
        let chPrevious: string = chFirst;
        let isGoodFinish: boolean = false;
        let start = this.pos();

        while (true) {
            ch = this.readNextChar();
            if (!ch) {
                break;
            }
            value += ch;
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
                value: value,
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
            value += ch;

            this.critical(ELexerErrors.InvalidToken, {
                file: `${this._onResolveFilename()}`,
                token: {
                    type: ETokenType.k_StringLiteral,
                    value: value,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
                }
            });
            return null;
        }
    }


    private scanPunctuator(): IToken {
        let value: string = this.currentChar();
        let ch: string;
        let start = this.pos();
        while (true) {
            ch = this.readNextChar();
            if (ch) {
                value += ch;
                if (!this.isPunctuator(value)) {
                    value = value.slice(0, value.length - 1);
                    break;
                }
            }
            else {
                break;
            }
        }
        return <IToken>{
            name: this._punctuatorsMap[value],
            value: value,
            loc: {
                start: start,
                end: this.pos()
            }
        };
    }


    private scanNumber(): IToken | null {
        let ch: string = this.currentChar();
        let value: string = "";
        let isFloat: boolean = false;
        let chPrevious: string = ch;
        let isGoodFinish: boolean = false;
        let start = this.pos();
        let isE: boolean = false;

        if (ch === ".") {
            value += 0;
            isFloat = true;
        }

        value += ch;

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
                value += ch;
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
            value += ch;
            chPrevious = ch;
        }

        if (isGoodFinish) {
            let sName = isFloat ? T_FLOAT : T_UINT;
            return <IToken>{
                name: sName,
                value: value,
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
            value += ch;
            this.critical(ELexerErrors.InvalidToken, {
                file: `${this._onResolveFilename()}`,
                token: {
                    type: ETokenType.k_NumericLiteral,
                    value: value,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
                }
            });
            return null;
        }
    }


    private scanIdentifier(): IToken | null {
        let ch: string = this.currentChar();
        let value: string = ch;
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
            value += ch;
        }

        if (isGoodFinish) {
            if (this.isKeyword(value)) {
                return <IToken>{
                    name: this._keywordsMap[value],
                    value: value,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
                };
            }
            else {
                let sName = this._onResolveTypeID(value) ? T_TYPE_ID : T_NON_TYPE_ID;
                return <IToken>{
                    name: sName,
                    value: value,
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
            value += ch;
            this.critical(ELexerErrors.InvalidToken, {
                file: `${this._onResolveFilename()}`,
                token: {
                    type: ETokenType.k_IdentifierLiteral,
                    value: value,
                    loc: {
                        start: start,
                        end: this.pos()
                    }
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
                    this._lineNumber--;
                }
                this._lineNumber++;
                ch = this.readNextChar();
                this._columnNumber = 0;
                continue;
            }
            else if (ch === "\t") {
                // possible way to convert tab to multiple spaces
                this._columnNumber += 0;
            }
            else if (ch !== " ") {
                break;
            }
            ch = this.readNextChar();
        }

        return true;
    }


    private scanComment(): boolean {
        let value: string = this.currentChar();
        let ch: string = this.readNextChar();
        value += ch;

        if (ch === "/") {
            //Line Comment
            while (true) {
                ch = this.readNextChar();
                if (!ch) {
                    break;
                }
                if (this.isLineTerminator(ch)) {
                    if (ch === "\r" && this.nextChar() === "\n") {
                        this._lineNumber--;
                    }
                    this._lineNumber++;
                    this.readNextChar();
                    this._columnNumber = 0;
                    break;
                }
                value += ch;
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
                value += ch;
                if (ch === "/" && chPrevious === "*") {
                    isGoodFinish = true;
                    this.readNextChar();
                    break;
                }
                if (this.isLineTerminator(ch)) {
                    if (ch === "\r" && this.nextChar() === "\n") {
                        this._lineNumber--;
                    }
                    this._lineNumber++;
                    this._columnNumber = -1;
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
                value += ch;
                this.critical(ELexerErrors.InvalidToken, {
                    file: `${this._onResolveFilename()}`,
                    token: {
                        type: ETokenType.k_CommentLiteral,
                        value: value,
                        loc: {
                            start: start,
                            end: this.pos()
                        }
                    }
                });
                return false;
            }
        }
    }
}
