import * as fs from 'fs';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { GRAMMAR_FILE_SPECIFIED, PARSER_PARAMS_CHANGED, GRAMMAR_CONTENT_SPECIFIED } from '../actions/ActionTypeKeys';
import { IGrammarFileSpecified, ParserParamsActions } from '../actions/ActionTypes';
import { IParserParams, IStoreState } from '../store/IStoreState';

const initialState: IParserParams = {
    grammar: null,
    type: EParserType.k_LALR,
    mode: EParseMode.k_Add | EParseMode.k_Negate | EParseMode.k_Optimize
};

const parserParams = (state: IParserParams = initialState, action: ParserParamsActions): IParserParams => {
    switch (action.type) {
        case GRAMMAR_CONTENT_SPECIFIED:
            return { ...state, grammar: action.payload.content };
        case GRAMMAR_FILE_SPECIFIED:
            return { ...state, grammar: fs.readFileSync(action.payload.filename, 'utf-8') };
        case PARSER_PARAMS_CHANGED:
            const { mode, type } = action.payload;
            return { ...state, mode, type };
        default:
            return state;
    }
};

export function getGrammar (state: IParserParams): string {
    return state.grammar;
}

export default parserParams;
