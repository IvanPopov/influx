import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphActions, IGraphCompile, IGraphLoaded, IGraphNodeDocsProvided, ISourceFileActions, ISourceFileDropState } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import { INodePipeline } from '@sandbox/store/IStoreState';
import { LGraph } from 'litegraph.js';

const initialState: INodePipeline = {
    docs: null,
    graph: new LGraph,
    revision: 0
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

    [evt.GRAPH_NODE_DOCS_PROVIDED]: (state, action: IGraphNodeDocsProvided) =>
        ({ ...state, docs: action.payload.docs })
}, initialState);

