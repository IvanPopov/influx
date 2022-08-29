import { Context } from "@lib/fx/analisys/Analyzer";
import { FunctionCallInstruction } from "@lib/fx/analisys/instructions/FunctionCallInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, IFunctionDeclInstruction, IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";


import { AST, CodeEmitterNode, GraphContext, LGraphNodeFactory } from "./GraphNode";


interface INodeDesc {
    func: IFunctionDeclInstruction;
    desc: string;
    name: string;
    inputs: { name: string, type: string }[];
    outputs: { name: string, type: string }[];
}

function producer(env: () => ISLDocument): LGraphNodeFactory
{

    const nodes = <LGraphNodeFactory>{};

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
        class Node extends CodeEmitterNode {
            static desc = node.desc;
            constructor() {
                super(node.name);
                node.inputs.forEach(i => this.addInput(i.name, i.type));
                node.outputs.forEach(o => this.addOutput(o.name, o.type));
                this.size = [180, 25 * Math.max(node.inputs.length, node.outputs.length)];
            }

            override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
                if (this.locals || 
                    !this.inputs.every((x, i) => this.isInputConnected(i))) {
                    return [];
                }

                const deps = super.compute(context, program);
                const scope = program.currentScope;
                const decl = node.func;
                const type = decl.def.returnType;
                const args = node.inputs
                    .map((V, i) => this.getInputNode(i)?.exec(context, program, this.getOriginalSlot(i))) || null;
                const expr = new FunctionCallInstruction({ scope, type, decl, args });

                return [ ...deps, ...this.addLocal(context, program, type.name, expr) ];
            }
    

            override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
                if (!this.locals)
                    return null;
                return AST(context, program).idexpr(this.locals[slot]);
            }
        }

        nodes[`functions/${node.desc}`] = Node;
    }

    loadLibrary(env()).forEach(node => autogenNode(node));
    return nodes;
}


export default producer;

