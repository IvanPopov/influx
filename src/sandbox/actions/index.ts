import { EParserType } from '@lib/idl/parser/IParser';
import IStoreState from '@sandbox/store/IStoreState';
import { bindActionCreators, Dispatch } from 'redux';
import * as evt from './ActionTypeKeys';
import { IMarkerDesc } from './ActionTypes';



export type IDispatch = Dispatch<any>;
export type IActionCreator = (dispatch: IDispatch, getState?: () => IStoreState) => Promise<any>;

export const parser = {
    openGrammar(filename: string) {
        return { type: evt.GRAMMAR_FILE_SPECIFIED, payload: { filename } };
    },

    setGrammar(content: string) {
        return { type: evt.GRAMMAR_CONTENT_SPECIFIED, payload: { content } };
    },

    setParams(type: EParserType, mode: number) {
        return { type: evt.PARSER_PARAMS_CHANGED, payload: { type, mode } };
    }
};


export const sourceCode = {
    openFile(filename: string) {
        return { type: evt.SOURCE_FILE_REQUEST, payload: { filename } };
    },

    setContent(content: string) {
        return { type: evt.SOURCE_CODE_MODIFED, payload: { content } };
    },

    // setContent (content): IActionCreator {
    //     return async (dispatch: IDispatch, getState) => {
    //         await dispatch({ type: evt.SOURCE_CODE_MODIFED, payload: { content } });
    //         return getState();
    //     };
    // },

    // IP: Just an incredible example of a AC power!!
    // someRoutine (...argv): IActionCreator {
    //     return async (dispatch: IDispatch, getState) => {
    //         await dispatch({ type: 'some routine', payload: argv });
    //         return getState();
    //     };
    // },

    //
    // markers api
    //

    addMarker(marker: IMarkerDesc) {
        return { type: evt.SOURCE_CODE_ADD_MARKER, payload: marker };
    },

    removeMarker(name: string) {
        return { type: evt.SOURCE_CODE_REMOVE_MARKER, payload: { name } };
    },

    removeMarkerByType(type: string) {
        return { type: evt.SOURCE_CODE_REMOVE_MARKER_BY_TYPE, payload: { type } };
    },

    //
    //
    //

    addBreakpoint(line: number) {
        return { type: evt.SOURCE_CODE_ADD_BREAKPOINT, payload: { line } }
    },

    removeBreakpoint(line: number) {
        return { type: evt.SOURCE_CODE_REMOVE_BREAKPOINT, payload: { line } }
    }
};


export type mapDispatchToProps<T> = (dispatch: IDispatch) => { actions: any; $dispatch: IDispatch; $rowActions: T };
export function mapActions(actions): mapDispatchToProps<typeof actions> {
    return (dispatch: IDispatch) => {
        return { 
            actions: bindActionCreators(actions, dispatch), 

            // debug functionality
            $dispatch: dispatch, 
            $rowActions: actions 
        }
    };
}   