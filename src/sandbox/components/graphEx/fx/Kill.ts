import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";


import { AST, CodeEmitterNode, LGraphNodeFactory } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "Kill";
    const name = "Kill";

    const HIDDEN_CONNECTION = { visible: false };

    class Kill extends CodeEmitterNode {
        static desc = desc;

        static color = 'transparent';
        // static bgcolor = 'transparent';

        static can_be_dropped = true;

        constructor() {
            super(name);
            this.addInput("context", LiteGraph.ACTION, HIDDEN_CONNECTION);
            this.size = [100, 0];
        }

        override compute(context: Context, program: ProgramScope): IStmtInstruction[] {
            const scope = program.currentScope;
            const ast = AST(context, program);
            return [ ast.return(ast.bool(false)) ];
        }
    }

    return { [`fx/${desc}`]: Kill };
}


export default producer;

