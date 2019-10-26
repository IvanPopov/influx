import { IPassInstruction, IFunctionDeclInstruction, ITechniqueInstruction, ICompileExprInstruction, IStructDeclInstruction, ITypeInstruction } from "@lib/idl/IInstruction";

export enum EPartFxPassGeometry {
    k_Billboard,
    k_Cylinder,
    k_Box,
    k_Sphere,
    k_Line
}

export interface IPartFxPassInstruction extends IPassInstruction {
    readonly sorting: boolean;
    readonly prerenderRoutine: ICompileExprInstruction;
    readonly material: ITypeInstruction;
    readonly geometry: EPartFxPassGeometry;

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