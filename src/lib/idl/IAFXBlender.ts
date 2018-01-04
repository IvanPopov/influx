import { IAFXComponentBlend } from "./IAFXComponentBlend";
import { IAFXComponent } from "./IAFXComponent";
import { IAFXPassInstruction } from "./IAFXInstruction";
import { IAFXPassBlend } from "./IAFXPassBlend";

export interface IAFXBlender {

	//Component and component blend
	addComponentToBlend(pComponentBlend: IAFXComponentBlend,
		pComponent: IAFXComponent, iShift: number, iPass: number): IAFXComponentBlend;

	removeComponentFromBlend(pComponentBlend: IAFXComponentBlend,
		pComponent: IAFXComponent, iShift: number, iPass: number): IAFXComponentBlend;

	addBlendToBlend(pComponentBlend: IAFXComponentBlend,
		pAddBlend: IAFXComponentBlend, iShift: number): IAFXComponentBlend;

	//Pass blend

	generatePassBlend(pPassList: IAFXPassInstruction[],
		pStates: any, pForeigns: any, pUniforms: any): IAFXPassBlend;

	getPassBlendById(id: number): IAFXPassBlend;
}

