import { EParseMode, EParserType } from '@lib/idl/parser/IParser';
import { GRAMMAR_CONTENT_SPECIFIED, GRAMMAR_FILE_SPECIFIED, PARSER_PARAMS_CHANGED } from '@sandbox/actions/ActionTypeKeys';
import { IGrammarContentSpecified, IGrammarFileSpecified, IParserParamsActions, IParserParamsChanged } from '@sandbox/actions/ActionTypes';
import { IParserState, IStoreState } from '@sandbox/store/IStoreState';

import { handleActions } from './handleActions';

declare const MODE: string;

const initialState: IParserState = {
    filename: null,
    grammar: null,
    type: EParserType.k_LALR,
    mode: EParseMode.k_Add | EParseMode.k_Negate | EParseMode.k_Optimize
};

if (MODE === 'development') {
    initialState.mode |= EParseMode.k_DebugMode;
}


export default handleActions<IParserState, IParserParamsActions>({
    [ GRAMMAR_CONTENT_SPECIFIED ]: (state, action: IGrammarContentSpecified) => 
        ({ ...state, grammar: action.payload.content }),

    [ GRAMMAR_FILE_SPECIFIED ]: (state, action: IGrammarFileSpecified) => {
        const { payload: { filename } } = action;
        return { ...state, filename };
    },

    [ PARSER_PARAMS_CHANGED ]: (state, action: IParserParamsChanged) => {
        const { mode, type } = action.payload;
        return { ...state, mode, type };
    }
}, initialState);


//- Selectors

export const getParser = (state: IStoreState): IParserState => state.parserParams;