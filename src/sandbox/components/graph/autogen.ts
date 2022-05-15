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
import { createSLDocument, extendSLDocument, extendSLDocumentSync } from "@lib/fx/SLDocument";
import { createSyncTextDocument, createTextDocument } from "@lib/fx/TextDocument";
import * as CodeEmitter from "@lib/fx/translators/CodeEmitter";
import { IExprInstruction, IFunctionDeclInstruction, ITypeDeclInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { Diagnostics } from "@lib/util/Diagnostics";
import { INodeOutputSlot, LGraphNode, LiteGraph, LLink } from "litegraph.js";
import { IGraphASTFinalNode, IGraphASTNode, LGraphNodeEx } from "./IGraph";

import { InitRoutineHLSL, UpdateRoutineHLSL, SpawnRoutineHLSL } from './lib';
import { LibLoader } from "./LibLoader";

const PART_TYPE = "Part";
const PART_LOCAL_NAME = "part";

let NullNode: any = {
    evaluate: (context: Context, program: ProgramScope, slot: number): IExprInstruction => null
};

async function autogenDocumentation()
{
    const SPAWN_TEXT_DOCUMENT = createTextDocument("://SpawnRoutine.hlsl", SpawnRoutineHLSL);
    const INIT_TEXT_DOCUMENT = createTextDocument("://SpawnRoutine.hlsl", InitRoutineHLSL);
    const UPDATE_TEXT_DOCUMENT = createTextDocument("://SpawnRoutine.hlsl", UpdateRoutineHLSL);
    const docs = [ LIB_TEXT_DOCUMENT, SPAWN_TEXT_DOCUMENT, INIT_TEXT_DOCUMENT, UPDATE_TEXT_DOCUMENT ];
    let ll = new LibLoader();
    
    docs.forEach(doc => ll.parse(doc));

    for (let node in ll.nodes)
    {
        LGraphNodeEx.nodesDocs[node] = ll.nodes[node];
    }
}

function autogenDecomposer(slDocument: ISLDocument)
{
    class Node extends LGraphNodeEx implements IGraphASTNode {
        static desc = 'Decomposer';
        constructor() 
        {
            super('Decomposer');
            this.addInput('in', null);
            this.size = [ 180, 25 ];
        }

        evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
        {
            const name = this.getOutputInfo(slot).name;
            const element = (this.getInputNode(0) as IGraphASTNode).evaluate(context, program, this.link(0)) as IExprInstruction;

            const sourceNode = null as IParseNode;    
            const scope = program.currentScope;
            
            const decl = element.type.getField(name);
            const id = new IdInstruction({ scope, sourceNode, name });
            const postfix = new IdExprInstruction({ scope, sourceNode, id, decl });

            return new PostfixPointInstruction({ sourceNode, scope, element, postfix });
        }

        onConnectInput(inputIndex: number, outputType: string | -1, outputSlot: INodeOutputSlot, outputNode: IGraphASTNode, outputIndex: number): boolean 
        {
            // part argument has been added in order to handle corner case related to 'fx' pipeline
            const source = `auto anonymous(${PART_TYPE} ${PART_LOCAL_NAME}) { return ($complexExpr); }`;
            const textDocument = createTextDocument(`://decompose-node`, source);

            let type: IVariableTypeInstruction = null;
            
            // quick analisys inside of virtual enviroment in order to compute on fly expression type
            let documentEx = extendSLDocumentSync(textDocument, PART_STRUCTURE_SL_DOCUMENT, {
                $complexExpr: (context, program, sourceNode): IExprInstruction => {
                    const expr = outputNode.evaluate(context, program, outputIndex) as IExprInstruction;
                    type = expr.type;
                    return expr;
                }
            });

            if (documentEx.diagnosticReport.errors) {
                console.error(Diagnostics.stringify(documentEx.diagnosticReport));
            }

            type.fields.forEach((field) => {
                this.addOutput(field.name, field.type.name);
            });

            console.log('input connected!', arguments);
            return type.isComplex();
        }

        onConnectionsChange(input: number, i: number, connected: boolean, link: LLink, inout: any)
        {
            if (!link) return;
            const isInputChanged = this.graph.getNodeById(link.origin_id) != this;
            if (isInputChanged && !connected)
            {
                while (this.outputs.length)
                {
                    this.disconnectOutput(0);
                    this.removeOutput(0);
                }
            }
        }
    }

    LiteGraph.registerNodeType(`helpers/decomposer`, Node);
}

function autogenUniforms(slDocument: ISLDocument)
{
    let vars = slDocument.root.scope.variables;
    for (let name in vars)
    {
        let v = vars[name];
        if (v.type.isUniform())
        {
            class Node extends LGraphNodeEx implements IGraphASTNode {
                static desc = `Uniform '${name}'`;
                constructor() 
                {
                    super(`${name}`);
                    this.addOutput('out', v.type.name);
                    this.size = [ 180, 25 ];
                }
        
                evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
                {
                    const scope = program.currentScope;
                    let sourceNode = null as IParseNode;
                    let decl = scope.findVariable(name);
        
                    const id = new IdInstruction({ scope, sourceNode, name });
                    return new IdExprInstruction({ scope, sourceNode, id, decl });
                }
            }
        
            LiteGraph.registerNodeType(`constants/${name} (uniform)`, Node);
        }
    }
}

function autogenPartIdNode(slDocument: ISLDocument)
{
    class Node extends LGraphNodeEx implements IGraphASTNode {
        static desc = 'Autogenerated particle ID.';
        constructor() 
        {
            super('Part ID');
            this.addOutput('id', 'int');
            this.size = [ 180, 25 ];
        }

        evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
        {
            const scope = program.currentScope;
            let sourceNode = null as IParseNode;
            let name = 'partId';
            let decl = scope.findVariable(name);

            const id = new IdInstruction({ scope, sourceNode, name });
            return new IdExprInstruction({ scope, sourceNode, id, decl });
        }
    }

    LiteGraph.registerNodeType(`fx/partId`, Node);
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

        class Node extends LGraphNodeEx implements IGraphASTNode {
            static desc = desc;
            constructor() 
            {
                super(name);
                this.addOutput(name, field.type.name);
                this.size = [ 130, 25 ];
            }
    
            evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
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

        LiteGraph.registerNodeType(`fx/${name}`, Node);
    });


    class Node extends LGraphNodeEx implements IGraphASTNode {
        static desc = desc;
        // static filter = "influx";
        constructor() 
        {
            super(name);
            this.addOutput(PART_LOCAL_NAME, PART_TYPE);
            this.size = [ 100, 25 ];
        }

        evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
        {
            return evaluatePartExpr(context, program);
        }
        
    }

    LiteGraph.registerNodeType(`fx/${name}`, Node);
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

    let desc = "SpawnRoutine";
    let name = "SpawnRoutine";

    class Node extends LGraphNodeEx implements IGraphASTFinalNode
    {
        static desc = desc;

        constructor() {
            super(name);
            this.addInput("count", "int");
            this.size = [180, 30];
        }

        async evaluate(document = LIB_SL_DOCUMENT): Promise<ISLDocument> {
            let inputNode = this.getInputNode(0);
            let inputInfo = this.getInputInfo(0);
            let link = this.graph.links[inputInfo.link];

            if (!inputNode) {
                console.warn('nothing todo');
                return null;
            }

            // analyse inside of virtual enviroment for subsequent mixing with the full context
            let textDocument = createSyncTextDocument("://SpawnRoutine.hlsl", SpawnRoutineHLSL);
            const slDocument = extendSLDocument(textDocument, document, {
                '$input0': (context, program, sourceNode): IExprInstruction => {
                    const scope = program.currentScope;
                    return (inputNode as IGraphASTNode).evaluate(context, program, link.origin_slot) as IExprInstruction;
                }
            });

            return slDocument;
        }
    }

    LiteGraph.registerNodeType(`fx/${desc}`, Node);
}


function autogenPartInitNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    let inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    let desc = "InitRoutine";
    let name = "InitRoutine";

    class Node extends LGraphNodeEx implements IGraphASTFinalNode
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
                    return (this.getInputNode(0) as IGraphASTNode).evaluate(context, program, this.link(0)) as IExprInstruction;
                },
                '$input1': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(1) as IGraphASTNode).evaluate(context, program, this.link(1)) as IExprInstruction;
                },
                '$input2': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(2) as IGraphASTNode).evaluate(context, program, this.link(2)) as IExprInstruction;
                },
                '$input3': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(3) as IGraphASTNode).evaluate(context, program, this.link(3)) as IExprInstruction;
                }
            });

            // console.log(slDocument.root.scope.functions['InitRoutine'][0].toCode());
            return slDocument;
        }
    }

    LiteGraph.registerNodeType(`fx/${desc}`, Node);
}


function autogenPartUpdateNode(slDocument: ISLDocument)
{
    let type = slDocument.root.scope.types[PART_TYPE] as ComplexTypeInstruction;
    let inputs = type.fields.map((decl: IVariableDeclInstruction) => ({ name: decl.name, type: decl.type.name }));
    let desc = "UpdateRoutine";
    let name = "UpdateRoutine";

    class Node extends LGraphNodeEx implements IGraphASTFinalNode
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
                    return (this.getInputNode(0) as IGraphASTNode || NullNode).evaluate(context, program, this.link(0)) as IExprInstruction;
                },
                '$input1': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(1) as IGraphASTNode || NullNode).evaluate(context, program, this.link(1)) as IExprInstruction;
                },
                '$input2': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(2) as IGraphASTNode || NullNode).evaluate(context, program, this.link(2)) as IExprInstruction;
                },
                '$input3': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(3) as IGraphASTNode || NullNode).evaluate(context, program, this.link(3)) as IExprInstruction;
                },
                // isAlive
                '$input4': (context, program, sourceNode): IExprInstruction => {
                    return (this.getInputNode(4) as IGraphASTNode || NullNode).evaluate(context, program, this.link(4)) as IExprInstruction;
                }
            });

            return slDocument;
        }
    }

    LiteGraph.registerNodeType(`fx/${desc}`, Node);

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
    class Node extends LGraphNodeEx implements IGraphASTNode {
        static desc = node.desc;
        constructor() 
        {
            super(node.name);
            node.inputs.forEach(i => this.addInput(i.name, i.type));
            node.outputs.forEach(o => this.addOutput(o.name, o.type));
            this.size = [ 180, 25 * Math.max(node.inputs.length, node.outputs.length) ];
        }

        evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction
        {
            let func = node.func;
            let type = func.def.returnType;
            let sourceNode = null as IParseNode;
            let callee = null as IExprInstruction;

            const scope = program.currentScope;
            let args = node.inputs.map((V, i) => (this.getInputNode(i) as IGraphASTNode).evaluate(context, program, this.link(0)) as IExprInstruction);

            return new FunctionCallInstruction({ scope, type, decl: func, args, sourceNode, callee });
        }
    }

    LiteGraph.registerNodeType(`functions/${node.desc}`, Node);
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
autogenDecomposer(LIB_SL_DOCUMENT);
autogenUniforms(LIB_SL_DOCUMENT);
autogenFunctionalNodes(LIB_SL_DOCUMENT);

// particle specific autogen
autogenPartSpawnNode(null);
autogenPartIdNode(PART_STRUCTURE_SL_DOCUMENT);
autogenPartPreviousNode(PART_STRUCTURE_SL_DOCUMENT);
autogenPartUpdateNode(PART_STRUCTURE_SL_DOCUMENT);
autogenPartInitNode(PART_STRUCTURE_SL_DOCUMENT);
autogenDocumentation();
