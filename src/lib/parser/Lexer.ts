import { isString } from '@lib/common';
import { IDiagnosticReport } from '@lib/idl/IDiagnostics';
import { IMap } from '@lib/idl/IMap';
import { ETokenType, IFile, IPosition, IRange, IToken } from '@lib/idl/parser/IParser';
import { Diagnostics } from '@lib/util/Diagnostics';
import { StringRef } from '@lib/util/StringRef';

import { END_SYMBOL, EOF, ERROR, T_FLOAT, T_LINE_TERMINATOR, T_NON_TYPE_ID, T_STRING, T_TYPE_ID, T_UINT, UNKNOWN_TOKEN } from './symbols';

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
            [ELexerErrors.UnknownToken]: "Unknown token: {token.value}.",
            [ELexerErrors.InvalidToken]: "Invalid token: {token.value}."
        };
    }
}


export class Lexer {
    //
    // State
    //
    private _index: number;
    private _lineNumber: number;
    private _columnNumber: number;
    private _filename: IFile;
    private _source: string;
    private _typeIdMap: IMap<boolean>;
    private _diag: LexerDiagnostics;

    //
    // Setup
    //
    private _punctuatorsMap: IMap<string>;
    private _keywordsMap: IMap<string>;
    private _punctuatorsFirstSymbols: IMap<boolean>;


    constructor() {
        this._lineNumber = 0;
        this._columnNumber = 0;
        this._source = '';
        this._filename = null;
        this._index = 0;
        this._diag = new LexerDiagnostics;
        this._typeIdMap = null;

        this._punctuatorsMap = <IMap<string>>{};
        this._keywordsMap = <IMap<string>>{};
        this._punctuatorsFirstSymbols = <IMap<boolean>>{};
    }


    static getPunctuatorName(value: string): string {
        return "T_PUNCTUATOR_" + value.charCodeAt(0);
    }

    getDiagnostics(): IDiagnosticReport {
        return this._diag.resolve();
    }

    addPunctuator(value: string, name: string = Lexer.getPunctuatorName(value)): string {
        this._punctuatorsMap[value] = name;
        this._punctuatorsFirstSymbols[value[0]] = true;
        return name;
    }


    addKeyword(value: string, name: string): string {
        this._keywordsMap[value] = name;
        return name;
    }


    getTerminalValueByName(name: string): string {
        let value = "";

        for (value in this._punctuatorsMap) {
            if (this._punctuatorsMap[value] === name) {
                return value;
            }
        }

        for (value in this._keywordsMap) {
            if (this._keywordsMap[value] === name) {
                return value;
            }
        }

        return name;
    }


    init(source: string, filename: IFile | string, types: IMap<boolean>): void {
        this._filename = <IFile>(isString(filename) ? StringRef.make(filename) : filename);
        this._source = source;
        this._lineNumber = 0;
        this._columnNumber = 0;
        this._index = 0;
        this._diag.reset();
        this._typeIdMap = types;
    }


