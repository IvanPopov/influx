import { IAFXVariableDeclInstruction, IAFXTypeDeclInstruction, IAFXFunctionDeclInstruction } from "./IAFXInstruction";
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

	variableMap: IMap<IAFXVariableDeclInstruction>;
	typeMap: IMap<IAFXTypeDeclInstruction>;
	functionMap: IMap<IAFXFunctionDeclInstruction[]>;
}

/** @deprecated Use IMap<IScope> instead. */
export interface IScopeMap {
	[scopeIndex: string]: IScope;
}

