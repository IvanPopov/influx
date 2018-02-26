import * as fs from 'fs';
import { Dispatch } from 'redux';

import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import * as evt from '../actions/ActionTypeKeys';
import IStoreState from '../store/IStoreState';
import { bindActionCreators } from 'redux';

export type IDispatch = Dispatch<IStoreState>;


export const parser = {
    openGrammar (filename: string): (dispatch: IDispatch) => Promise<void> {
        return async (dispatch: IDispatch) => {
            dispatch({ type: evt.GRAMMAR_FILE_SPECIFIED, payload: { filename } });
        };
    },

    setGrammar (content: string): (dispatch: IDispatch) => Promise<void> {
        return async (dispatch: IDispatch) => {
            dispatch({ type: evt.GRAMMAR_CONTENT_SPECIFIED, payload: { content } });
        };
    },

    setParams(type: EParserType, mode: number): (dispatch: IDispatch) => Promise<void> {
        return async (dispatch: IDispatch) => {
            dispatch({ type: evt.PARSER_PARAMS_CHANGED, payload: { type, mode } });
        };
    }
};


export const sourceCode = {
    openFile (filename: string): (dispatch: IDispatch) => Promise<void> {
        return async (dispatch: IDispatch) => {
    
            dispatch({ type: evt.SOURCE_FILE_REQUEST, payload: { filename } });
    
            fs.readFile(filename, 'utf8', (error: Error, content: string) => {
                if (error) {
                    dispatch({ type: evt.SOURCE_FILE_LOADING_FAILED, payload: { error } });
                } else {
                    dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content } });
                }
            });
        };
    },

    setContent (content: string): (dispatch: IDispatch) => Promise<void> {
        return async (dispatch: IDispatch) => {
            dispatch({ type: evt.SOURCE_CODE_MODIFED, payload: { content } });
        };
    }
};


export type mapDispatchToProps = (dispatch: IDispatch) => { actions: any; };
export function mapActions(actions): mapDispatchToProps {
    return (dispatch) => {
        return { actions: bindActionCreators(actions, dispatch) }
    };
}