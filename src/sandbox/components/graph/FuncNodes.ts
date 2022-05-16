import { Context } from "@lib/fx/analisys/Analyzer";
import { FunctionCallInstruction } from "@lib/fx/analisys/instructions/FunctionCallInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { LiteGraph } from "litegraph.js";
import { LIB_SL_DOCUMENT } from "./common";
import { IGraphASTNode, LGraphNodeEx } from "./IGraph";

interface INodeDesc {
    func: IFunctionDeclInstruction;
    desc: string;
    name: string;
    inputs: { name: string, type: string }[];
    outputs: { name: string, type: string }[];
}

function loadLibrary(slDocument: ISLDocument) {
    let scope = slDocument.root.scope; // scope => current global scope, scope.parent => system scope

    let nodes: INodeDesc[] = [];

    while (scope) {
        for (let [name, funcList] of Object.entries(scope.functions)) {
            for (let func of funcList) {
                let isSupported = func.def.params.every(p => p.type.usages.every(u => u != "inout" && u != "out" && u != "uniform"));
                if (!isSupported) {
                    continue;
                }

                let inputs = func.def.params.map(p => ({ name: p.id.name, type: p.type.name }));
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

function autogenNode(node: INodeDesc) {
    class Node extends LGraphNodeEx implements IGraphASTNode {
        static desc = node.desc;
        constructor() {
            super(node.name);
            node.inputs.forEach(i => this.addInput(i.name, i.type));
            node.outputs.forEach(o => this.addOutput(o.name, o.type));
            this.size = [180, 25 * Math.max(node.inputs.length, node.outputs.length)];
        }

        run(context: Context, program: ProgramScope, slot: number): IExprInstruction {
            let func = node.func;
            let type = func.def.returnType;
            let sourceNode = null as IParseNode;
            let callee = null as IExprInstruction;

            const scope = program.currentScope;
            let args = node.inputs.map((V, i) => (this.getInputNode(i) as IGraphASTNode).run(context, program, this.link(0)) as IExprInstruction);

            return new FunctionCallInstruction({ scope, type, decl: func, args, sourceNode, callee });
        }
    }

    LiteGraph.registerNodeType(`functions/${node.desc}`, Node);
}

loadLibrary(LIB_SL_DOCUMENT).forEach(node => autogenNode(node));

