import { extendFXSLDocument } from '@lib/fx/FXSLDocument';
import { createSLDocument, extendSLDocument } from '@lib/fx/SLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import * as FxEmitter from '@lib/fx/translators/FxEmitter';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { Diagnostics } from '@lib/util/Diagnostics';
import { nodes, sourceCode } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphChangeLayout, IGraphCompile, IGraphLoaded } from '@sandbox/actions/ActionTypes';
import { IGraphASTFinalNode, IGraphASTMaterial, LGraphNodeFactory } from '@sandbox/components/graph/GraphNode';
import { history } from '@sandbox/reducers/router';
import IStoreState from '@sandbox/store/IStoreState';
import { LGraph, LiteGraph } from 'litegraph.js';
import { matchPath } from 'react-router-dom';
import { createLogic } from 'redux-logic';
import { isDefAndNotNull } from '@lib/util/s3d/type';
import { GRAPH_KEYWORD, LOCATION_PATTERN, PATH_PARAMS_TYPE } from './common';
import { type as typeHelper } from '@lib/fx/analisys/helpers';
import { ITypeInstruction } from '@lib/idl/IInstruction';

import docs from '@sandbox/components/graph/utils/docs';
import * as CodeEmitter from '@lib/fx/translators/CodeEmitter';

// import all factories

import { PART_LOCAL_NAME, PART_TYPE } from '@sandbox/components/graph/common';

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
import DefaultMaterial from '@sandbox/components/graph/fx/DefaultMaterial';
import LwiMaterial from '@sandbox/components/graph/fx/LwiMaterial';

import GraphTemplateJSON from '@sandbox/components/graph/lib/template.json';
import { getEnv } from '@sandbox/reducers/nodes';


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

interface IJSONPartFx {
    layout: string;
    graph: ReturnType<LGraph['serialize']>;
}

interface IJSONFx {
    type: 'part';
    content: IJSONPartFx;
}


