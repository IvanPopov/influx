import { type as typeHelper } from '@lib/fx/analisys/helpers';
import { extendFXSLDocument, createFXSLDocument } from '@lib/fx/FXSLDocument';
import { createTextDocument } from '@lib/fx/TextDocument';
import * as FxEmitter from '@lib/fx/translators/FxEmitter';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { Diagnostics } from '@lib/util/Diagnostics';
import { isDefAndNotNull } from '@lib/util/s3d/type';
import { nodes, sourceCode } from '@sandbox/actions';
import * as evt from '@sandbox/actions/ActionTypeKeys';
import { IGraphChangeLayout, IGraphCompile, IGraphLoaded } from '@sandbox/actions/ActionTypes';
import { history } from '@sandbox/reducers/router';
import IStoreState from '@sandbox/store/IStoreState';
import { LGraph, LiteGraph } from 'litegraph.js';
import { matchPath } from 'react-router-dom';
import { createLogic } from 'redux-logic';
import { GRAPH_KEYWORD, LOCATION_PATTERN, PATH_PARAMS_TYPE } from './common';

import * as CodeEmitter from '@lib/fx/translators/CodeEmitter';
import docs from '@sandbox/components/graphEx/utils/docs';

// import all factories

import { PART_LOCAL_NAME, PART_TYPE } from '@sandbox/components/graphEx/common';

import BasicType from '@sandbox/components/graphEx/BasicType';
import Decomposer from '@sandbox/components/graphEx/Decomposer';    
import Float from '@sandbox/components/graphEx/Float';
import FuncNodes from '@sandbox/components/graphEx/FuncNodes';
import IfStmt from '@sandbox/components/graphEx/IfStmt';
import Int from '@sandbox/components/graphEx/Int';
import Operators from '@sandbox/components/graphEx/Operators';
import Uniforms from '@sandbox/components/graphEx/Uniforms';
import StmtList from '@sandbox/components/graphEx/StmtList';

import DefaultMaterial from '@sandbox/components/graphEx/fx/DefaultMaterial';
import Kill from '@sandbox/components/graphEx/fx/Kill';
import KillBy from '@sandbox/components/graphEx/fx/KillBy';
import LwiMaterial from '@sandbox/components/graphEx/fx/LwiMaterial';
import Part from '@sandbox/components/graphEx/fx/Part';
import PartId from '@sandbox/components/graphEx/fx/PartId';
import PartInit from '@sandbox/components/graphEx/fx/PartInit';
import PartPrevious from '@sandbox/components/graphEx/fx/PartPrevious';
import PartSpawn from '@sandbox/components/graphEx/fx/PartSpawn';
import PartUpdate from '@sandbox/components/graphEx/fx/PartUpdate';
import Param from '@sandbox/components/graphEx/fx/Param';


import { ITypeInstruction } from '@lib/idl/IInstruction';
import { CodeEmitterNode, ICodeMaterialNode, ISpawner, LGraphNodeFactory } from '@sandbox/components/graphEx/GraphNode';
import GraphTemplateJSON from '@sandbox/components/graphEx/lib/template.json';
import { getEnv } from '@sandbox/reducers/nodes';


async function loadEnv(layout: string): Promise<ISLDocument> {
    // todo: don't reload library every time
    const includeResolver = async (name) => (await fetch(name)).text();
    const libraryPath = "./assets/graph/lib.hlsl";
    const libText = await createTextDocument("", `#include "${libraryPath}"`);
    const lib = await createFXSLDocument(libText, { includeResolver });

    // extract and fill graph node documentation database
    // todo: move to statics
    docs(libText);

    const partTex = await createTextDocument('://part-layout', layout);
    return extendFXSLDocument(partTex, lib, null, { includeResolver })
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
            Operators,
            Float,
            Int,
            IfStmt,
            FuncNodes,
            BasicType,
            Kill,
            KillBy,
            Decomposer,
            Uniforms,
            StmtList,
            Part,
            PartId,
            PartUpdate,
            PartSpawn,
            PartInit,
            PartPrevious,
            LwiMaterial,
            DefaultMaterial,
            Param
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
    initId: number;
    passes: PassPlug[];
}

