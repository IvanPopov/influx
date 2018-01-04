import { IAFXComponent } from "./IAFXComponent";

export interface IEffect {
	getTotalComponents(): number;
	getTotalPasses(): number;

	isEqual(pEffect: IEffect): boolean;
	isReplicated(): boolean;
	isMixid(): boolean;
	isParameterUsed(pParam: any, iPass?: number): boolean;

	replicable(bValue: boolean): void;
	miscible(bValue: boolean): void;

	addComponent(iComponentHandle: number, iShift?: number, iPass?: number): boolean;
	addComponent(pComponent: IAFXComponent, iShift?: number, iPass?: number): boolean;
	addComponent(sComponent: string, iShift?: number, iPass?: number): boolean;

	delComponent(iComponentHandle: number, iShift?: number, iPass?: number): boolean;
	delComponent(sComponent: string, iShift?: number, iPass?: number): boolean;
	delComponent(pComponent: IAFXComponent, iShift?: number, iPass?: number): boolean;

	hasComponent(sComponent: string, iShift?: number, iPass?: number): boolean;

	activate(iShift?: number): boolean;
	deactivate(): boolean;

	findParameter(pParam: any, iPass?: number): any;
}