export function packGraphToJSON(state: IStoreState): string {
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


export function unpackGraphFromJSON(data: string): IJSONPartFx {
    let json: IJSONFx = null;
    try {
        json = JSON.parse(data);
    } catch (e) {
        console.error('could not parse XFX data');
        json = (GraphTemplateJSON as any);
    }
    console.assert(json.type === 'part');
    return json.content;
}

function produceNodes(env: () => ISLDocument, ...list: ((env: () => ISLDocument) => LGraphNodeFactory)[])
{
    let nodeList = <LGraphNodeFactory>{};
    list.forEach(prod => { nodeList = { ...nodeList, ...prod(env) } });
    return nodeList;
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
        let nodeList = produceNodes(() => getEnv(getState()), 
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
            PartUpdate,
            DefaultMaterial,
            LwiMaterial
        );

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

interface Plug {
    uid: number;
    sorting: boolean;
    geometry: string;
}

function makeFxTemplate(env: ISLDocument, plugs: Plug[]) {

    let passes = plugs.map((plug, i) => 
`   pass P${i} {
        Sorting = ${plug.sorting};
        PrerenderRoutine = compile PrerenderRoutine${plug.uid}();
        Geometry = "${plug.geometry.toLowerCase()}";
    }`).join("\n\n");

    return (
`
partFx example {
    Capacity = 4096;
    SpawnRoutine = compile SpawnRoutine();
    InitRoutine = compile InitRoutine();
    UpdateRoutine = compile UpdateRoutine();

${passes}
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
        let prerender: IGraphASTMaterial[] = [];
        prerender = [ ...prerender, ...graph.findNodesByTitle("DefaultMaterial") as IGraphASTMaterial[] ];
        prerender = [ ...prerender, ...graph.findNodesByTitle("LwiMaterial") as IGraphASTMaterial[] ];

        let doc = await extendSLDocument(null, env);
        doc = await spawn.run(doc);
        doc = await init.run(doc);
        doc = await update.run(doc);

        let plugs: Plug[] = [];
        for (let i in prerender) {
            let { uid, sorting, geometry } = prerender[i];
            doc = await prerender[i].run(doc);
            plugs.push({ uid, sorting, geometry });
        }
        
        doc = await extendFXSLDocument(await createTextDocument("://fx-template", 
            makeFxTemplate(env, plugs)), doc);

        let content = Diagnostics.stringify(doc.diagnosticReport);
        console.log(content);

        dispatch(sourceCode.setContent(FxEmitter.translateDocument(doc)));
        // (props as any).$dispatch({ type: 'source-code-analysis-complete', payload: { result: doc } }); // to run preprocessed document
        // (props as any).$dispatch({ type: evt.SOURCE_FILE_LOADED, payload: { content: FxEmitter.translateDocument(doc) } }); // to update effect content

        done();
    }
});

const changeLayoutLogic = createLogic<IStoreState, IGraphChangeLayout['payload']>({
    type: [evt.GRAPH_CHANGE_LAYOUT],

    async validate({ getState, action }, allow, reject) {
        let envNew: ISLDocument;
        let typeNew: ITypeInstruction;

        try {
            envNew = await loadEnv(action.payload.layout);
            typeNew = envNew.root.scope.findType(PART_TYPE);

            if (!typeNew) {
                reject({ type: 'graph-change-layout-error' });
                return;
            }
        } catch (e) { 
            reject({ type: 'graph-change-layout-error' });
            return;
        }

        const { env, graph } = getState().nodes;
        const type = env.root.scope.findType(PART_TYPE);

        //
        // Aux
        //

        function nodeRebuilder(type: string): (() => void)[] {
            return graph.findNodesByType(type).map(node => {
                let [ x, y ] = node.pos;
                graph.remove(node);
                return () => {
                    node = LiteGraph.createNode(type);
                    graph.add(node);
                    node.pos = [ x, y ];
                }
            })
        };

        function remove(type: string) {
            let cbs = nodeRebuilder(type);
            return () => cbs.forEach(cb => cb());
        }

        const restore = (cb: () => void) => cb();

        //

        // todo: skip if no changes
        // if (type.fields.length == typeNew.fields.length) {
        //     // no changes, nothing todo.
        //     console.warn('no layout changes found');
        //     allow({ ...action, payload: { env } });
        //     return;
        // }

        // same name but diff type
        const toRecreateField = type.fields
            .filter(p => typeNew.fields.find(n => n.name == p.name &&
                !typeHelper.compare(n.type, p.type)))
            .map(v => v.name);

        // name no more exists
        const toRemoveField = type.fields
            .filter(p => !typeNew.fields.find(n => n.name == p.name))
            .map(v => v.name);

        // same name and type but diff input index
        const toReconnectField = type.fields
            .filter((p, pi) => typeNew.fields.find((n, ni) => pi != ni &&
                n.name == p.name && typeHelper.compare(n.type, p.type)))
            .map(v => v.name);
            
        // toCreate?

        console.log('remove:', toRemoveField);
        console.log('recreate:', toRecreateField);
        console.log('reconnect:', toReconnectField);

        //
        // Remove all no more existring nodes
        //

        toRemoveField.forEach(fieldName => {
            // sync with PartPrev.ts
            const name = `${PART_LOCAL_NAME}.${fieldName}`;
            let nodes = graph.findNodesByType(`fx/${name}`);
            nodes.forEach(node => graph.remove(node));
        });

        //
        // Remove nodes with changed types and remember list of recreation routines
        //
        
        // sync with PartPrev.ts, PartInit.ts etc.
        let initRemoved = remove(`fx/InitRoutine`);
        let updateRemoved = remove(`fx/UpdateRoutine`);
        let partRemoved = remove(`fx/${PART_LOCAL_NAME}`);
        let fieldsRemoved = toRecreateField.map(f => remove(`fx/${PART_LOCAL_NAME}.${f}`));

        //
        // Unlink prev types
        //

        let nodeList = produceNodes(
            () => env, 
            PartPrevious,
            // PartSpawn,
            PartInit,
            PartUpdate);

        Object.keys(nodeList).forEach(type => LiteGraph.unregisterNodeType(type));

        //
        // Link new types
        //

        nodeList = produceNodes(
            () => envNew, 
            PartPrevious,
            // PartSpawn,
            PartInit,
            PartUpdate);

        Object.keys(nodeList).forEach(type => LiteGraph.registerNodeType(type, nodeList[type]));

        //
        // Process recreation routines
        //

        // todo: restore connections!
        restore(initRemoved);
        restore(updateRemoved);
        restore(partRemoved);
        fieldsRemoved.forEach(field => restore(field));

        allow({ ...action, payload: { env: envNew } });
    },
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
    graphLoadedLogic,
    changeLayoutLogic
];
