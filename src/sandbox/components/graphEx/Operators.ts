import { Context } from "@lib/fx/analisys/Analyzer";
import { ArithmeticExprInstruction } from "@lib/fx/analisys/instructions/ArithmeticExprInstruction";
import { RelationalExprInstruction, RelationOperator } from "@lib/fx/analisys/instructions/RelationalExprInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IArithmeticOperator, IExprInstruction, IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LGraph, LGraphCanvas, LiteGraph } from "litegraph.js";

import { AST, CodeEmitterNode, GraphContext, LGraphNodeFactory } from "./GraphNode";

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};

    class Operator extends CodeEmitterNode {
        override collapse(force: boolean): void {
            super.collapse(force);
            this.restyle();
        }

        private restyle() {
            this.size = this.flags.collapsed ? [50, 25] : [100, 50];
            this.bgcolor = this.flags.collapsed ? 'transparent' : undefined;
            this.color = this.flags.collapsed ? 'transparent' : undefined;
            this.use_gradients = !this.flags.collapsed;
        }

        override onConfigure(): void {
            this.restyle();
        }
    }

    const types = ['float', 'int', 'uint', 'float3'];

    const arithmetic = [
        { name: "Summ", operator: "+", search: "summ '+'" },
        { name: "Subtraction", operator: "-", search: "subtraction '-'" },
        { name: "Mult", operator: "*", search: "multiply '*'" },
        { name: "Div", operator: "/", search: "division '/'" },
        { name: "Mod", operator: "%", search: "modulo '%'" }
    ];


    arithmetic.forEach(desc => {
            class Arithmetic extends Operator {
                static desc = desc.name;

                constructor() {
                    super(desc.name);
                    this.addInput("a", types.join(','));
                    this.addInput("b", types.join(','));
                    this.addOutput("value", types.join(','));
                    this.size = [100, 50];
                    this.shape = LiteGraph.ROUND_SHAPE;
                }

        
                override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
                    if (this.locals || 
                        !this.inputs.every((x, i) => this.isInputConnected(i))) {
                        return [];
                    }
    
                    const deps = super.compute(context, program);
                    const scope = program.currentScope;
                    const operator = desc.operator as IArithmeticOperator;
                    const left = this.getInputNode('a').exec(context, program, this.link('a'));
                    const right = this.getInputNode('b').exec(context, program, this.link('b'));
                    // IP: todo - calc proper type
                    const type = left.type;
                    const expr = new ArithmeticExprInstruction({ scope, left, right, operator, type });
                    return [ ...deps, ...this.addLocal(context, program, expr.type.name, expr) ];
                }


                override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
                    let leftNode = this.getInputNode('a');
                    let rightNode = this.getInputNode('b');
    
                    if (!leftNode || !rightNode) {
                        this.emitError(`All inputs must be conected.`);
                        return null;
                    }
    
                    if (!this.locals)
                        return null;
                    return AST(context, program).idexpr(this.locals[slot]);
                }

               
                override getTitle(): string {
                    const title = `${this.getInputInfo(0).name} ${desc.operator} ${this.getInputInfo(1).name}`;
                    return this.flags.collapsed? desc.operator : title;
                }
                

                override getDocs(): string {
                    return `Operator '${desc.search}'.`
                }
            }

            nodes[`operators/${desc.search}`] = Arithmetic;
    });

    const relations = [
        { name: "Equal", operator: "==", search: "equal '=='" },
        { name: "NotEqual", operator: "!=", search: "not equal '!='" },
        { name: "Less", operator: "<", search: "less '<'" },
        { name: "Greater", operator: ">", search: "greater '>'" },
        { name: "LessThan", operator: "<=", search: "less than '<='" },
        { name: "GreaterThan", operator: ">=", search: "greater than '>='" }
    ];

    // todo: add support of different types
    relations.forEach(desc => {
        class Relation extends Operator {
            static desc = desc.name;

            constructor() {
                super(desc.name);
                this.addInput("a", types.join(','));
                this.addInput("b", types.join(','));
                this.addOutput("value", "bool");
                this.size = [100, 50];
            }

            override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
                if (this.locals || 
                    !this.inputs.every((x, i) => this.isInputConnected(i))) {
                    return [];
                }

                const deps = super.compute(context, program);
                const scope = program.currentScope;
                const operator = desc.operator as RelationOperator;

                let leftNode = this.getInputNode('a');
                let rightNode = this.getInputNode('b');

                const left = leftNode.exec(context, program, this.link('a'));
                const right = rightNode.exec(context, program, this.link('b'));
                const expr = new RelationalExprInstruction({ scope, left, right, operator });
                return [ ...deps, ...this.addLocal(context, program, expr.type.name, expr) ];
            }


            override exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
                let leftNode = this.getInputNode('a');
                let rightNode = this.getInputNode('b');

                if (!leftNode || !rightNode) {
                    this.emitError(`All inputs must be conected.`);
                    return null;
                }

                if (!this.locals)
                    return null;
                return AST(context, program).idexpr(this.locals[slot]);
            }


            override getTitle(): string {
                const title = `${this.getInputInfo(0).name} ${desc.operator} ${this.getInputInfo(1).name}`;
                return this.flags.collapsed? desc.operator : title;
            }

            override getDocs(): string {
                return `Operator '${desc.search}'.`
            }
        }

        nodes[`operators/${desc.search}`] = Relation;
    });

    return nodes;
}

export default producer;

