import { assert } from "@lib/common";
import { IDiagnosticReport } from "@lib/idl/IDiagnostics";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { ILexer, ILexerConfig, IToken } from "@lib/idl/parser/IParser";

import { END_SYMBOL } from "./symbols";

export class CachingLexer implements ILexer {
    private tokens: IToken[];
    private pos: number;

    constructor(tokens: IToken[]) {
        this.tokens = tokens || [];
        this.pos = 0;
    }

    /**
     * Dummy api
     */
    get document(): ITextDocument { assert(false); return null; }
    get config(): ILexerConfig { assert(false); return null; }
    
    setTextDocument(textDocument: ITextDocument): ILexer { assert(false); return this; }
    getNextLine(): IToken { assert(false); return null; }
    /** end */

    getPosition(): number {
        return this.pos;
    }

    setPosition(pos: number): void {
        this.pos = pos;
    }

    getDiagnosticReport(): IDiagnosticReport {
        assert(false);
        return null;
    }

    getNextToken(): IToken {
        return this.tokens[this.pos++] || CachingLexer.END_TOKEN;
    }

    private static END_TOKEN = {
        index: -1,
        name: END_SYMBOL,
        value: END_SYMBOL,
        loc: null
    };
}

