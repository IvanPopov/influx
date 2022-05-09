import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IInstruction } from "@lib/idl/IInstruction";

import { LGraphNode } from "litegraph.js";


export interface IGraphASTNode extends LGraphNode
{
    evaluate(context: Context, program: ProgramScope): IInstruction;
}