    getNextToken(allowLineTerminators?: boolean): IToken {
        let ch = this.currentChar();
        if (!ch) {
            let pos = this.pos();
            return <IToken>{
                index: this._index,
                name: END_SYMBOL,
                value: END_SYMBOL,
                loc: {
                    start: pos,
                    end: { ...pos }
                }
            };
        }
        let tokenType = this.identityTokenType();
        let token: IToken = null;
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
            case ETokenType.k_NewlineLiteral:
                token = this.scanLineTerminators();
                if (!allowLineTerminators) {
                    token = this.getNextToken();
                }
                break;
            case ETokenType.k_WhitespaceLiteral:
                this.scanWhiteSpace();
                token = this.getNextToken();
                break;
            default:
                {
                    // TODO: move this code to scanInvalid()
                    const start = this.pos();
                    let value = '';
                    while (this.identityTokenType() === ETokenType.k_Unknown) {
                        value += this.currentChar();
                        this.readNextChar();
                    }
                    token = {
                        index: this._index,
                        name: UNKNOWN_TOKEN,
                        value,
                        loc: { start, end: this.pos() }
                    };
                    // console.warn(value);
                    this.emitError(ELexerErrors.UnknownToken, token);
                    return token;
                }
        }
        return token;
    }


    getLocation() {
        return { line: this._lineNumber, file: this._filename };
    }


    setSource(sSource: string): void {
        this._source = sSource;
    }


    setIndex(iIndex: number): void {
        this._index = iIndex;
    }


    private pos(n: number = 0): IPosition {
        return {
            file: this._filename,
            line: this._lineNumber,
            column: this._columnNumber + n,
            offset: this._index + n
        };
    }


    private emitError(code: number, token: IToken): void {
        this._diag.error(code, { file: `${this._filename}`, token });
    }


    private identityTokenType(): ETokenType {
        if (this.isIdentifierStart()) {
            return ETokenType.k_IdentifierLiteral;
        }
        if (this.isWhiteSpaceStart()) {
            return ETokenType.k_WhitespaceLiteral;
        }
        if (this.isNewlineStart()) {
            return ETokenType.k_NewlineLiteral;
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
        if (ch === " " || ch === "\t") {
            return true;
        }
        return false;
    }


    private isNewlineStart(): boolean {
        let ch: string = this.currentChar();
        if (ch === "\n" || ch === "\r" ) {
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


    private scanString(): IToken {
        let chFirst = this.currentChar();
        let value = chFirst;
        let ch = "";
        let chPrevious = chFirst;
        let isGoodFinish = false;
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
                index: this._index,
                name: T_STRING,
                value,
                loc: {
                    start,
                    end: this.pos()
                }
            };
        }
        else {
            if (!ch) {
                ch = EOF;
            }
            value += ch;

            const token = {
                index: this._index,
                type: ETokenType.k_StringLiteral,
                value,
                loc: {
                    start,
                    end: this.pos()
                }
            };

            this.emitError(ELexerErrors.InvalidToken, token);

            return Lexer.makeUnknownToken(token);
        }
    }

    static makeUnknownToken(token: IToken): IToken {
        return {
            ...token,
            type: undefined,
            name: UNKNOWN_TOKEN,
            loc: {
                start: { ...token.loc.start },
                end: { ...token.loc.end }
            }
        };
    }


    private scanPunctuator(): IToken {
        let value = this.currentChar();
        let start = this.pos();
        let ch: string;
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
            index: this._index,
            name: this._punctuatorsMap[value],
            value,
            loc: {
                start,
                end: this.pos()
            }
        };
    }


    private scanNumber(): IToken {
        let ch = this.currentChar();
        let value = "";
        let isFloat = false;
        let chPrevious = ch;
        let isGoodFinish = false;
        let isE = false;
        let start = this.pos();

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
            let name = isFloat ? T_FLOAT : T_UINT;
            return <IToken>{
                index: this._index,
                name,
                value,
                loc: {
                    start,
                    end: this.pos()
                }
            };
        }
        else {
            if (!ch) {
                ch = EOF;
            }
            value += ch;

            const token = {
                index: this._index,
                type: ETokenType.k_NumericLiteral,
                value,
                loc: {
                    start,
                    end: this.pos()
                }
            };

            this.emitError(ELexerErrors.InvalidToken, token);
            return Lexer.makeUnknownToken(token);
        }
    }


    private scanIdentifier(): IToken {
        let ch = this.currentChar();
        let value = ch;
        let start = this.pos();
        let isGoodFinish = false;

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
                    index: this._index,
                    name: this._keywordsMap[value],
                    value,
                    loc: {
                        start,
                        end: this.pos()
                    }
                };
            }
            else {
                let name = this._typeIdMap[value] ? T_TYPE_ID : T_NON_TYPE_ID;
                return <IToken>{
                    index: this._index,
                    name,
                    value,
                    loc: {
                        start,
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

            const token = {
                index: this._index,
                type: ETokenType.k_IdentifierLiteral,
                value,
                loc: {
                    start,
                    end: this.pos()
                }
            };
            this.emitError(ELexerErrors.InvalidToken, token);
            return Lexer.makeUnknownToken(token);
        }
    }


    private scanLineTerminators(): IToken {
        let ch = this.currentChar();
        let value = '';
        let start = this.pos();

        while (true) {
            if (!ch) {
                break;
            }
            if (this.isLineTerminator(ch)) {
                value += ch;
                if (ch === "\r" && this.nextChar() === "\n") {
                    this._lineNumber--;
                }
                this._lineNumber++;
                ch = this.readNextChar();
                this._columnNumber = 0;
                continue;
            }
            break;
        }

        let name = T_LINE_TERMINATOR;
        return <IToken>{
            index: this._index,
            name,
            value,
            loc: {
                start,
                end: this.pos()
            }
        };
    }
    private scanWhiteSpace(): boolean {
        let ch = this.currentChar();

        while (true) {
            if (!ch) {
                break;
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
        let value = this.currentChar();
        let ch = this.readNextChar();
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
            let chPrevious = ch;
            let isGoodFinish = false;
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

                const token = {
                    index: this._index,
                    type: ETokenType.k_CommentLiteral,
                    value,
                    loc: {
                        start,
                        end: this.pos()
                    }
                };

                this.emitError(ELexerErrors.InvalidToken, token);
                return false;
            }
        }
    }
}
