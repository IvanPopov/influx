import { Context } from "@lib/fx/analisys/Analyzer";
import { ConstructorCallInstruction } from "@lib/fx/analisys/instructions/ConstructorCallInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { T_FLOAT3 } from "@lib/fx/analisys/SystemScope";
import { IExprInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode } from "./IGraph";


class Float3 extends LGraphNode implements IGraphASTNode {
    static desc = "Float3";

    private widget: IWidget;

    constructor() {
        super("Float3");
        this.addOutput("out", "float3");
        this.addInput("x", "float");
        this.addInput("y", "float");
        this.addInput("z", "float");
        this.size = [180, 25 * 3];
    }

    evaluate(context: Context, program: ProgramScope): IExprInstruction {
        let sourceNode = null as IParseNode;
        let scope = program.currentScope;
        let type = T_FLOAT3;
        let ctor = new VariableTypeInstruction({ type, scope: null });
        let args= [0, 1, 2].map(i => (this.getInputNode(i) as IGraphASTNode).evaluate(context, program) as IExprInstruction);

        return new ConstructorCallInstruction({ scope, sourceNode, ctor, args });
    }
}

LiteGraph.registerNodeType("influx/float3", Float3);
