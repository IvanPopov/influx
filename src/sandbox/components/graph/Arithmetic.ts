import { Context } from "@lib/fx/analisys/Analyzer";
import { ArithmeticExprInstruction } from "@lib/fx/analisys/instructions/ArithmeticExprInstruction";
import { RelationalExprInstruction, RelationOperator } from "@lib/fx/analisys/instructions/RelationalExprInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IArithmeticOperator, IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode } from "./IGraph";

let types = [ 'float', 'int', 'uint', 'float3' ];

let arithmetic = [
    { name: "Summ",         operator: "+", search: "summ '+'" },
    { name: "Subtraction",  operator: "-", search: "subtraction '-'" },
    { name: "Mult",         operator: "*", search: "multiply '*'" },
    { name: "Div",          operator: "/", search: "division '/'" },
    { name: "Mod",          operator: "%", search: "modulo '%'" }
];

arithmetic.forEach(desc => {
    types.forEach(typeName => {
        class Node extends LGraphNode implements IGraphASTNode {
            static desc = desc.name;
        
            constructor() {
                super(desc.name);
                this.addInput("a", typeName);
                this.addInput("b", typeName);
                this.addOutput("value", typeName);
                this.size = [180, 50];
            }
        
            evaluate(context: Context, program: ProgramScope): IExprInstruction {
                let sourceNode = null as IParseNode;
                let scope = program.currentScope;
                let operator = desc.operator as IArithmeticOperator;
        
                let left = (this.getInputNode(0) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
                let right = (this.getInputNode(1) as IGraphASTNode).evaluate(context, program) as IExprInstruction;

                // IP: todo - calc proper type
                let type = left.type;
        
                return new ArithmeticExprInstruction({ scope, sourceNode, left, right, operator, type });
            }
        }
        
        
        LiteGraph.registerNodeType(`operators/${desc.search} | ${typeName}`, Node);
    });
});

let relations = [
    { name: "Equal",        operator: "==", search: "equal '=='" },
    { name: "NotEqual",     operator: "!=", search: "not equal '!='" },
    { name: "Less",         operator: "<",  search: "less '<'" },
    { name: "Greater",      operator: ">",  search: "greater '>'" },
    { name: "LessThan",     operator: "<=", search: "less than '<='" },
    { name: "GreaterThan",  operator: ">=", search: "greater than '>='" }
];

// todo: add support of different types
relations.forEach(desc => {
    class Node extends LGraphNode implements IGraphASTNode {
        static desc = desc.name;

        constructor() {
            super(desc.name);
            this.addInput("a", "float");
            this.addInput("b", "float");
            this.addOutput("value", "bool");
            this.size = [180, 50];
        }

        evaluate(context: Context, program: ProgramScope): IExprInstruction {
            let sourceNode = null as IParseNode;
            let scope = program.currentScope;
            let operator = desc.operator as RelationOperator;

            let left = (this.getInputNode(0) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
            let right = (this.getInputNode(1) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
            return new RelationalExprInstruction({ scope, sourceNode, left, right, operator });
        }
    }

    LiteGraph.registerNodeType(`operators/${desc.search}`, Node);
});

