import { Context } from "@lib/fx/analisys/Analyzer";
import { DeclStmtInstruction } from "@lib/fx/analisys/instructions/DeclStmtInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import { IExprInstruction, IInstruction, IStmtInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { nodesForceRecompile, nodesProvideDocs } from "@sandbox/actions";
import { INodeInputSlot, INodeOutputSlot, LGraphNode, LLink } from "litegraph.js";

export type LGraphNodeFactory = IMap<new () => LGraphNode>;

export interface IGraphASTNode extends LGraphNode
{
    run(context: Context, program: ProgramScope, slot: number): IInstruction;
}

export interface IGraphASTFinalNode extends LGraphNode
{
    // note: async method!
    run(document: ISLDocument): Promise<ISLDocument>;
}

export interface IGraphASTMaterial extends IGraphASTFinalNode
{
    get uid(): number;          // name identifier for PrerenderRoutine<UID>()
    get sorting(): boolean;     // pass options
    get geometry(): string;     // pass options
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


    getTitle(): string {
        const titleEx = LGraphNodeEx.nodesDocs[this.title];
        return titleEx?.title || this.title;
    }


    onSelected(): void 
    {
        const docs = this.getDocs();
        if (docs)
        {
            nodesProvideDocs(docs);
        }
    }


    onDeselected(): void 
    {
        const docs = this.getDocs();
        if (docs)
        {
            nodesProvideDocs(null);
        }
    }


    onPropertyChanged(name: string, value: number, prevValue: number): boolean
    {
        nodesForceRecompile();
        return true;
    }


    emitError(desc?: string)
    {
        if (desc) console.error(desc);
        this.color = 'red';
    }


    emitNoError()
    {
        this.color = null;
    }


    onConnectionsChange(type: number, slotIndex: number, isConnected: boolean, link: LLink, ioSlot: INodeInputSlot | INodeOutputSlot): void {
        this.emitNoError(); // clean up errors on every change
    }
}


export class LGraphNodeAST extends LGraphNodeEx implements IGraphASTNode
{
    run(context: Context, program: ProgramScope, slot: number): IInstruction {
        this.emitNoError();
        return this.evaluate(context, program, slot);
    }

    evaluate(context: Context, program: ProgramScope, slot: number): IInstruction {
        this.emitError('[not implemented]');
        return null;
    }
}
