import { Context } from "@lib/fx/analisys/Analyzer";
import { ArithmeticExprInstruction } from "@lib/fx/analisys/instructions/ArithmeticExprInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IArithmeticOperator, IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode } from "./IGraph";

class SummExpr extends LGraphNode implements IGraphASTNode {
    static desc = "Summ";

    private widget: IWidget;

    constructor() {
        super("Summ Expr");
        this.addInput("a", "float");
        this.addInput("b", "float");
        this.addOutput("value", "float");
        this.size = [180, 60];
    }

    evaluate(context: Context, program: ProgramScope): IExprInstruction {
        let sourceNode = null as IParseNode;
        let scope = program.currentScope;
        let operator = '+' as IArithmeticOperator;

        let left = (this.getInputNode(0) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
        let right = (this.getInputNode(1) as IGraphASTNode).evaluate(context, program) as IExprInstruction;
        // IP: todo - calc proper type
        let type = left.type;

        return new ArithmeticExprInstruction({ scope, sourceNode, left, right, operator, type });
    }
}


LiteGraph.registerNodeType("influx/summ", SummExpr);
