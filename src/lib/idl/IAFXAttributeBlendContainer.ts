import { IAFXVariableDeclInstruction, IAFXVariableBlendInfo, IAFXVariableTypeInstruction } from "./IAFXInstruction";

export interface IAFXAttributeBlendContainer {
	getAttrsInfo(): IAFXVariableBlendInfo[];

	getTexcoordVar(iSlot: number): IAFXVariableDeclInstruction;
	hasTexcoord(iSlot: number): boolean;
	getSlotBySemanticIndex(iIndex: number): number;
	getBufferSlotBySemanticIndex(iIndex: number): number;
	getOffsetVarsBySemantic(sName: string): IAFXVariableDeclInstruction[];
	getOffsetDefault(sName: string): number;
	getTypeBySemanticIndex(iIndex: number): IAFXVariableTypeInstruction;
}

