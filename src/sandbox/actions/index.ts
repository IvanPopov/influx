import * as fs from 'fs';
import { Dispatch } from 'redux';

import { EParseMode, EParserType, IRange } from '../../lib/idl/parser/IParser';
import * as evt from './ActionTypeKeys';
import IStoreState from '../store/IStoreState';
import { bindActionCreators } from 'redux';
import { IMarkerDesc } from './ActionTypes';

export type IDispatch = Dispatch<any>;
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

    addMarker (marker: IMarkerDesc) {
        return { type: evt.SOURCE_CODE_ADD_MARKER, payload: marker };
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
    },

    cleanupMarkers () {
        return { type: evt.SOURCE_CODE_CLEANUP_MARKERS, payload: {} };
    }
};


export type mapDispatchToProps = (dispatch: IDispatch) => { actions: any; };
export function mapActions(actions): mapDispatchToProps {
    return (dispatch) => {
        return { actions: bindActionCreators(actions, dispatch) }
    };
}