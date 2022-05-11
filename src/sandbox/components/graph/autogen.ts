import { isNull, isString } from "@lib/common";
import { Analyzer, Context, IExprSubstCallback } from "@lib/fx/analisys/Analyzer";
import { expression } from "@lib/fx/analisys/helpers/expression";
import { ComplexTypeInstruction } from "@lib/fx/analisys/instructions/ComplexTypeInstruction";
import { FunctionCallInstruction } from "@lib/fx/analisys/instructions/FunctionCallInstruction";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { createSLASTDocument } from "@lib/fx/SLASTDocument";
import { createSLDocument, extendSLDocument } from "@lib/fx/SLDocument";
import { createSyncTextDocument, createTextDocument } from "@lib/fx/TextDocument";
import * as CodeEmitter from "@lib/fx/translators/CodeEmitter";
import { IExprInstruction, IFunctionDeclInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTFinalNode, IGraphASTNode } from "./IGraph";

import { InitRoutineHLSL, UpdateRoutineHLSL, SpawnRoutineHLSL } from './lib';

const PART_TYPE = "Part";
const PART_LOCAL_NAME = "part";

let NullNode: any = {
    evaluate: () => null
};

function autogenUniforms(slDocument: ISLDocument)
{
    let vars = slDocument.root.scope.variables;
    for (let name in vars)
    {
        let v = vars[name];
        if (v.type.isUniform())
        {
            class Node extends LGraphNode implements IGraphASTNode {
                static desc = `Uniform '${name}'`;
                constructor() 
                {
                    super(`${name} (uniform)`);
                    this.addOutput('out', v.type.name);
                    this.size = [ 180, 25 ];
                }
        
                evaluate(context: Context, program: ProgramScope): IExprInstruction
                {
                    const scope = program.currentScope;
                    let sourceNode = null as IParseNode;
                    let decl = scope.findVariable(name);
        
                    const id = new IdInstruction({ scope, sourceNode, name });
                    return new IdExprInstruction({ scope, sourceNode, id, decl });
                }
            }
        
            LiteGraph.registerNodeType(`influx/${name} (uniform)`, Node);
        }
    }
}

function autogenPartIdNode(slDocument: ISLDocument)
{
    class Node extends LGraphNode implements IGraphASTNode {
        static desc = 'Autogenerated particle ID.';
        constructor() 
        {
            super('Part ID');
            this.addOutput('id', 'int');
            this.size = [ 180, 25 ];
        }

        evaluate(context: Context, program: ProgramScope): IExprInstruction
        {
            const scope = program.currentScope;
            let sourceNode = null as IParseNode;
            let name = 'partId';
            let decl = scope.findVariable(name);

            const id = new IdInstruction({ scope, sourceNode, name });
            return new IdExprInstruction({ scope, sourceNode, id, decl });
        }
    }

    LiteGraph.registerNodeType(`influx/partId`, Node);
}

function autogenPartPreviousNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types[PART_TYPE] as ComplexTypeInstruction;

    let name = `${PART_LOCAL_NAME}`;
    let desc = `${name} (previous value).`;

    function evaluatePartExpr(context: Context, program: ProgramScope): IExprInstruction
    {
        let sourceNode = null as IParseNode;
        let callee = null as IExprInstruction;

        const scope = program.currentScope;
        
        const decl = scope.findVariable(name);

        if (isNull(decl)) {
            //context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
            // TODO: autogen graph error
            return null;
        }

        const id = new IdInstruction({ scope, sourceNode, name });
        return new IdExprInstruction({ scope, sourceNode, id, decl });
    }

    type.fields.forEach(field => {
        // todo: add suppor of complex types
        if (field.type.isComplex())
        {
            return;
        }

        let name = `${PART_LOCAL_NAME}.${field.name}`;
        let desc = `${name} (previous value).`;

        class Node extends LGraphNode implements IGraphASTNode {
            static desc = desc;
            constructor() 
            {
                super(name);
                this.addOutput(name, field.type.name);
                this.size = [ 180, 25 ];
            }
    
            evaluate(context: Context, program: ProgramScope): IExprInstruction
            {
                let sourceNode = null as IParseNode;    
                const scope = program.currentScope;
                const element = evaluatePartExpr(context, program);
                
                let name = field.name;
                let decl = element.type.getField(field.name);
                const id = new IdInstruction({ scope, sourceNode, name });
                const postfix = new IdExprInstruction({ scope, sourceNode, id, decl });

                return new PostfixPointInstruction({ sourceNode, scope, element, postfix });
            }
        }

        LiteGraph.registerNodeType(`influx/${name}`, Node);
    });


    class Node extends LGraphNode implements IGraphASTNode {
        static desc = desc;
        // static filter = "influx";
        constructor() 
        {
            super(name);
            this.addOutput(PART_LOCAL_NAME, PART_TYPE);
            this.size = [ 180, 25 ];
        }

        evaluate(context: Context, program: ProgramScope): IExprInstruction
        {
            return evaluatePartExpr(context, program);
        }
    }

    LiteGraph.registerNodeType(`influx/${name}`, Node);
}

