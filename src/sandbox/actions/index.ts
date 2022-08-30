import { MakeOptional } from '@lib/common';
import { EParserType } from '@lib/idl/parser/IParser';
import { store } from '@sandbox/store';
import IStoreState, { IDebuggerState, INodeConstant } from '@sandbox/store/IStoreState';
import { bindActionCreators, Dispatch } from 'redux';

import * as evt from './ActionTypeKeys';
import { IMarkerDesc } from './ActionTypes';

export type IDispatch = Dispatch<any>;
export type IActionCreator = (dispatch: IDispatch, getState?: () => IStoreState) => Promise<any>;

export const parser = {
    setGrammar(content: string) {
        return { type: evt.GRAMMAR_CONTENT_SPECIFIED, payload: { content } };
    },

    setParams(type: EParserType, flags: number) {
        return { type: evt.PARSER_PARAMS_CHANGED, payload: { type, flags } };
    },

    setParsingParams(flags: number) {
        return { type: evt.PARSING_PARAMS_CHANGED, payload: { flags } };
    }
};

export const sourceCode = {
    openFile(filename: string) {
        return { type: evt.SOURCE_FILE_REQUEST, payload: { filename } };
    },

    setContent(content: string, filename?: string) {
        return { type: evt.SOURCE_CODE_MODIFED, payload: { content, filename } };
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

    //
    //
    //

    addBreakpoint(line: number) {
        return { type: evt.SOURCE_CODE_ADD_BREAKPOINT, payload: { line } }
    },

    removeBreakpoint(line: number) {
        return { type: evt.SOURCE_CODE_REMOVE_BREAKPOINT, payload: { line } }
    },

    //
    //
    //

    compile(expression: string) {
        return { type: evt.DEBUGGER_COMPILE, payload: { expression } };
    },

    specifyOptions(options: MakeOptional<IDebuggerState['options']>) {
        return { type: evt.DEBUGGER_OPTIONS_CHANGED, payload: { options } };
    },

    //
    //
    //

    resetDebugger() {
        return { type: evt.DEBUGGER_RESET };
    }
};

export const playground = {
    selectEffect(name: string) {
        return { type: evt.PLAYGROUND_SELECT_EFFECT, payload: { name } };
    },

    switchRuntime() {
        return { type: evt.PLAYGROUND_SWITCH_EMITTER_RUNTIME };
    },

    saveFileAs() {
        return { type: evt.PLAYGROUND_EFFECT_SAVE_REQUEST, payload: {} };
    },

    setAutosave(enabled: boolean) {
        return { type: evt.PLAYGROUND_SET_OPTION_AUTOSAVE, payload: { enabled } };
    }
};

export const nodes = {
    // is not being used at the moment
    reset() {
        return { type: evt.GRAPH_RESET, payload: {} };
    },

    // request full recompilationIGraph
    recompile() {
        return { type: evt.GRAPH_COMPILE, payload: {} };
    },

    changed() {
        return { type: evt.GRAPH_MODIFIED, payload: {} };
    },

    load(content: string) {
        return { type: evt.GRAPH_LOADED, payload: { content } };
    },

    provideNodeDocs(docs: string) {
        return { type: evt.GRAPH_NODE_DOCS_PROVIDED, payload: { docs } };
    },

    changeLayout(layout: string) {
        return { type: evt.GRAPH_CHANGE_LAYOUT, payload: { layout } };
    },

    addConstant(value: INodeConstant) {
        return { type: evt.GRAPH_ADD_CONSTANT, payload: { value } }
    },

    removeConstant(name: string) {
        return { type: evt.GRAPH_REMOVE_CONSTANT, payload: { name } }
    }
}

export const s3d = {
    initEnv(projectRoot) {
        return { type: evt.S3D_INIT_ENV, payload: { projectRoot } };
    }
}

export const depot = {
    rescan() {
        return { type: evt.DEPOT_UPDATE_REQUEST, payload: {} };
    }
}

// hack to avoid looped imports
export function nodesProvideDocs(docs: string) {
    store.dispatch(nodes.provideNodeDocs(docs));
}

// hack to avoid looped imports
export function nodesForceRecompile() {
    store.dispatch(nodes.recompile());
}

export type mapDispatchToProps<T> = (dispatch: IDispatch) => { actions: any; $dispatch: IDispatch; $rowActions: T };
export function mapActions(actions): mapDispatchToProps<typeof actions> {
    return (dispatch: IDispatch) => {
        return {
            actions: bindActionCreators(actions, dispatch),

            // debug functionality
            $dispatch: dispatch,
            $rowActions: actions
        };
    };
}
