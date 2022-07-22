import { Context } from "@lib/fx/analisys/Analyzer";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LiteGraph } from "litegraph.js";
import { LGraphNodeAST } from "./GraphNode";


class Float extends LGraphNodeAST {
    static desc = "Float";

    private widget: IWidget;

    constructor() {
        super("Float");
        this.addOutput("value", "float");
        this.addProperty<Number>("value", 0.0, "number");
        this.widget = this.addWidget("number", "value", 0, "value", { precision: 2 });
        this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
        this.size = [160, 30];
    }

    evaluate(context: Context, program: ProgramScope, slot: number): IExprInstruction {
        let sourceNode = null as IParseNode;
        let scope = program.currentScope;
        return new FloatInstruction({ scope, sourceNode, value: Number(this.properties["value"]) });
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.properties.value.toFixed(2);
        }
        return super.getTitle();
    }

    onDrawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        this.outputs[0].label = this.properties["value"].toFixed(2);
    }
}

LiteGraph.registerNodeType("constants/float", Float);
