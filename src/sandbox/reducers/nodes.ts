import { ISLDocument } from '@lib/idl/ISLDocument';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphActions, IGraphAddConstant, IGraphChangeLayout, IGraphCompile, IGraphLoaded, IGraphNodeDocsProvided, IGraphRemoveConstant, IGraphSetCapacity, IGraphSetConstant, ISourceFileActions, ISourceFileDropState } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { INodePipeline } from '@sandbox/store/IStoreState';
import { LGraph } from 'litegraph.js';

const initialState: INodePipeline = {
    docs: null,
    graph: new LGraph,
    revision: 0,
    env: null,
    constants: [],
    capacity: 4096
};


export default handleActions<INodePipeline, IGraphActions | ISourceFileActions>({
    // hack to reset graph along with source file
    [evt.SOURCE_FILE_DROP_STATE]: (state, action: ISourceFileDropState) =>
    ({
        ...state,
        revision: 0
    }),

    [evt.GRAPH_MODIFIED]: (state, action: IGraphCompile) =>
        ({ ...state, revision: state.revision + 1 }),
    
    [evt.GRAPH_LOADED]: (state, { payload }: IGraphLoaded) =>
        ({ ...state, env: payload.env, constants: payload.constants, capacity: payload.capacity }),

    [evt.GRAPH_NODE_DOCS_PROVIDED]: (state, { payload }: IGraphNodeDocsProvided) =>
        ({ ...state, docs: payload.docs }),
    
    [evt.GRAPH_CHANGE_LAYOUT]: (state, { payload }: IGraphChangeLayout) =>
    ({ ...state, env: payload.env }),

    [evt.GRAPH_ADD_CONSTANT]: (state, { payload }: IGraphAddConstant) =>
        ({ ...state, constants: [ ...state.constants, payload.value ], revision: state.revision + 1 }),

    [evt.GRAPH_SET_CONSTANT]: (state, { payload }: IGraphSetConstant) =>
        ({ ...state, constants: 
            state.constants.map(c => c.name === payload.name ? ({ ...c, value: payload.value }) : c) 
        , revision: state.revision + 1 }),

    [evt.GRAPH_REMOVE_CONSTANT]: (state, { payload }: IGraphRemoveConstant) =>
        ({ ...state, constants: state.constants.filter(desc => desc.name != payload.name), revision: state.revision + 1 }),
    
    [evt.GRAPH_SET_CAPACITY]: (state, { payload }: IGraphSetCapacity) =>
        ({ ...state, capacity: payload.value, revision: state.revision + 1 }),

}, initialState);

export const getEnv = (state: IStoreState): ISLDocument => state.nodes.env;
