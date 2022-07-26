import { extendFXSLDocument } from '@lib/fx/FXSLDocument';
import { createSLDocument, extendSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import * as FxEmitter from '@lib/fx/translators/FxEmitter';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { Diagnostics } from '@lib/util/Diagnostics';
import { nodes, sourceCode } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphCompile, IGraphLoaded } from '@sandbox/actions/ActionTypes';
import { IGraphASTFinalNode, LGraphNodeFactory } from '@sandbox/components/graph/GraphNode';
import { history } from '@sandbox/reducers/router';
import IStoreState from '@sandbox/store/IStoreState';
import { LiteGraph } from 'litegraph.js';
import { matchPath } from 'react-router-dom';
import { createLogic } from 'redux-logic';

import { EffectTemplateHLSL } from '../components/graph/lib';
import { GRAPH_KEYWORD, LOCATION_PATTERN, PATH_PARAMS_TYPE } from './common';

// import all factories

import { PART_TYPE } from '@sandbox/components/graph/common';

import BasicType from '@sandbox/components/graph/BasicType';
import Float from '@sandbox/components/graph/Float';
import FuncNodes from '@sandbox/components/graph/FuncNodes';
import PartId from '@sandbox/components/graph/fx/PartId';
import Int from '@sandbox/components/graph/Int';
import Operators from '@sandbox/components/graph/Operators';
import Uniforms from '@sandbox/components/graph/Uniforms';

import Decomposer from '@sandbox/components/graph/Decomposer';
import PartInit from '@sandbox/components/graph/fx/PartInit';
import PartPrevious from '@sandbox/components/graph/fx/PartPrevious';
import PartSpawn from '@sandbox/components/graph/fx/PartSpawn';
import PartUpdate from '@sandbox/components/graph/fx/PartUpdate';

import { isDefAndNotNull } from '@lib/util/s3d/type';
import docs from '@sandbox/components/graph/utils/docs';
import { assert } from 'console';

async function loadEnv(): Promise<ISLDocument> {
    // todo: don't reload library every time
    const includeResolver = async (name) => (await fetch(name)).text();
    const libraryPath = "./assets/graph/lib.hlsl";
    const libText = await createTextDocument("", `#include "${libraryPath}"`);
    const lib = await createSLDocument(libText, { includeResolver });

    // extract and fill graph node documentation database
    docs(libText);

    const partTex = await createTextDocument('://part-structure',
        `
    struct ${PART_TYPE} {
        float3 speed;
        float3 pos;
        float size;
        float timelife;
    };`
    );

    return extendSLDocument(partTex, lib, null, { includeResolver })
}

const graphLoadedLogic = createLogic<IStoreState, IGraphLoaded['payload']>({
    type: [evt.GRAPH_LOADED],
    latest: true,
    debounce: 500,

    async transform({ getState, action }, next) {
        action.payload.env = await loadEnv();
        next({ ...action });
    },

    async process({ getState, action, action$ }, dispatch, done) {
        // const uri = getState().sourceFile.uri;
        const graph = getState().nodes.graph;
        const content = action.payload.content;
        const env = action.payload.env;

        assert(isDefAndNotNull(env));

        graph.clear();
        // todo: unregister previous nodes

        // reload graph infrastructure
        // produce nodes
        let nodeList = <LGraphNodeFactory>{};
        {
            const producers = [
                FuncNodes,
                Uniforms,
                Int,
                Float,
                BasicType,
                Operators,
                PartId,
                Decomposer,
                PartPrevious,
                PartSpawn,
                PartInit,
                PartUpdate
            ];

            producers.forEach(prod => { nodeList = { ...nodeList, ...prod(env) } });
        }

        // register all available nodes
        Object.keys(nodeList).forEach(link =>
            LiteGraph.registerNodeType(link, nodeList[link]));

        // load serialized graph
        // todo: validate that all serialized nodes are available
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
        const state = getState();
        const nodes = state.nodes;
        const graph = nodes.graph;
        const uri = state.sourceFile.uri;

        const spawn = graph.findNodeByTitle("SpawnRoutine") as IGraphASTFinalNode;
        const init = graph.findNodeByTitle("InitRoutine") as IGraphASTFinalNode;
        const update = graph.findNodeByTitle("UpdateRoutine") as IGraphASTFinalNode;

        let doc = await extendSLDocument(null, nodes.env);
        doc = await spawn.run(doc);
        doc = await init.run(doc);
        doc = await update.run(doc);

        doc = await extendFXSLDocument(await createTextDocument("://fx-template", EffectTemplateHLSL), doc);

        let content = Diagnostics.stringify(doc.diagnosticReport);
        console.log(content);

        dispatch(sourceCode.setContent(FxEmitter.translateDocument(doc)));
        // (props as any).$dispatch({ type: 'source-code-analysis-complete', payload: { result: doc } }); // to run preprocessed document
        // (props as any).$dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content: FxEmitter.translateDocument(doc) } }); // to update effect content

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
