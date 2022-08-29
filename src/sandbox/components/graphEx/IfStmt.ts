import { IfStmtInstruction } from "@lib/fx/analisys/instructions/IfStmtInstruction";
import { StmtBlockInstruction } from "@lib/fx/analisys/instructions/StmtBlockInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";


import { CodeEmitterStmt, GraphContext, LGraphNodeFactory } from "./GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory {
    const desc = "Action"; // "If";
    const name = "Action"; // "If";

    const HIDDEN_CONNECTION = { visible: false };

    class If extends CodeEmitterStmt {
        static desc = desc;

        // render as fully transparent by default (only with custom design)
        // static title_mode = LiteGraph.TRANSPARENT_TITLE;
        static color = 'transparent';
        static bgcolor = 'transparent';

        static can_be_dropped = true;
        static can_accept_drop = true; 
        static collapsable = false;

        constructor() {
            super(name);
            this.addInput("cond", "bool", { pos: [13, -13], label: "" });
            this.addInput("context", LiteGraph.ACTION, HIDDEN_CONNECTION);
            this.addOutput("true", LiteGraph.EVENT, HIDDEN_CONNECTION);
            this.addOutput("false", LiteGraph.EVENT, HIDDEN_CONNECTION);

            this.update();
        }

        protected dependentNodes() {
            return [...(this.getOutputNodes(0) || []), ...(this.getOutputNodes(1) || [])];
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


        onDropLeave(node) {
            this.highlight(false);

            const graph = this.graph;
            for (let i of [0, 1]) {
                const links = this.outputs[i].links;

                if (links) {
                    // trying to find incoming node within our connections
                    // and disconnect if possible
                    links.forEach(link_id => {
                        let link = graph.links[link_id];
                        let targetNode = graph.getNodeById(link.target_id);
                        if (node == targetNode) {
                            this.disconnectOutput(i, targetNode);
                        }
                    });
                }
            }

            // true is disconnected and false is connected
            const conseq = this.outputs[0].links;
            const contrary = this.outputs[1].links;
            if (!conseq?.length && contrary?.length) {
                // move false to true
                let link = graph.links[contrary[0]];
                let contraryNode = graph.getNodeById(link.target_id);
                this.disconnectOutput(1);
                this.connect(0, contraryNode, 'context');
            }

            this.update();
        }


        onDrop(node) {
            // todo: validate node
            const slotName = this.isOutputConnected(0) 
                ? this.isOutputConnected(1) 
                    ? null 
                    : 'false'
                : 'true';
            if (slotName) {
                this.connect(slotName, node, 'context');
            }
            this.highlight(false);
            this.update();
        }

        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            const deps = super.compute(context, program);

            const scope = program.currentScope;
            const cond = this.getInputNode('cond')?.exec(context, program, this.getOriginalSlot('cond')) ||
                this.exec(context, program, 0)/* false */;
            const conseqStmts = this.getOutputNodes('true')?.map(node => node.compute(context, program)).flat();
            const conseq = conseqStmts ? new StmtBlockInstruction({ scope, stmtList: conseqStmts }) : null;
            const contraryStmts = this.getOutputNodes('false')?.map(node => node.compute(context, program)).flat();
            const contrary = contraryStmts ? new StmtBlockInstruction({ scope, stmtList: contraryStmts }) : null;

            return [...deps, new IfStmtInstruction({ scope, cond, conseq, contrary })];
        }
    }

    return { [`fx/${desc}`]: If };
}


export default producer;

