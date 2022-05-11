import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";

import { LGraphNode } from "litegraph.js";


export interface IGraphASTNode extends LGraphNode
{
    evaluate(context: Context, program: ProgramScope): IInstruction;
}

export interface IGraphASTFinalNode extends LGraphNode
{
    evaluate(document: ISLDocument): Promise<ISLDocument>;
}
