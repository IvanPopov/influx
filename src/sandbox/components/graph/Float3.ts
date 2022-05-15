import { Context } from "@lib/fx/analisys/Analyzer";
import { ConstructorCallInstruction } from "@lib/fx/analisys/instructions/ConstructorCallInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { T_FLOAT3 } from "@lib/fx/analisys/SystemScope";
import { IExprInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode, LGraphNodeEx } from "./IGraph";


class Float3 extends LGraphNodeEx implements IGraphASTNode {
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
        const sourceNode = null as IParseNode;
        const scope = program.currentScope;
        const type = T_FLOAT3;
        const ctor = new VariableTypeInstruction({ type, scope: null });
        const args= [0, 1, 2].map(i => (this.getInputNode(i) as IGraphASTNode).evaluate(context, program, this.link(0)) as IExprInstruction);
        return new ConstructorCallInstruction({ scope, sourceNode, ctor, args });
    }

    getDocs(): string 
    {
        return "Constructor of float3() type."
    }
}

LiteGraph.registerNodeType("constructors/float3", Float3);
