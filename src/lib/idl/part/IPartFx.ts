import { ICompileExprInstruction, IFunctionDeclInstruction, IPassInstruction, IStructDeclInstruction, ITechniqueInstruction, ITypeInstruction, IStmtInstruction, IExprInstruction } from "@lib/idl/IInstruction";

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

    /** check if the pass is ready for runtime */
    isValid(): boolean;
}


 export interface IPartFxInstruction extends ITechniqueInstruction {

    readonly spawnRoutine: ICompileExprInstruction;
    readonly initRoutine: ICompileExprInstruction;
    readonly updateRoutine: ICompileExprInstruction;

    readonly particle: ITypeInstruction;
    readonly capacity: number;

    readonly passList: IPartFxPassInstruction[];

    /** check if the technique is ready for runtime */
    isValid(): boolean;
 }


 export interface ISpawnStmtInstruction extends IStmtInstruction {
    readonly name: string;
    readonly count: IExprInstruction;
    readonly args: IExprInstruction[];
    
    // resolved properties
    readonly fx: IPartFxInstruction;
    readonly init: IFunctionDeclInstruction;
 }

 export interface IDrawStmtInstruction extends IStmtInstruction {
   readonly name: string;

}
