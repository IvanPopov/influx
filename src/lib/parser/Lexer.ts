import { isString } from '@lib/common';
import { IDiagnosticReport } from '@lib/idl/IDiagnostics';
import { IMap } from '@lib/idl/IMap';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { ETokenType, IFile, ILexerEngine, IPosition, IRange, IToken } from '@lib/idl/parser/IParser';
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


export class LexerEngine implements ILexerEngine {
    readonly keywords: IMap<string> = {};
    readonly punctuators: IMap<string> = {};
    readonly punctuatorsFirstSymbols: IMap<boolean> = {};


    addPunctuator(value: string, name: string = LexerEngine.getPunctuatorName(value)): string {
        this.punctuators[value] = name;
        this.punctuatorsFirstSymbols[value[0]] = true;
        return name;
    }


    addKeyword(value: string, name: string): string {
        this.keywords[value] = name;
        return name;
    }


    getTerminalValueByName(name: string): string {
        let value = "";

        for (value in this.punctuators) {
            if (this.punctuators[value] === name) {
                return value;
            }
        }

        for (value in this.keywords) {
            if (this.keywords[value] === name) {
                return value;
            }
        }

        return name;
    }


    isLineTerminator(symbol: string): boolean {
        return (symbol === "\n" || symbol === "\r" || symbol === "\u2028" || symbol === "\u2029");
    }


    isKeyword(value: string): boolean {
        return !!(this.keywords[value]);
    }


    isPunctuator(value: string): boolean {
        return !!(this.punctuators[value]);
    }


    isNumberStart(ch: string, ch1: string): boolean {
        if ((ch >= "0") && (ch <= "9")) {
            return true;
        }

        if (ch === "." && (ch1 >= "0") && (ch1 <= "9")) {
            return true;
        }

        return false;
    }


    isCommentStart(ch: string, ch1: string): boolean {
        if (ch === "/" && (ch1 === "/" || ch1 === "*")) {
            return true;
        }

        return false;
    }


    isStringStart(ch: string): boolean {
        if (ch === "\"" || ch === "'") {
            return true;
        }
        return false;
    }


    isPunctuatorStart(ch: string): boolean {
        if (this.punctuatorsFirstSymbols[ch]) {
            return true;
        }
        return false;
    }


    isWhiteSpaceStart(ch: string): boolean {
        if (ch === " " || ch === "\t") {
            return true;
        }
        return false;
    }


    isNewlineStart(ch: string): boolean {
        if (ch === "\n" || ch === "\r" ) {
            return true;
        }
        return false;
    }


    isIdentifierStart(ch: string): boolean {
        if ((ch === "_") || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
            return true;
        }
        return false;
    }

    
    static getPunctuatorName(value: string): string {
        return "T_PUNCTUATOR_" + value.charCodeAt(0);
    }
}

interface ILexerConfig {
    engine?: LexerEngine;
    knownTypes?: Set<string>;
    skipComments?: boolean;
    allowLineTerminators?: boolean;
}

export class Lexer {
    index: number;
    lineNumber: number;
    columnNumber: number;
    uri: IFile;
    source: string;

    engine: LexerEngine;
    diagnostics: LexerDiagnostics;
    knownTypes: Set<string>;
    skipComments: boolean;
    allowLineTerminators: boolean;

    constructor({ engine = new LexerEngine, knownTypes = new Set(), skipComments = true, allowLineTerminators = false }: ILexerConfig) {
        this.lineNumber = 0;
        this.columnNumber = 0;
        this.index = 0;

        this.diagnostics = new LexerDiagnostics;
        this.knownTypes = knownTypes;
        this.engine = engine;
        this.skipComments = skipComments;
        this.allowLineTerminators = allowLineTerminators;
    }

    setup(textDocument: ITextDocument) {
        this.uri = StringRef.make(textDocument.uri);
        this.source = textDocument.source;
    }


    getDiagnosticReport(): IDiagnosticReport {
        return this.diagnostics.resolve();
    }


