import { Context } from "@lib/fx/analisys/Analyzer";
import { ArithmeticExprInstruction } from "@lib/fx/analisys/instructions/ArithmeticExprInstruction";
import { RelationalExprInstruction, RelationOperator } from "@lib/fx/analisys/instructions/RelationalExprInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IArithmeticOperator, IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";

import { IGraphASTNode, LGraphNodeAST, LGraphNodeFactory } from "./GraphNode";

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};

    const types = ['float', 'int', 'uint', 'float3'];

    const arithmetic = [
        { name: "Summ", operator: "+", search: "summ '+'" },
        { name: "Subtraction", operator: "-", search: "subtraction '-'" },
        { name: "Mult", operator: "*", search: "multiply '*'" },
        { name: "Div", operator: "/", search: "division '/'" },
        { name: "Mod", operator: "%", search: "modulo '%'" }
    ];

    arithmetic.forEach(desc => {
        types.forEach(typeName => {
            class Node extends LGraphNodeAST {
                static desc = desc.name;

                constructor() {
                    super(desc.name);
                    this.addInput("a", typeName);
                    this.addInput("b", typeName);
                    this.addOutput("value", typeName);
                    this.size = [100, 50];
                }

                evaluate(context: Context, program: ProgramScope): IExprInstruction {
                    const sourceNode = null as IParseNode;
                    const scope = program.currentScope;
                    const operator = desc.operator as IArithmeticOperator;

                    let leftNode = this.getInputNode(0) as IGraphASTNode;
                    let rightNode = this.getInputNode(1) as IGraphASTNode;

                    if (!leftNode || !rightNode) {
                        this.emitError(`All inputs must be conected.`);
                        return null;
                    }

                    const left = leftNode.run(context, program, this.link(0)) as IExprInstruction;
                    const right = rightNode.run(context, program, this.link(1)) as IExprInstruction;

                    // IP: todo - calc proper type
                    const type = left.type;

                    return new ArithmeticExprInstruction({ scope, sourceNode, left, right, operator, type });
                }

                getTitle(): string {
                    return `${this.getInputInfo(0).name} ${desc.operator} ${this.getInputInfo(1).name}`;
                }

                getDocs(): string {
                    return `Operator '${desc.search}'.`
                }
            }


            nodes[`operators/${desc.search} | ${typeName}`] = Node;
        });
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
        class Node extends LGraphNodeAST {
            static desc = desc.name;

            constructor() {
                super(desc.name);
                this.addInput("a", "float");
                this.addInput("b", "float");
                this.addOutput("value", "bool");
                this.size = [100, 50];
            }

            evaluate(context: Context, program: ProgramScope): IExprInstruction {
                const sourceNode = null as IParseNode;
                const scope = program.currentScope;
                const operator = desc.operator as RelationOperator;

                let leftNode = this.getInputNode(0) as IGraphASTNode;
                let rightNode = this.getInputNode(1) as IGraphASTNode;

                if (!leftNode || !rightNode) {
                    this.emitError(`All inputs must be conected.`);
                    return null;
                }

                const left = leftNode.run(context, program, this.link(0)) as IExprInstruction;
                const right = rightNode.run(context, program, this.link(1)) as IExprInstruction;
                return new RelationalExprInstruction({ scope, sourceNode, left, right, operator });
            }

            getTitle(): string {
                return `${this.getInputInfo(0).name} ${desc.operator} ${this.getInputInfo(1).name}`;
            }

            getDocs(): string {
                return `Operator '${desc.search}'.`
            }
        }

        nodes[`operators/${desc.search}`] = Node;
    });

    return nodes;
}

export default producer;

