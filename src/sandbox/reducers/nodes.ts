import { ISLDocument } from '@lib/idl/ISLDocument';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphActions, IGraphChangeLayout, IGraphCompile, IGraphLoaded, IGraphNodeDocsProvided, ISourceFileActions, ISourceFileDropState } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import IStoreState, { INodePipeline } from '@sandbox/store/IStoreState';
import { LGraph } from 'litegraph.js';

const initialState: INodePipeline = {
    docs: null,
    graph: new LGraph,
    revision: 0,
    env: null
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
    
    [evt.GRAPH_LOADED]: (state, action: IGraphLoaded) =>
        ({ ...state, env: action.payload.env }),

    [evt.GRAPH_NODE_DOCS_PROVIDED]: (state, action: IGraphNodeDocsProvided) =>
        ({ ...state, docs: action.payload.docs }),
    
    [evt.GRAPH_CHANGE_LAYOUT]: (state, action: IGraphChangeLayout) =>
    ({ ...state, env: action.payload.env })

}, initialState);

export const getEnv = (state: IStoreState): ISLDocument => state.nodes.env;
