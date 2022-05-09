import { Context } from "@lib/fx/analisys/Analyzer";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { FunctionCallInstruction } from "@lib/fx/analisys/instructions/FunctionCallInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { createSLASTDocument } from "@lib/fx/SLASTDocument";
import { createSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";
import * as CodeEmitter from "@lib/fx/translators/CodeEmitter";
import { IExprInstruction, IFunctionDeclInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode } from "./IGraph";

interface INodeDesc
{
    func: IFunctionDeclInstruction;
    desc: string;
    name: string;
    inputs: { name: string, type: string }[];
    outputs: { name: string, type: string }[];
}

function producePartUpdateNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types['Part'] as ComplexTypeInstruction;
    let inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    let desc = "Particle Update";
    let name = "Particle Update";

    class PartUpdateNode extends LGraphNode 
    {
        static desc = desc;
        constructor() 
        {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.size = [ 180, 25 * inputs.length ];
        }


        onExecute(): void {
            console.log('Particle Update!');
        }
    }

    LiteGraph.registerNodeType(`influx/${desc}`, PartUpdateNode);

}


function producePartInitNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types['Part'] as ComplexTypeInstruction;
    let inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    let desc = "Particle Init";
    let name = "Particle Init";

    class PartInitNode extends LGraphNode 
    {
        static desc = desc;
        constructor() 
        {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.size = [ 180, 25 * inputs.length ];
        }


        onExecute(): void {
            console.log('Particle Init!');
        }
    }

    LiteGraph.registerNodeType(`influx/${desc}`, PartInitNode);
}

function loadLibrary(slDocument: ISLDocument)
{
    let scope = slDocument.root.scope; // scope => current global scope, scope.parent => system scope

    let nodes: INodeDesc[] = [];

    while (scope)
    {
        for (let [name, funcList] of Object.entries(scope.functions))
        {
            for (let func of funcList)
            {
                let isSupported = func.def.params.every(p => p.type.usages.every( u => u != "inout" && u != "out" && u != "uniform" ));
                if (!isSupported)
                {
                    continue;
                }

                let inputs = func.def.params.map( p => ({ name: p.id.name, type: p.type.name }));
                let outputs = [{ name: 'out', type: func.def.returnType.name }];
                let desc = func.def.toCode();
                let name = func.def.id.name;
                nodes.push({ func, name, desc, inputs, outputs });
            }
        }

        scope = scope.parent;
    }

    return nodes;
}

function produceNode(node: INodeDesc)
{
    class Node extends LGraphNode implements IGraphASTNode {
        static desc = node.desc;
        constructor() 
        {
            super(node.name);
            node.inputs.forEach(i => this.addInput(i.name, i.type));
            node.outputs.forEach(o => this.addOutput(o.name, o.type));
            this.size = [ 180, 25 * Math.max(node.inputs.length, node.outputs.length) ];
        }

        evaluate(context: Context, program: ProgramScope): IExprInstruction
        {
            let func = node.func;
            let type = func.def.returnType;
            let sourceNode = null as IParseNode;
            let callee = null as IExprInstruction;

            const scope = program.currentScope;
            
            let args = node.inputs.map((V, i) => (this.getInputNode(i) as IGraphASTNode).evaluate(context, program) as IExprInstruction);

            return new FunctionCallInstruction({ scope, type, decl: func, args, sourceNode, callee });
        }
    }

    LiteGraph.registerNodeType(`influx/${node.desc}`, Node);
}

function produceNodes(slDocument: ISLDocument)
{
    loadLibrary(slDocument).forEach(node => produceNode(node));
}


function fread(uri: string)
{
    const request = new XMLHttpRequest();
    request.open('GET', uri, false);
    request.send(null);

    if (request.status !== 200) {
        console.error(`cannot read file '${uri}'.`);
    }

    return request.responseText;
}

const libraryPath = "/assets/graph/lib.hlsl";
export const LIB_TEXT_DOCUMENT = createTextDocument(libraryPath, fread(libraryPath));
export const LIB_SLAST_DOCUMENT = await createSLASTDocument(LIB_TEXT_DOCUMENT);
export const LIB_SL_DOCUMENT = await createSLDocument(LIB_SLAST_DOCUMENT);

export const PART_STRUCTURE_TEXT_DOCUMENT = createTextDocument('://part-structure', 
`
struct Part {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
};`
);

export const PART_STRUCTURE_SL_DOCUMENT = await createSLDocument(PART_STRUCTURE_TEXT_DOCUMENT);

producePartUpdateNode(PART_STRUCTURE_SL_DOCUMENT);
producePartInitNode(PART_STRUCTURE_SL_DOCUMENT);
produceNodes(LIB_SL_DOCUMENT);
