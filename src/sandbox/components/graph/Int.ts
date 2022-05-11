import { Context, parseUintLiteral } from "@lib/fx/analisys/Analyzer";
import { FloatInstruction } from "@lib/fx/analisys/instructions/FloatInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphNode, LiteGraph } from "litegraph.js";
import { IGraphASTNode } from "./IGraph";


class Int extends LGraphNode implements IGraphASTNode {
    static desc = "Int";

    private widget: IWidget;

    constructor() {
        super("Int");
        this.addOutput("value", "int");
        this.addProperty<Number>("value", 0.0, "number");
        this.widget = this.addWidget("number", "value", 0, "value");
        this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
        this.size = [180, 30];
    }

    evaluate(context: Context, program: ProgramScope): IExprInstruction {
        let sourceNode = null as IParseNode;
        let scope = program.currentScope;
        // return new FloatInstruction({ scope, sourceNode, value: Number(this.properties["value"]) });
        const { base, signed, heximal, exp } = parseUintLiteral(this.properties.value.toFixed(0));
        return new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.properties.value.toFixed(0);
        }
        return this.title;
    }

    onDrawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        this.outputs[0].label = this.properties["value"].toFixed(2);
    }
}

LiteGraph.registerNodeType("influx/int", Int);


class Uint extends LGraphNode implements IGraphASTNode {
    static desc = "Uint";

    private widget: IWidget;

    constructor() {
        super("Uint");
        this.addOutput("value", "uint");
        this.addProperty<Number>("value", 0.0, "number");
        this.widget = this.addWidget("number", "value", 0, "value");
        this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
        this.size = [180, 30];
    }

    evaluate(context: Context, program: ProgramScope): IExprInstruction {
        let sourceNode = null as IParseNode;
        let scope = program.currentScope;
        let { base, signed, heximal, exp } = parseUintLiteral(this.properties.value.toFixed(0));
        signed = false; // force "unsigned"
        return new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
    }

    getTitle(): string {
        if (this.flags.collapsed) {
            return this.properties.value.toFixed(0);
        }
        return this.title;
    }

    onDrawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        this.outputs[0].label = this.properties["value"].toFixed(2);
    }
}

LiteGraph.registerNodeType("influx/uint", Uint);
