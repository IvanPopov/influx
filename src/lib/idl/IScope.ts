import { IVariableDeclInstruction, ITypeDeclInstruction, IFunctionDeclInstruction } from "./IInstruction";
import { IMap } from "./IMap";

export enum EScopeType {
    k_Default,
    k_Struct,
    k_Annotation
}

export interface IScope {
    parent: IScope;
    index: number;
    type: EScopeType;
    isStrictMode: boolean;

    variableMap: IMap<IVariableDeclInstruction>;
    typeMap: IMap<ITypeDeclInstruction>;
    functionMap: IMap<IFunctionDeclInstruction[]>;
}