function autogenPartSpawnNode(slDocument: ISLASTDocument)
{
    // let windowObjectReference;
    // let windowFeatures = "left=100,top=100,width=320,height=320";

    // function openRequestedPopup() {
    //     windowObjectReference = window.open("/code-view.html", "modal", windowFeatures);
    //     if (windowObjectReference) {
    //         //
    //     }
    // }

    let desc = "Spawn Routine";
    let name = "Spawn Routine";

    class Node extends LGraphNode implements IGraphASTFinalNode
    {
        static desc = desc;

        constructor() {
            super(name);
            this.addInput("count", "float,int,uint"); // TODO: leave only 'uint'
            this.size = [180, 30];
        }


        async evaluate(document = LIB_SL_DOCUMENT): Promise<ISLDocument> {
            // openRequestedPopup();

            let inputNode = this.getInputNode(0);
            if (!inputNode) {
                console.warn('nothing todo');
                return null;
            }

            let textDocument = createSyncTextDocument("://SpawnRoutine.hlsl", SpawnRoutineHLSL);

            const slDocument = extendSLDocument(textDocument, document, {
                '$input0': (context, program, sourceNode): IExprInstruction => {
                    const scope = program.currentScope;
                    return (inputNode as IGraphASTNode).evaluate(context, program) as IExprInstruction;
                }
            });

            return slDocument;
        }
    }

    LiteGraph.registerNodeType(`influx/${desc}`, Node);
}


function autogenPartInitNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    let inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    let desc = "Init Routine";
    let name = "Init Routine";

    class Node extends LGraphNode implements IGraphASTFinalNode
    {
        static desc = desc;
        constructor() 
        {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.size = [ 180, 25 * inputs.length ];
        }


        async evaluate(document = LIB_SL_DOCUMENT): Promise<ISLDocument> {
            let textDocument = createSyncTextDocument("://InitRoutine.hlsl", InitRoutineHLSL);

            const slDocument = await extendSLDocument(textDocument, document, {
                '$input0': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(0) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
                },
                '$input1': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(1) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
                },
                '$input2': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(2) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
                },
                '$input3': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(3) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
                }
            });

            // console.log(slDocument.root.scope.functions['InitRoutine'][0].toCode());
            return slDocument;
        }
    }

    LiteGraph.registerNodeType(`influx/${desc}`, Node);
}


function autogenPartUpdateNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    let inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    let desc = "Update Routine";
    let name = "Update Routine";

    class Node extends LGraphNode implements IGraphASTFinalNode
    {
        static desc = desc;
        constructor() 
        {
            super(name);
            inputs.forEach(i => this.addInput(i.name, i.type));
            this.addInput('is alive', 'bool');
            this.size = [ 180, 25 * (inputs.length + 1) ];
        }


        async evaluate(document = LIB_SL_DOCUMENT): Promise<ISLDocument> {
            let textDocument = createSyncTextDocument("://UpdateRoutine.hlsl", UpdateRoutineHLSL);
            const slDocument = await extendSLDocument(textDocument, document, {
                '$input0': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(0) as IGraphASTNode || NullNode).evaluate(context, program) as IExprInstruction;
                },
                '$input1': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(1) as IGraphASTNode || NullNode).evaluate(context, program) as IExprInstruction;
                },
                '$input2': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(2) as IGraphASTNode || NullNode).evaluate(context, program) as IExprInstruction;
                },
                '$input3': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(3) as IGraphASTNode || NullNode).evaluate(context, program) as IExprInstruction;
                },
                // isAlive
                '$input4': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(4) as IGraphASTNode || NullNode).evaluate(context, program) as IExprInstruction;
                }
            });

            return slDocument;
        }
    }

    LiteGraph.registerNodeType(`influx/${desc}`, Node);

}


interface INodeDesc
{
    func: IFunctionDeclInstruction;
    desc: string;
    name: string;
    inputs: { name: string, type: string }[];
    outputs: { name: string, type: string }[];
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

function autogenNode(node: INodeDesc)
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

function autogenFunctionalNodes(slDocument: ISLDocument)
{
    loadLibrary(slDocument).forEach(node => autogenNode(node));
}


const readFile = fname => fetch(fname);

const libraryPath = "./assets/graph/lib.hlsl";
const response = await readFile(libraryPath);
export const LIB_TEXT_DOCUMENT = await createTextDocument(libraryPath, await response.text());
export const LIB_SLAST_DOCUMENT = await createSLASTDocument(LIB_TEXT_DOCUMENT);
export const LIB_SL_DOCUMENT = await createSLDocument(LIB_SLAST_DOCUMENT);

export const PART_STRUCTURE_TEXT_DOCUMENT = await createTextDocument('://part-structure', 
`
struct ${PART_TYPE} {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
};`
);

export const PART_STRUCTURE_SL_DOCUMENT = await extendSLDocument(PART_STRUCTURE_TEXT_DOCUMENT, LIB_SL_DOCUMENT);

// lib based autogen
autogenUniforms(LIB_SL_DOCUMENT);
autogenFunctionalNodes(LIB_SL_DOCUMENT);

// particle specific autogen
autogenPartSpawnNode(null);
autogenPartIdNode(PART_STRUCTURE_SL_DOCUMENT);
autogenPartPreviousNode(PART_STRUCTURE_SL_DOCUMENT);
autogenPartUpdateNode(PART_STRUCTURE_SL_DOCUMENT);
autogenPartInitNode(PART_STRUCTURE_SL_DOCUMENT);

