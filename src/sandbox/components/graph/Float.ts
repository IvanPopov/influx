import { Context } from "@lib/fx/analisys/Analyzer";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode } from "./IGraph";


class Float extends LGraphNode implements IGraphASTNode {
    static desc = "Float";

    private widget: IWidget;

    constructor() {
        super("Float");
        this.addOutput("value", "float");
        this.addProperty<Number>("value", 0.0, "number");
        this.widget = this.addWidget("number", "value", 0, "value");
        this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
        this.size = [180, 30];
    }

    evaluate(context: Context, program: ProgramScope): IExprInstruction {
        let sourceNode = null as IParseNode;
        let scope = program.currentScope;
        return new FloatInstruction({ scope, sourceNode, value: Number(this.properties["value"]) });
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.properties.value.toFixed(2);
        }
        return this.title;
    }

    onDrawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        this.outputs[0].label = this.properties["value"].toFixed(2);
    }
}

LiteGraph.registerNodeType("influx/float", Float);
