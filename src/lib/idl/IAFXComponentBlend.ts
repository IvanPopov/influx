import { IMap } from "./IMap";
import { IAFXComponent, EPassTypes } from "./IAFXComponent";
import { IAFXVariableContainer } from "./IAFXVariableContainer";
import { IAFXPassInstruction } from "./IAFXInstruction";
import { IAFXPassInputBlend } from "./IAFXPassInputBlend";

export interface IAFXComponentInfo {
	component: IAFXComponent;
	shift: number;
	pass: number;
	hash: string;
}


export interface IAFXComponentPassInputBlend {
	getUniforms(): IAFXVariableContainer;
	getTextures(): IAFXVariableContainer;
	getForeigns(): IAFXVariableContainer;

	addDataFromPass(pPass: IAFXPassInstruction): void;
	finalizeInput(): void;

	getPassInput(): IAFXPassInputBlend;
	releasePassInput(pPassInput: IAFXPassInputBlend): void;
}

export interface IAFXComponentBlend {
	isReadyToUse(): boolean;
	isEmpty(): boolean;

	getComponentCount(): number;
	getTotalPasses(): number;
	getHash(): string;

	_getMinShift(): number;
	_getMaxShift(): number;

	hasPostEffect(): boolean;
	getPassTypes(): EPassTypes[];
	//getPostEffectStartPass(): number;

	containComponent(pComponent: IAFXComponent, iShift: number, iPass: number);
	containComponentHash(sComponentHash: string): boolean;

	findAnyAddedComponentInfo(pComponent: IAFXComponent, iShift: number, iPass: number): IAFXComponentInfo;

	addComponent(pComponent: IAFXComponent, iShift: number, iPass: number): void;
	removeComponent(pComponent: IAFXComponent, iShift: number, iPass: number): void;

	finalizeBlend(): boolean;

	getPassInputForPass(iPass: number): IAFXPassInputBlend;
	getPassListAtPass(iPass: number): IAFXPassInstruction[];

	clone(): IAFXComponentBlend;

	_getComponentInfoList(): IAFXComponentInfo[];

	_setDataForClone(pAddedComponentInfoList: IAFXComponentInfo[],
		pComponentHashMap: IMap<boolean>,
		nShiftMin: number, nShiftMax: number): void;
}
