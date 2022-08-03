import { IfStmtInstruction } from "@lib/fx/analisys/instructions/IfStmtInstruction";
import { StmtBlockInstruction } from "@lib/fx/analisys/instructions/StmtBlockInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";


import { CodeEmitterNode, GraphContext, LGraphNodeFactory } from "./GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "Action"; // "If";
    const name = "Action"; // "If";

    class If extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addInput("cond", "bool");
            this.addInput("context", LiteGraph.ACTION);
            this.addOutput("true", LiteGraph.EVENT);
            this.addOutput("false", LiteGraph.EVENT);
        }

        override compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
            const deps = super.compute(context, program);

            const scope = program.currentScope;
            const cond = this.getInputNode('cond')?.exec(context, program, this.link('cond')) || 
                this.exec(context, program, 0)/* false */;
            const conseqStmts = this.getOutputNodes('true')?.map(node => node.compute(context, program)).flat();
            const conseq = conseqStmts ? new StmtBlockInstruction({ scope, stmtList: conseqStmts }) : null;
            const contraryStmts = this.getOutputNodes('false')?.map(node => node.compute(context, program)).flat();
            const contrary = contraryStmts ? new StmtBlockInstruction({ scope, stmtList: contraryStmts }) : null;
    
            return [ ...deps, new IfStmtInstruction({ scope, cond, conseq, contrary }) ];
        }
    }

    return { [`fx/${desc}`]: If };
}


export default producer;

