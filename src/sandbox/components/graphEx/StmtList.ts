import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";


import { CodeEmitterStmt, GraphContext, LGraphNodeFactory } from "./GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory {
    const desc = "Statements";
    const name = "Statements";

    const HIDDEN_CONNECTION = { visible: false };

    class StmtList extends CodeEmitterStmt {
        static desc = desc;

        static color = 'transparent';
        static bgcolor = 'transparent';

        static can_be_dropped = true;
        static can_accept_drop = true; 
        static collapsable = false;

        constructor() {
            super(name);
            this.addInput("context", LiteGraph.ACTION, HIDDEN_CONNECTION);
            this.addOutput("stmts", LiteGraph.EVENT, HIDDEN_CONNECTION);
            this.update();
        }

        computeSize(): [number, number] {
            return [120, 26];
        }

        onDrawTitleBox(
            ctx, 
            titleHeight, 
            size, 
            scale
        ) {
            // skip render of title pin
        }
        

        onDrawBackground(
            ctx         /* CanvasRenderingContext2D */,
            gcanvas     /* LGraphCanvas */,
            canvas      /* HTMLCanvasElement */,
            mouse
        ) {
            super.onDrawBackground(ctx, gcanvas, canvas, mouse);
    
            if (this.flags.collapsed)
                return;
    
            let [w, h] = this.size;
    
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = this.readyToAccept ? 'orange' : 'rgba(255, 255, 255, 0)';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.shadowColor = "#000";
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 6;
            ctx.roundRect(0, 0, w + 1, h, [0, 0, 5, 5], 5);
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        }


        onDrop(node) {
            this.connect('stmts', node, 'context');
            this.highlight(false);
            this.update();
        }

        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            const deps = super.compute(context, program);
            const scope = program.currentScope;
            const stmts = this.getOutputNodes('stmts')?.map(node => node.compute(context, program)).flat();
            return [...deps, ...stmts];
        }
    }

    return { [`fx/${desc}`]: StmtList };
}


export default producer;

