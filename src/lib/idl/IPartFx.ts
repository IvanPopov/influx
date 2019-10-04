import { IPassInstruction, IFunctionDeclInstruction, ITechniqueInstruction, ICompileExprInstruction } from "@lib/idl/IInstruction";


export interface IPartFxPassInstruction extends IPassInstruction {
    readonly sorting: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;
    readonly defaultShader: boolean;
}


 export interface IPartFxInstruction extends ITechniqueInstruction {

    readonly spawnRoutine: ICompileExprInstruction;
    readonly initRoutine: ICompileExprInstruction;
    readonly updateRoutine: ICompileExprInstruction;

    readonly passList: IPartFxPassInstruction[];
 }