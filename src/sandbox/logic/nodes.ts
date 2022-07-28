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
import { LGraph, LGraphNode, LiteGraph } from 'litegraph.js';
import { matchPath } from 'react-router-dom';
import { createLogic } from 'redux-logic';
import { isDefAndNotNull } from '@lib/util/s3d/type';
import { GRAPH_KEYWORD, LOCATION_PATTERN, PATH_PARAMS_TYPE } from './common';

import docs from '@sandbox/components/graph/utils/docs';
import * as CodeEmitter from '@lib/fx/translators/CodeEmitter';

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

import GraphTemplateJSON from '@sandbox/components/graph/lib/template.json';

async function loadEnv(layout: string): Promise<ISLDocument> {
    // todo: don't reload library every time
    const includeResolver = async (name) => (await fetch(name)).text();
    const libraryPath = "./assets/graph/lib.hlsl";
    const libText = await createTextDocument("", `#include "${libraryPath}"`);
    const lib = await createSLDocument(libText, { includeResolver });

    // extract and fill graph node documentation database
    // todo: move to statics
    docs(libText);

    const partTex = await createTextDocument('://part-layout', layout);
    return extendSLDocument(partTex, lib, null, { includeResolver })
}


//
// 
//

interface IJSONPartFx
{
    layout: string;
    graph: ReturnType<LGraph['serialize']>;
}

interface IJSONFx
{
    type: 'part';
    content: IJSONPartFx;
}


export function packGraphToJSON(state: IStoreState): string
{
    const { nodes: { graph, env } } = state;
    const type = env.root.scope.findType(PART_TYPE);
    const layout = CodeEmitter.translate(type);

    const content = <IJSONPartFx>{
        layout,             
        graph: graph.serialize()
    }

    const fx: IJSONFx = { type: 'part', content };
    return JSON.stringify(fx, null, '    ');
}


export function unpackGraphFromJSON(data: string): IJSONPartFx
{
    let json: IJSONFx = null;
    try {
        json = JSON.parse(data);
    } catch(e) {
        console.error('could not parse XFX data');
        // replace invalid data with dummy graph
        const type = 'part';
        const content = GraphTemplateJSON as any;
        json = { type, content };
    }
    console.assert(json.type === 'part');
    return json.content;
}

//
// 
//

const graphLoadedLogic = createLogic<IStoreState, IGraphLoaded['payload'], IJSONPartFx>({
    type: [evt.GRAPH_LOADED],
    latest: true,
    debounce: 500,

    async transform({ getState, action }, next) {
        const unpacked = unpackGraphFromJSON(action.payload.content);
        action.payload.env = await loadEnv(unpacked.layout);
        // pass unpacked json as meta so as not to double the unpacking
        next({ ...action, meta: unpacked });
    },

    async process({ getState, action, action$ }, dispatch, done) {

        // const uri = getState().sourceFile.uri;
        const graph = getState().nodes.graph;
        const { graph: content } = action.meta;
        const env = action.payload.env;

        console.assert(isDefAndNotNull(env));

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

            // extend node list with all available node types
            producers.forEach(prod => { nodeList = { ...nodeList, ...prod(env) } });
        }

        LiteGraph.clearRegisteredTypes();

        // register all available nodes
        Object.keys(nodeList).forEach(link => 
            LiteGraph.registerNodeType(link, nodeList[link]));

        // load serialized graph
        // todo: validate that all serialized nodes are available
        graph.configure(content);

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


function makeFxTemplate(env: ISLDocument)
{
    return (
`/* Example of default shader input. */
// Warning: Do not change layout of this structure!
struct DefaultShaderInput {
    //float3 pos : POSITION;
    float3 pos;
    float4 color : COLOR0;
    float  size : SIZE;
};


void PrerenderRoutine(inout Part part, out DefaultShaderInput input)
{
    input.pos.xyz = part.pos.xyz;
    input.size = 0.1f;
    input.color = float4(1.f, 0.f, 1.f, 1.f);
}


partFx example {
    Capacity = 1000;
    SpawnRoutine = compile SpawnRoutine();
    InitRoutine = compile InitRoutine();
    UpdateRoutine = compile UpdateRoutine();

    pass P0 {
        Sorting = FALSE;
        PrerenderRoutine = compile PrerenderRoutine();
        Geometry = Billboard;
    }
}

`);
}


const compileLogic = createLogic<IStoreState, IGraphCompile['payload']>({
    type: [evt.GRAPH_COMPILE],
    latest: true,
    debounce: 500,

    async process({ getState, action }, dispatch, done) {
        const state = getState();
        const { nodes } = state;
        const { graph, env } = nodes;
        const uri = state.sourceFile.uri;

        let spawn = graph.findNodeByTitle("SpawnRoutine") as IGraphASTFinalNode;
        let init = graph.findNodeByTitle("InitRoutine") as IGraphASTFinalNode;
        let update = graph.findNodeByTitle("UpdateRoutine") as IGraphASTFinalNode;

        let doc = await extendSLDocument(null, env);
        doc = await spawn.run(doc);
        doc = await init.run(doc);
        doc = await update.run(doc);

        doc = await extendFXSLDocument(await createTextDocument("://fx-template", makeFxTemplate(env)), doc);

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
