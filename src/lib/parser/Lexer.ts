import { assert } from '@lib/common';
import { EDiagnosticCategory, IDiagnosticReport } from '@lib/idl/IDiagnostics';
import { IMap } from '@lib/idl/IMap';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { ETokenType, IFile, ILexerEngine, IPosition, IRange, IToken, ILexerConfig, ILexer } from '@lib/idl/parser/IParser';
import * as util from '@lib/parser/util';
import { Diagnostics } from '@lib/util/Diagnostics';
import { StringRef } from '@lib/util/StringRef';

import { END_SYMBOL, EOF, ERROR, T_FLOAT, T_LINE_TERMINATOR, T_NON_TYPE_ID, T_STRING, T_TYPE_ID, T_UINT, UNKNOWN_TOKEN, T_MACRO, T_MACRO_CONCAT } from './symbols';

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

    protected resolveFilename(category: EDiagnosticCategory, code: number, desc: ILexerDiagDesc): string {
        return desc.file;
    }

    protected resolveRange(category: EDiagnosticCategory, code: number, desc: ILexerDiagDesc): IRange {
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
        if (ch === "\n" || ch === "\r") {
            return true;
        }
        return false;
    }


    isEscapeSequenceStart(ch: string): boolean {
        return ch === '\\';
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




export class Lexer implements ILexer {
    protected index: number;
    protected lineNumber: number;
    protected columnNumber: number;

    //
    // text document
    //

    /* readonly */ document: ITextDocument;

    //
    // Setup
    //

    readonly engine: LexerEngine;
    readonly diagnostics: LexerDiagnostics;
    readonly knownTypes: Set<string>;

    //
    // Config
    //

    readonly config: {
        skipComments: boolean;
        allowLineTerminators: boolean;
    };

    constructor({ 
        engine = new LexerEngine,
        knownTypes = new Set(),
        skipComments = true,
        allowLineTerminators = false,
    }: ILexerConfig = {}) {
        this.diagnostics = new LexerDiagnostics;
        this.knownTypes = knownTypes;
        this.engine = engine;
        this.config = { skipComments, allowLineTerminators };
    }


    getPosition(): IPosition {
        return this.pos();
    }


    setPosition(pos: IPosition): void {
        assert(String(this.document.uri) === String(pos.file));
        this.index = pos.offset;
        this.lineNumber = pos.line;
        this.columnNumber = pos.column;
    }

    
    setTextDocument(textDocument: ITextDocument): ILexer {
        this.columnNumber = 0;
        this.lineNumber = 0;
        this.index = 0;
        this.document = textDocument;
        return this;
    }


    getDiagnosticReport(): IDiagnosticReport {
        return this.diagnostics.resolve();
    }

    
    getNextToken(): IToken {
        const token = this.scanToken();
        util.offset(token.loc, this.document.offset);
        return token;
    }


    getNextLine(): IToken {
        const token = this.scanThisLine();
        util.offset(token.loc, this.document.offset);
        return token;
    }


    protected scanToken(): IToken {
        const ch = this.currentChar();
        if (!ch) {
            const pos = this.pos();
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

        switch (this.identityTokenType()) {
            case ETokenType.k_NumericLiteral:
                return this.scanNumber();
            case ETokenType.k_SinglelineCommentLiteral:
            case ETokenType.k_MultilineCommentLiteral:
                if (this.config.skipComments) {
                    this.scanComment();
                    return this.scanToken();
                }
                return this.scanComment();
            case ETokenType.k_StringLiteral:
                return this.scanString();
            case ETokenType.k_PunctuatorLiteral:
                return this.scanPunctuator();
            case ETokenType.k_IdentifierLiteral:
                return this.scanIdentifier();
            case ETokenType.k_EscapeSequence:
                return this.scanEscapeSequence();
            case ETokenType.k_NewlineLiteral:
                if (!this.config.allowLineTerminators) {
                    this.scanLineTerminators();
                    return this.scanToken();
                }
                return this.scanLineTerminators();
            case ETokenType.k_WhitespaceLiteral:
                this.scanWhiteSpace();
                return this.scanToken();
            case ETokenType.K_MacroLiteral:
                return this.scanMacro();
            default:
                return this.scanInvalid();
        }
    }


    protected scanThisLine(): IToken {
        let start = this.pos();
        let value = '';
        let ch = this.currentChar();
        let chPrev = '';
        while (ch) {
            if (ch === '\\') {
                let chNext = this.readNextChar();
                if (chNext === '\r') {
                    chNext = this.readNextChar();
                }
                switch (chNext) {
                    case '\n':
                        ch = this.readNextChar();
                        this.lineNumber++;
                        this.columnNumber = 0;
                        continue;
                    case 'n':
                        ch = '\n';
                        break;
                    case 't':
                        ch = '\t';
                        break;
                    default:
                        assert(false, 'unsupported character sequence found');
                }
            } else if (ch === '\n') {
                break;
            }

            value += ch;
            chPrev = ch;
            ch = this.readNextChar();
        }

        return {
            index: this.index,
            name: UNKNOWN_TOKEN,
            value,
            loc: { start, end: this.pos() }
        };
    }


    protected pos(n: number = 0): IPosition {
        return {
            file: this.document.uri,
            line: this.lineNumber,
            column: this.columnNumber + n,
            offset: this.index + n
        };
    }


    protected emitError(code: number, token: IToken): void {
        this.diagnostics.error(code, { file: `${this.document.uri}`, token });
    }


    protected identityTokenType(): ETokenType {
        if (this.isIdentifierStart()) {
            return ETokenType.k_IdentifierLiteral;
        }
        if (this.isWhiteSpaceStart()) {
            return ETokenType.k_WhitespaceLiteral;
        }
        if (this.isNewlineStart()) {
            return ETokenType.k_NewlineLiteral;
        }
        if (this.isEscapeSequenceStart()) {
            return ETokenType.k_EscapeSequence;
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
        if (this.isMacroStart()) {
            return ETokenType.K_MacroLiteral;
        }
        return ETokenType.k_Unknown;
    }


    protected isNumberStart(): boolean {
        return this.engine.isNumberStart(this.currentChar(), this.nextChar());
    }


    protected isCommentStart(): boolean {
        return this.engine.isCommentStart(this.currentChar(), this.nextChar())
    }


    protected isStringStart(): boolean {
        return this.engine.isStringStart(this.currentChar());
    }


    protected isPunctuatorStart(): boolean {
        return this.engine.isPunctuatorStart(this.currentChar());
    }


    protected isWhiteSpaceStart(): boolean {
        return this.engine.isWhiteSpaceStart(this.currentChar());
    }


    protected isNewlineStart(): boolean {
        return this.engine.isNewlineStart(this.currentChar());
    }


    protected isEscapeSequenceStart(): boolean {
        return this.engine.isEscapeSequenceStart(this.currentChar());
    }

    protected isMacroStart(): boolean {
        return this.currentChar() === '#';
    }

    protected isIdentifierStart(): boolean {
        return this.engine.isIdentifierStart(this.currentChar());
    }


    protected nextChar(): string {
        return this.document.source[this.index + 1];
    }


    protected currentChar(): string {
        return this.document.source[<number>this.index];
    }


    protected readNextChar(): string {
        this.index++;
        this.columnNumber++;
        return this.document.source[<number>this.index];
    }


    protected scanEscapeSequence(): IToken {
        let ch = this.readNextChar();
        if (ch === '\r') {
            ch = this.readNextChar();
        }
        assert(ch === '\n', 'unsupported escape sequence found');
        this.lineNumber++;
        this.columnNumber = 0;
        this.readNextChar();
        return this.scanToken();
    }

    protected scanString(): IToken {
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


    protected scanInvalid(): IToken {
        const start = this.pos();
        
        let value = '';
        while (this.identityTokenType() === ETokenType.k_Unknown && this.index < this.document.source.length) {
            value += this.currentChar();
            this.readNextChar();
        }

        const token = {
            index: this.index,
            name: UNKNOWN_TOKEN,
            value,
            loc: { start, end: this.pos() }
        };

        this.emitError(ELexerErrors.UnknownToken, token);
        return token;
    }


    protected scanPunctuator(): IToken {
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


    protected scanNumber(): IToken {
        let ch = this.currentChar();
        let value = "";
        let isFloat = false;
        let isHex = false;
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
                if (isFloat || isU || isHex) {
                    break;
                }
                isFloat = true;
            }
            else if (ch === "e") {
                if (isE || isU) { // "0x100e2" is valid
                    break;
                }
                isE = true;
            }
            else if (ch === "u") {
                if (isFloat || isU) { // "0x02u" or "0x100e2u" are valid
                    break;
                }
                isU = true;
            }
            else if (ch === "x") {
                if (isU || isE || isFloat) {
                    break;
                }
                isHex = true;
            }
            else if (((ch === "+" || ch === "-") && chPrevious === "e")) {
                // nothing todo, valid case
            }
            else if (ch === "f" && isFloat) {
                ch = this.readNextChar();
                // redundant check?
                if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
                    break;
                }
                isGoodFinish = true;
                break;
            }
            // break on any unused alphabetic character
            else if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
                if (!isHex) {
                    break;
                }
            }
            // Handle the case when a character is read not a number (end of numeric seq.)
            else if (!((ch >= "0") && (ch <= "9")) || !ch || isU) {
                // check that the exponent completely read
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


    protected scanMacro(): IToken {
        // TODO: add option config.allowMacro 

        const start = this.pos();
        const chNext = this.nextChar();

        if ((chNext >= "a" && chNext <= "z") || (chNext >= "A" && chNext <= "Z")) {
            this.readNextChar();
            const id = this.scanIdentifier();
            return {
                index: this.index,
                name: T_MACRO,
                value: `#${id.value}`,
                loc: {
                    start,
                    end: this.pos()
                }
            };
        } else if (chNext === '#') {
            this.readNextChar();
            this.readNextChar();
            
            return {
                index: this.index,
                name: T_MACRO_CONCAT,
                value: '##',
                loc: {
                    start,
                    end: this.pos()
                }
            };
        } 
        
        assert(false, `unsupported macro found: ${this.document.source.substr(this.index, 20)}...`);
        this.readNextChar();
        return {
            index: this.index,
            name: UNKNOWN_TOKEN,
            value: '#',
            loc: {
                start,
                end: this.pos()
            }
        };
    }


    protected scanIdentifier(): IToken {
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


    protected scanLineTerminators(): IToken {
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


    protected scanWhiteSpace(): boolean {
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


    protected scanComment(): IToken {
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


    /** @deprecated */
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