interface PassPlug {
    id: number;
    sorting: boolean;
    geometry: string;
}

function makeFxTemplate(env: ISLDocument, plug: Plug) {

    let passes = plug.passes.map((plug, i) => 
`   pass P${i} {
        Sorting = ${plug.sorting};
        PrerenderRoutine = compile PrerenderRoutine${plug.id}();
        Geometry = "${plug.geometry.toLowerCase()}";
    }`).join("\n\n");

    return (
`
partFx G {
    Capacity = 4096;
    SpawnRoutine = compile SpawnRoutine();
    InitRoutine = compile InitRoutine${plug.initId}();
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

        // IP: hack to find all spawners/initializer by type
        const InitInstance = LiteGraph.registered_node_types['fx/InitRoutine'];

        let spawn = graph.findNodeByTitle("SpawnRoutine") as CodeEmitterNode;
        let update = graph.findNodeByTitle("UpdateRoutine") as CodeEmitterNode;
        let inits = graph.findNodesByClass(InitInstance) as ISpawner[];
        let prerender: ICodeMaterialNode[] = [];
        prerender = [ ...prerender, ...graph.findNodesByTitle("DefaultMaterial") as ICodeMaterialNode[] ];
        prerender = [ ...prerender, ...graph.findNodesByTitle("LwiMaterial") as ICodeMaterialNode[] ];


        let doc = await extendFXSLDocument(null, env);
        doc = await spawn.run(doc);
        for (let init of inits) {
            doc = await init.run(doc);
        }
        doc = await update.run(doc);

        let plugs: PassPlug[] = [];
        for (let i in prerender) {
            let { id, sorting, geometry } = prerender[i];
            doc = await prerender[i].run(doc);
            plugs.push({ id, sorting, geometry });
        }

        doc = await extendFXSLDocument(await createTextDocument("://fx-template", 
        makeFxTemplate(env, { passes: plugs, initId: inits.find(init => init.pure).id })), doc);

        let content = Diagnostics.stringify(doc.diagnosticReport);
        console.log(content);

        graph.list_of_graphcanvas.forEach(canvas => canvas.draw(true, true));

        dispatch(sourceCode.setContent(FxEmitter.translateTechnique(doc, 'G')));
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
            nodes = graph.findNodesByType(`fx/out ${name}`);
            nodes.forEach(node => graph.remove(node));
        });

        //
        // Remove nodes with changed types and remember list of recreation routines
        //
        
        // sync with PartPrev.ts, PartInit.ts etc.
        let partRemoved = remove(`fx/${PART_LOCAL_NAME}`);
        let fieldsRemoved = toRecreateField.map(f => remove(`fx/${PART_LOCAL_NAME}.${f}`));
        let partRemovedOut = remove(`fx/out ${PART_LOCAL_NAME}`);
        let fieldsRemovedOut = toRecreateField.map(f => remove(`fx/out ${PART_LOCAL_NAME}.${f}`));

        //
        // Unlink prev types
        //

        let nodeList = produceNodes(
            () => env, 
            PartPrevious,   // part in
            Part            // part out
            );

        Object.keys(nodeList).forEach(type => LiteGraph.unregisterNodeType(type));

        //
        // Link new types
        //

        nodeList = produceNodes(
            () => envNew, 
            PartPrevious,   // part in
            Part            // part out
            );

        Object.keys(nodeList).forEach(type => LiteGraph.registerNodeType(type, nodeList[type]));

        //
        // Process recreation routines
        //

        // todo: restore connections!
        restore(partRemoved);
        fieldsRemoved.forEach(field => restore(field));
        restore(partRemovedOut);
        fieldsRemovedOut.forEach(field => restore(field));

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
