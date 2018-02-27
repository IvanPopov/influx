import * as fs from 'fs';
import { Dispatch } from 'redux';

import { EParseMode, EParserType, ITokenLocation } from '../../lib/idl/parser/IParser';
import * as evt from '../actions/ActionTypeKeys';
import IStoreState from '../store/IStoreState';
import { bindActionCreators } from 'redux';
import { IMarkerRange } from './ActionTypes';

export type IDispatch = Dispatch<IStoreState>;
export type IActionCreator = (dispatch: IDispatch, getState?: () => IStoreState) => Promise<any>;


export const parser = {
    openGrammar (filename: string) {
        return { type: evt.GRAMMAR_FILE_SPECIFIED, payload: { filename } };
    },

    setGrammar (content: string) {
        return { type: evt.GRAMMAR_CONTENT_SPECIFIED, payload: { content } };
    },

    setParams(type: EParserType, mode: number) {
        return { type: evt.PARSER_PARAMS_CHANGED, payload: { type, mode } };
    }
};


export const sourceCode = {
    openFile (filename: string): IActionCreator {
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

    setContent (content: string) {
        return { type: evt.SOURCE_CODE_MODIFED, payload: { content } };
    },

    addMarker (name: string, range: IMarkerRange) {
        return { type: evt.SOURCE_CODE_ADD_MARKER, payload: { name, range } };
    },

    // IP: Just an incredible example of a AC power!!
    // someRoutine (...argv): IActionCreator {
    //     return async (dispatch: IDispatch, getState) => {
    //         await dispatch({ type: 'some routine', payload: argv });
    //         return getState();
    //     };
    // },

    removeMarker (name: string) {
        return { type: evt.SOURCE_CODE_REMOVE_MARKER, payload: { name } };
    }
};


export type mapDispatchToProps = (dispatch: IDispatch) => { actions: any; };
export function mapActions(actions): mapDispatchToProps {
    return (dispatch) => {
        return { actions: bindActionCreators(actions, dispatch) }
    };
}