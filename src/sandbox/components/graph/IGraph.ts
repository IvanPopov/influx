import { Context } from "@lib/fx/analisys/Analyzer";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { graphProvideNodeDocs } from "@sandbox/actions";
import { LGraphNode } from "litegraph.js";

export interface IGraphASTNode extends LGraphNode
{
    evaluate(context: Context, program: ProgramScope, slot: number): IInstruction;
}

export interface IGraphASTFinalNode extends LGraphNode
{
    // note: async method!
    evaluate(document: ISLDocument): Promise<ISLDocument>;
    // getDocs?(): string;
}

export interface INodeDocs
{
    name: string;
    desc?: string;
    title?: string;
    params?: any;
}

export class LGraphNodeEx extends LGraphNode
{
    // docs provided outside from autogenDocumentation() method;
    static nodesDocs: IMap<INodeDocs> = {};

    link(inputSlot: number): number 
    {
        const ii = this.getInputInfo(inputSlot);
        if (!ii) return -1;
        const link = ii.link;
        if (!link) return -1;
        return this.graph.links[link].origin_slot;
    }

    getDocs(): string 
    {
        return LGraphNodeEx.nodesDocs[this.title]?.desc || "[no description found]";
    }

    onSelected(): void 
    {
        const docs = this.getDocs();
        if (docs)
        {
            graphProvideNodeDocs(this.getDocs());
        }
    }

    onDeselected(): void 
    {
        const docs = this.getDocs();
        if (docs)
        {
            graphProvideNodeDocs(null);
        }
    }

    getTitle(): string {
        const titleEx = LGraphNodeEx.nodesDocs[this.title];
        return titleEx?.title || this.title;
    }
}
