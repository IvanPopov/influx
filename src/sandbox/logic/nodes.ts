import { extendFXSLDocument } from '@lib/fx/FXSLDocument';
import { extendSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import * as FxEmitter from '@lib/fx/translators/FxEmitter';
import { Diagnostics } from '@lib/util/Diagnostics';
import { nodes, sourceCode } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphCompile, IGraphLoaded } from '@sandbox/actions/ActionTypes';
import { PART_STRUCTURE_SL_DOCUMENT } from '@sandbox/components/graph/common';
import { IGraphASTFinalNode } from '@sandbox/components/graph/IGraph';
import { history } from '@sandbox/reducers/router';
import IStoreState from '@sandbox/store/IStoreState';
import { matchPath } from 'react-router-dom';
import { createLogic } from 'redux-logic';
import { GRAPH_KEYWORD, LOCATION_PATTERN, PATH_PARAMS_TYPE } from '.';
import { EffectTemplateHLSL } from '../components/graph/lib';

function saveTemp(uri: string, content: string)
{
    localStorage.setItem(`graph-unfinished-[${uri}]`, content);
}

function tryToLoadTempVersion(uri: string, content: string)
{
    const temp = localStorage.getItem(`graph-unfinished-[${uri}]`);
    if (temp /*&& confirm("Load unfisnihed version?")*/)
    {
        return temp;
    }
    return  content;
}

const graphLoadedLogic = createLogic<IStoreState, IGraphLoaded['payload']>({
    type: [evt.GRAPH_LOADED],
    latest: true,
    debounce: 500,

    async process({ getState, action, action$ }, dispatch, done) {
        const graph = getState().nodes.graph;
        const uri = getState().sourceFile.uri;
        const content = tryToLoadTempVersion(uri, action.payload.content);
        
        graph.clear();
        graph.configure(JSON.parse(content));

        dispatch(nodes.recompile());

        const location = getState().router.location.pathname;
        const match = matchPath<PATH_PARAMS_TYPE>(location, {
            path: LOCATION_PATTERN,
            exact: false
        });

        if (match) {
            const { fx, view } = match.params;
            history.push(`/${view}/${fx}/${GRAPH_KEYWORD}`);
        }

        done();
    }
});


const compileLogic = createLogic<IStoreState, IGraphCompile['payload']>({
    type: [evt.GRAPH_COMPILE],
    latest: true,
    debounce: 500,

    async process({ getState, action }, dispatch, done) {
        const graph = getState().nodes.graph;
        const uri = getState().sourceFile.uri;

        console.log('graph compile!');

        const spawn = graph.findNodeByTitle("SpawnRoutine") as IGraphASTFinalNode;
        const init = graph.findNodeByTitle("InitRoutine") as IGraphASTFinalNode;
        const update = graph.findNodeByTitle("UpdateRoutine") as IGraphASTFinalNode;

        let doc = await extendSLDocument(null, PART_STRUCTURE_SL_DOCUMENT);
        doc = await spawn.run(doc);
        doc = await init.run(doc);
        doc = await update.run(doc);

        doc = await extendFXSLDocument(await createTextDocument("://fx-template", EffectTemplateHLSL), doc);

        let content = Diagnostics.stringify(doc.diagnosticReport);
        console.log(content);

        dispatch(sourceCode.setContent(FxEmitter.translateDocument(doc)));
        // (props as any).$dispatch({ type: 'source-code-analysis-complete', payload: { result: doc } }); // to run preprocessed document
        // (props as any).$dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content: FxEmitter.translateDocument(doc) } }); // to update effect content

        saveTemp(uri, JSON.stringify(graph.serialize()));

        done();
    }
});

const resetLogic = createLogic<IStoreState>({
    type: [evt.GRAPH_RESET],

    async process({ getState, action }, dispatch, done) {
        // const parserParams = getState().parserParams;
        console.log('graph reset!');
        done();
    }
});

export default [
    resetLogic,
    compileLogic,
    graphLoadedLogic
];
