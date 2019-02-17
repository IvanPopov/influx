import * as fs from 'fs';
import { handleActions } from "./handleActions";
import { EParseMode, EParserType } from '@lib/idl/parser/IParser';
import { GRAMMAR_FILE_SPECIFIED, PARSER_PARAMS_CHANGED, GRAMMAR_CONTENT_SPECIFIED } from '@sandbox/actions/ActionTypeKeys';
import { IGrammarFileSpecified, IParserParamsActions, IGrammarContentSpecified, IParserParamsChanged } from '@sandbox/actions/ActionTypes';
import { IParserParams, IStoreState } from '@sandbox/store/IStoreState';


const initialState: IParserParams = {
    filename: null,
    grammar: null,
    type: EParserType.k_LALR,
    mode: EParseMode.k_Add | EParseMode.k_Negate | EParseMode.k_Optimize
};


export default handleActions<IParserParams, IParserParamsActions>({
    [ GRAMMAR_CONTENT_SPECIFIED ]: (state, action: IGrammarContentSpecified) => 
        ({ ...state, grammar: action.payload.content }),

    [ GRAMMAR_FILE_SPECIFIED ]: (state, action: IGrammarFileSpecified) => {
        const { payload } = action;
        return { ...state, grammar: fs.readFileSync(payload.filename, 'utf-8'), filename: payload.filename };
    },

    [ PARSER_PARAMS_CHANGED ]: (state, action: IParserParamsChanged) => {
        const { mode, type } = action.payload;
        return { ...state, mode, type };
    }
}, initialState);


//- Selectors

export const getParser = (state: IStoreState): IParserParams => state.parserParams;