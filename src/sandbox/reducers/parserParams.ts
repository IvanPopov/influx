import { EParserFlags, EParserType, EParsingFlags } from '@lib/idl/parser/IParser';
import { GRAMMAR_CONTENT_SPECIFIED, GRAMMAR_FILE_SPECIFIED, PARSER_PARAMS_CHANGED, PARSING_PARAMS_CHANGED } from '@sandbox/actions/ActionTypeKeys';
import { IGrammarContentSpecified, IGrammarFileSpecified, IParserParamsActions, IParserParamsChanged, IParsingParamsChanged } from '@sandbox/actions/ActionTypes';
import { IParserState, IStoreState } from '@sandbox/store/IStoreState';

import { handleActions } from './handleActions';

declare const MODE: string;

const initialState: IParserState = {
    filename: null,
    grammar: null,
    type: EParserType.k_LALR,
    flags: EParserFlags.k_Add | EParserFlags.k_Negate,
    // TODO: rename option (or move it out of this scope)
    parsingFlags: EParsingFlags.k_Optimize
};

if (MODE === 'development') {
    initialState.flags |= EParserFlags.k_Debug;
    initialState.parsingFlags |= EParsingFlags.k_DeveloperMode;
}


export default handleActions<IParserState, IParserParamsActions>({
    [ GRAMMAR_CONTENT_SPECIFIED ]: (state, action: IGrammarContentSpecified) => 
        ({ ...state, grammar: action.payload.content }),

    [ GRAMMAR_FILE_SPECIFIED ]: (state, action: IGrammarFileSpecified) => {
        const { payload: { filename } } = action;
        return { ...state, filename };
    },

    [ PARSER_PARAMS_CHANGED ]: (state, action: IParserParamsChanged) => {
        const { flags, type } = action.payload;
        return { ...state, flags, type };
    },

    [ PARSING_PARAMS_CHANGED ]: (state, action: IParsingParamsChanged) => {
        const { flags } = action.payload;
        return { ...state, parsingFlags: flags };
    }
}, initialState);


//- Selectors

export const getParser = (state: IStoreState): IParserState => state.parserParams;
