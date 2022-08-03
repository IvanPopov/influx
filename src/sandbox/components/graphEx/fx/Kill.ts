import { Context } from "@lib/fx/analisys/Analyzer";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { ReturnStmtInstruction } from "@lib/fx/analisys/instructions/ReturnStmtInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IStmtInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { LiteGraph } from "litegraph.js";


import { CodeEmitterNode, LGraphNodeFactory, AST } from "../GraphNode";


function producer(env: () => ISLDocument): LGraphNodeFactory
{
    const desc = "Kill";
    const name = "Kill";

    class Kill extends CodeEmitterNode {
        static desc = desc;

        constructor() {
            super(name);
            this.addInput("context", LiteGraph.ACTION);
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

