import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphActions, IGraphCompile, IGraphLoaded, IGraphNodeDocsProvided } from '@sandbox/actions/ActionTypes';
import { handleActions } from '@sandbox/reducers/handleActions';
import { INodePipeline } from '@sandbox/store/IStoreState';
import { LGraph } from 'litegraph.js';

const initialState: INodePipeline = {
    docs: null,
    graph: new LGraph,
    revision: 0
};


export default handleActions<INodePipeline, IGraphActions>({
    [evt.GRAPH_COMPILE]: (state, action: IGraphCompile) =>
        ({ ...state, $graph: state.revision + 1 }),

    [evt.GRAPH_NODE_DOCS_PROVIDED]: (state, action: IGraphNodeDocsProvided) =>
        ({ ...state, docs: action.payload.docs })
}, initialState);