    getNextToken(allowLineTerminators: boolean = this.allowLineTerminators): IToken {
        let ch = this.currentChar();
        if (!ch) {
            let pos = this.pos();
            return <IToken>{
                index: this.index,
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
            case ETokenType.k_SinglelineCommentLiteral:
            case ETokenType.k_MultilineCommentLiteral:
                token = this.scanComment();
                if (this.skipComments) {
                    token = this.getNextToken();
                }
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
                    while (this.identityTokenType() === ETokenType.k_Unknown && this.index < this.source.length) {
                        value += this.currentChar();
                        this.readNextChar();
                    }
                    token = {
                        index: this.index,
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


    getNextLine(): IToken {
        let start = this.pos();
        let value = '';
        let c = this.currentChar();
        while (c && c !== '\n') {
            value += c;
            c = this.readNextChar();
        }

        return {
            index: this.index,
            name: UNKNOWN_TOKEN,
            value,
            loc: { start, end: this.pos() }
        };
    }


    /** @deprecated */
    getLocation() {
        return { line: this.lineNumber, file: this.uri };
    }


    /** @deprecated */
    setSource(sSource: string): void {
        this.source = sSource;
    }


    /** @deprecated */
    setIndex(iIndex: number): void {
        this.index = iIndex;
    }


    private pos(n: number = 0): IPosition {
        return {
            file: this.uri,
            line: this.lineNumber,
            column: this.columnNumber + n,
            offset: this.index + n
        };
    }


    private emitError(code: number, token: IToken): void {
        this.diagnostics.error(code, { file: `${this.uri}`, token });
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
            // TODO: return exact type (separate multiline/singleline comment parsings)
            return ETokenType.k_SinglelineCommentLiteral;
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
        return this.engine.isNumberStart(this.currentChar(), this.nextChar());
    }


    private isCommentStart(): boolean {
        return this.engine.isCommentStart(this.currentChar(), this.nextChar())
    }


    private isStringStart(): boolean {
        return this.engine.isStringStart(this.currentChar());
    }


    private isPunctuatorStart(): boolean {
        return this.engine.isPunctuatorStart(this.currentChar());
    }


    private isWhiteSpaceStart(): boolean {
        return this.engine.isWhiteSpaceStart(this.currentChar());
    }


    private isNewlineStart(): boolean {
        return this.engine.isNewlineStart(this.currentChar());
    }


    private isIdentifierStart(): boolean {
        return this.engine.isIdentifierStart(this.currentChar());
    }




    private nextChar(): string {
        return this.source[this.index + 1];
    }


    private currentChar(): string {
        return this.source[<number>this.index];
    }


    private readNextChar(): string {
        this.index++;
        this.columnNumber++;
        return this.source[<number>this.index];
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
                index: this.index,
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
                index: this.index,
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


    private scanPunctuator(): IToken {
        let value = this.currentChar();
        let start = this.pos();
        let ch: string;
        while (true) {
            ch = this.readNextChar();
            if (ch) {
                value += ch;
                if (!this.engine.isPunctuator(value)) {
                    value = value.slice(0, value.length - 1);
                    break;
                }
            }
            else {
                break;
            }
        }
        return <IToken>{
            index: this.index,
            name: this.engine.punctuators[value],
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
        let isE = false; // exponential
        let isU = false; // unsigned
        let start = this.pos();

        if (ch === ".") {
            value += 0;
            isFloat = true;
        }

        value += ch;

        while (true) {
            ch = this.readNextChar();
            if (ch === ".") {
                if (isFloat || isU) {
                    break;
                }
                else {
                    isFloat = true;
                }
            }
            else if (ch === "e") {
                if (isE || isU) {
                    break;
                }
                else {
                    isE = true;
                }
            }
            else if (ch === "u") {
                if (isE || isU) {
                    break;
                }
                else {
                    isU = true;
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
            else if (!((ch >= "0") && (ch <= "9")) || !ch || isU) {
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
                index: this.index,
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
                index: this.index,
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
            if (this.engine.isKeyword(value)) {
                return <IToken>{
                    index: this.index,
                    name: this.engine.keywords[value],
                    value,
                    loc: {
                        start,
                        end: this.pos()
                    }
                };
            }
            else {
                let name = this.knownTypes.has(value) ? T_TYPE_ID : T_NON_TYPE_ID;
                return <IToken>{
                    index: this.index,
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
                index: this.index,
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
            if (this.engine.isLineTerminator(ch)) {
                value += ch;
                if (ch === "\r" && this.nextChar() === "\n") {
                    this.lineNumber--;
                }
                this.lineNumber++;
                ch = this.readNextChar();
                this.columnNumber = 0;
                continue;
            }
            break;
        }

        let name = T_LINE_TERMINATOR;
        return <IToken>{
            index: this.index,
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
                this.columnNumber += 0;
            }
            else if (ch !== " ") {
                break;
            }
            ch = this.readNextChar();
        }

        return true;
    }


    private scanComment(): IToken {
        let value = this.currentChar();
        let ch = this.readNextChar();
        let start = this.pos();
        value += ch;

        if (ch === "/") {
            //Line Comment
            while (true) {
                ch = this.readNextChar();
                if (!ch) {
                    break;
                }
                if (this.engine.isLineTerminator(ch)) {
                    if (ch === "\r" && this.nextChar() === "\n") {
                        this.lineNumber--;
                    }
                    this.lineNumber++;
                    this.readNextChar();
                    this.columnNumber = 0;
                    break;
                }
                value += ch;
            }

            return {
                index: this.index,
                type: ETokenType.k_SinglelineCommentLiteral,
                value,
                loc: {
                    start,
                    end: this.pos()
                }
            };
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
                if (this.engine.isLineTerminator(ch)) {
                    if (ch === "\r" && this.nextChar() === "\n") {
                        this.lineNumber--;
                    }
                    this.lineNumber++;
                    this.columnNumber = -1;
                }
                chPrevious = ch;
            }

            if (isGoodFinish) {
                return {
                    index: this.index,
                    type: ETokenType.k_MultilineCommentLiteral,
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
                    index: this.index,
                    type: ETokenType.k_MultilineCommentLiteral,
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
}
