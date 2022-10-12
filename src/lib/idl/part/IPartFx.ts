import { ICompileExprInstruction, IExprInstruction, IPassInstruction, IStmtInstruction, ITechniqueInstruction, ITypeInstruction } from "@lib/idl/IInstruction";

// import { EPartFxInstructionTypes } from "./IPartFxInstruction";

export enum EPassDrawMode {
   k_Auto,
   k_Manual
};


export interface IPartFxPassInstruction extends IPassInstruction {
    readonly sorting: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;
    readonly particleInstance: ITypeInstruction;
    readonly geometry: string;
    readonly instanceCount: number;
    readonly drawMode: EPassDrawMode;
}


 export interface IPartFxInstruction extends ITechniqueInstruction {

    readonly spawnRoutine: ICompileExprInstruction;
    readonly initRoutine: ICompileExprInstruction;
    readonly updateRoutine: ICompileExprInstruction;

    readonly particle: ITypeInstruction;
    readonly capacity: number;

    readonly passList: IPartFxPassInstruction[];
 }


 export interface ISpawnStmtInstruction extends IStmtInstruction {
    readonly name: string;
    readonly count: IExprInstruction;
    readonly args: IExprInstruction[];
    
    // resolved properties
   //  readonly fx: IPartFxInstruction;
   //  readonly init: IFunctionDeclInstruction;
 }

 export interface IDrawStmtInstruction extends IStmtInstruction {
   readonly name: string;
   readonly args: IExprInstruction[];
}
