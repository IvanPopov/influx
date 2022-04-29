import { deepEqual } from "@lib/common";
import { EParserFlags, EParserType, IParserParams } from "@lib/idl/parser/IParser";
import { IParser } from "@lib/idl/parser/IParser"
import { AbstractParser } from "@lib/parser/AbstractParser";

// import slGrammar from 'raw-loader!./HLSL.gr';
import { HLSL as slGrammar } from './HLSL';

export class SLParser extends AbstractParser {
    protected init({ grammar = slGrammar, type = EParserType.k_LALR, flags = EParserFlags.k_Default }: IParserParams) {
        super.init({ grammar, type, flags });
    }
}

let paramsDefault: IParserParams = null;
let parserDefault: IParser = null;

export function defaultSLGrammar(): string {
    return slGrammar;
}

export function defaultSLParser(): IParser {
    if (!parserDefault) {
        createDefaultSLParser();
    }
    return parserDefault;
}

/**
 * Internal debugging functionality, no need to use without necessary.
 */
export function createDefaultSLParser(params: IParserParams = { grammar: slGrammar }) {
    if (deepEqual(paramsDefault, params)) {
        return;
    }
    paramsDefault = params;
    parserDefault = new SLParser(params);
}
