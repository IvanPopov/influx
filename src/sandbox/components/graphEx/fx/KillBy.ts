import { IfStmtInstruction } from "@lib/fx/analisys/instructions/IfStmtInstruction";
import { StmtBlockInstruction } from "@lib/fx/analisys/instructions/StmtBlockInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";


import { AST, CodeEmitterNode, GraphContext, LGraphNodeFactory } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory {
    const desc = "Kill By";
    const name = "Kill By";

    const HIDDEN_CONNECTION = { visible: false };

    class KillBy extends CodeEmitterNode {
        static desc = desc;
        static color = 'transparent';
        static can_be_dropped = true; 
        static collapsable = false;

        constructor() {
            super(name);
            this.addInput("cond", "bool", { pos: [13, -13], label: "" });
            this.addInput("context", LiteGraph.ACTION, HIDDEN_CONNECTION);
            this.size = [100, 0];
        }

        onDrawTitleBox(ctx, titleHeight, size, scale) {
            // skip render of title pin
        }
        
        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            const deps = super.compute(context, program);
            const ast = AST(context, program);
            const scope = program.currentScope;
            const cond = this.getInputNode('cond')?.exec(context, program, this.getOriginalSlot('cond')) ||
                this.exec(context, program, 0)/* false */;
            const conseqStmts = [ ast.return(ast.bool(false)) ];
            const conseq = conseqStmts ? new StmtBlockInstruction({ scope, stmtList: conseqStmts }) : null;

            return [...deps, new IfStmtInstruction({ scope, cond, conseq })];
        }
    }

    return { [`fx/${desc}`]: KillBy };
}


export default producer;

