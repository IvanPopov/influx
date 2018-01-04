import { IMap } from "./IMap";
import { IAFXSamplerState } from "./IAFXSamplerState";
import { IAFXVariableDeclInstruction } from "./IAFXInstruction";
import { IAFXComponentPassInputBlend } from "./IAFXComponentBlend";
import { ERenderStates } from "./ERenderStates";
import { ERenderStateValues } from "./ERenderStateValues";
import { EAFXShaderVariableType } from "./IAFXVariableContainer";

export interface IAFXPassInputStateInfo {
	uniformKey: number;
	foreignKey: number;
	samplerKey: number;
	renderStatesKey: number;
};

export interface IAFXPassInputBlend {
	samplers: IMap<IAFXSamplerState>;
	samplerArrays: IMap<IAFXSamplerState[]>;
	samplerArrayLength: IMap<number>;

	uniforms: any; /* all uniforms without samlers */
	foreigns: any;
	textures: any;

	samplerKeys: number[];
	samplerArrayKeys: number[];

	uniformKeys: number[];
	foreignKeys: number[];
	textureKeys: number[];

	// renderStates: IMap<ERenderStateValues>;

	getStatesInfo(): IAFXPassInputStateInfo;

	hasUniform(sName: string): boolean;
	hasTexture(sName: string): boolean;
	hasForeign(sName: string): boolean;

	setUniform(sName: string, pValue: any): void;
	setTexture(sName: string, pValue: any): void;
	setForeign(sName: string, pValue: any): void;

	setSampler(sName: string, pState: IAFXSamplerState): void;
	setSamplerArray(sName: string, pSamplerArray: IAFXSamplerState[]): void;

	setSamplerTexture(sName: string, sTexture: string): void;
	// setSamplerTexture(sName: string, pTexture: ITexture): void;

	setStruct(sName: string, pValue: any): void;

	// setSurfaceMaterial(pMaterial: ISurfaceMaterial): void;

	setRenderState(eState: ERenderStates, eValue: ERenderStateValues): void;

	_getForeignVarNameIndex(sName: string): number;
	_getForeignVarNameByIndex(iNameIndex: number): string;

	_getUniformVarNameIndex(sName: string): number;
	_getUniformVarNameByIndex(iNameIndex: number): string;

	_getUniformVar(iNameIndex: number): IAFXVariableDeclInstruction;
	_getUniformLength(iNameIndex: number): number;
	_getUniformType(iNameIndex: number): EAFXShaderVariableType;

	_getSamplerState(iNameIndex: number): IAFXSamplerState;
	// _getSamplerTexture(iNameIndex: number): ITexture;

	// _getTextureForSamplerState(pSamplerState: IAFXSamplerState): ITexture;


	_release(): void;

	_isFromSameBlend(pInput: IAFXPassInputBlend): boolean;
	_getBlend(): IAFXComponentPassInputBlend;
	_copyFrom(pInput: IAFXPassInputBlend): void;

	_copyUniformsFromInput(pInput: IAFXPassInputBlend): void;
	_copySamplersFromInput(pInput: IAFXPassInputBlend): void;
	_copyForeignsFromInput(pInput: IAFXPassInputBlend): void;
	_copyRenderStatesFromInput(pInput: IAFXPassInputBlend): void;

	_getLastPassBlendId(): number;
	_getLastShaderId(): number;
	_setPassBlendId(id: number): void;
	_setShaderId(id: number): void;
}
