import { IAFXTechniqueInstruction } from "./IAFXInstruction";

export enum EPassTypes {
	UNDEF,
	DEFAULT,
	POSTEFFECT
};

export interface IAFXComponent {
	getTechnique(): IAFXTechniqueInstruction;
	setTechnique(pTechnique: IAFXTechniqueInstruction): void;

	isPostEffect(): boolean;

	getName(): string;
	getTotalPasses(): number;
	getHash(iShift: number, iPass: number): string;

}

export interface IAFXComponentMap {
	[index: number]: IAFXComponent;
	[index: string]: IAFXComponent;
}

