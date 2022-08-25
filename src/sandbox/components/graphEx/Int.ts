import { Context, parseUintLiteral } from "@lib/fx/analisys/Analyzer";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { IParseNode } from "@lib/idl/parser/IParser";
import { IWidget, LGraphCanvas } from "litegraph.js";


import { CodeEmitterNode, LGraphNodeFactory } from "./GraphNode";

// notes:
//  processNodeWidgets handles clicks and events
//  drawNodeWidgets handles drawning

function producer(env: () => ISLDocument): LGraphNodeFactory {
    const nodes = <LGraphNodeFactory>{};
    class Int extends CodeEmitterNode {
        static desc = "Int";

        private widget: IWidget;

        constructor() {
            super("Int");
            this.addOutput("value", "int");
            this.addProperty<Number>("value", 0.0, "number");
            this.widget = this.addWidget("number", "value", 0, "value", { precision: 0, step: 10 });
            this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
            this.size = [150, 30];
        }

        exec(context: Context, program: ProgramScope): IExprInstruction {
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
            return super.getTitle();
        }

        onDrawBackground(ctx: CanvasRenderingContext2D, graphcanvas: LGraphCanvas, canvas, mouse): void {
            super.onDrawBackground(ctx, graphcanvas, canvas, mouse);
            this.outputs[0].label = this.properties["value"].toFixed(2);
        }
    }

    nodes[`constants/int`] = Int;

    class Uint extends CodeEmitterNode {
        static desc = "Uint";

        private widget: IWidget;

        constructor() {
            super("Uint");
            this.addOutput("value", "uint");
            this.addProperty<Number>("value", 0.0, "number");
            this.widget = this.addWidget("number", "value", 0, "value", { precision: 0, step: 10, min: 0 });
            this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
            this.size = [150, 30];
        }

        exec(context: Context, program: ProgramScope): IExprInstruction {
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
            return super.getTitle();
        }

        onDrawBackground(ctx: CanvasRenderingContext2D, graphcanvas: LGraphCanvas, canvas, mouse): void {
            super.onDrawBackground(ctx, graphcanvas, canvas, mouse);
            this.outputs[0].label = this.properties["value"].toFixed(2);
        }
    }

    nodes[`constants/uint`] = Uint;

    class Bool extends CodeEmitterNode {
        static desc = "Bool";

        private widget: IWidget;

        constructor() { 
            super("Bool");
            this.addOutput("value", "bool");
            this.addProperty<boolean>("value", false, "bool");
            this.widget = this.addWidget("toggle", "value", false, "value");
            this.widgets_up = true; // draw number widget in the middle of node (by default it's placed under node)
            this.size = [150, 30];
        }

        exec(context: Context, program: ProgramScope): IExprInstruction {
            let sourceNode = null as IParseNode;
            let scope = program.currentScope;
            let value = this.properties.value;
            return new BoolInstruction({ scope, sourceNode, value });
        }

        getTitle(): string {
            if (this.flags.collapsed) {
                return this.properties.value;
            }
            return super.getTitle();
        }

        onDrawBackground(ctx: CanvasRenderingContext2D, graphcanvas: LGraphCanvas, canvas, mouse): void {
            super.onDrawBackground(ctx, graphcanvas, canvas, mouse);
            this.outputs[0].label = this.properties["value"];
        }
    }

    nodes[`constants/bool`] = Bool;

    return nodes;
}

export default producer;
