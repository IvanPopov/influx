import { IAFXFunctionDeclInstruction, IAFXPassInstruction, EFunctionType, IAFXVariableDeclInstruction, EAFXInstructionTypes, IAFXTypeInstruction } from "../../idl/IAFXInstruction";
import { ERenderStateValues } from "../../idl/ERenderStateValues";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { DeclInstruction } from "./DeclInstruction";
import { isNull } from "../../common";
import { ERenderStates } from "../../idl/ERenderStates";

interface IEvaluateOutput {
	"fragment": IAFXFunctionDeclInstruction;
	"vertex": IAFXFunctionDeclInstruction;
};

interface IPassFunction {
	(engine: any, foreigtn: any, uniforms: any, states: IMap<ERenderStateValues>, shaderMap: IMap<IAFXFunctionDeclInstruction>, out: IEvaluateOutput): void;
}

export class PassInstruction extends DeclInstruction implements IAFXPassInstruction {
	private _pTempNodeList: IParseNode[] = null;
	private _pTempFoundedFuncList: IAFXFunctionDeclInstruction[] = null;
	private _pTempFoundedFuncTypeList: EFunctionType[] = null;
	private _pParseNode: IParseNode = null;

	private _sFunctionCode: string = "";

	private _pShadersMap: IMap<IAFXFunctionDeclInstruction> = null;
	private _pPassStateMap: IMap<ERenderStateValues> = null;

	private _bIsComlexPass: boolean = false;
	private _fnPassFunction: IPassFunction = null;

	private _pVertexShader: IAFXFunctionDeclInstruction = null;
	private _pPixelShader: IAFXFunctionDeclInstruction = null;

	private _pSharedVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
	private _pGlobalVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
	private _pUniformVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
	private _pForeignVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
	private _pTextureVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
	private _pUsedComplexTypeMapV: IMap<IAFXTypeInstruction> = null;

	private _pSharedVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
	private _pGlobalVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
	private _pUniformVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
	private _pForeignVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
	private _pTextureVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
	private _pUsedComplexTypeMapP: IMap<IAFXTypeInstruction> = null;

	private _pFullUniformVariableMap: IMap<IAFXVariableDeclInstruction> = null;
	private _pFullForeignVariableMap: IMap<IAFXVariableDeclInstruction> = null;
	private _pFullTextureVariableMap: IMap<IAFXVariableDeclInstruction> = null;

	private _pOwnUsedForeignVariableMap: IMap<IAFXVariableDeclInstruction> = null;

	private _pComplexPassEvaluateOutput: IEvaluateOutput = { "fragment": null, "vertex": null };

	constructor() {
		super();
		this._pInstructionList = null;
		this._eInstructionType = EAFXInstructionTypes.k_PassInstruction;
	}

	_addFoundFunction(pNode: IParseNode, pShader: IAFXFunctionDeclInstruction, eType: EFunctionType): void {
		if (isNull(this._pTempNodeList)) {
			this._pTempNodeList = [];
			this._pTempFoundedFuncList = [];
			this._pTempFoundedFuncTypeList = [];
		}

		this._pTempNodeList.push(pNode);
		this._pTempFoundedFuncList.push(pShader);
		this._pTempFoundedFuncTypeList.push(eType);
	}

	_getFoundedFunction(pNode: IParseNode): IAFXFunctionDeclInstruction {
		if (isNull(this._pTempNodeList)) {
			return null;
		}

		for (var i: number = 0; i < this._pTempNodeList.length; i++) {
			if (this._pTempNodeList[i] === pNode) {
				return this._pTempFoundedFuncList[i];
			}
		}

		return null;
	}

	_getFoundedFunctionType(pNode: IParseNode): EFunctionType {
		if (isNull(this._pTempNodeList)) {
			return null;
		}

		for (var i: number = 0; i < this._pTempNodeList.length; i++) {
			if (this._pTempNodeList[i] === pNode) {
				return this._pTempFoundedFuncTypeList[i];
			}
		}

		return null;
	}

	_setParseNode(pNode: IParseNode): void {
		this._pParseNode = pNode;
	}

	_getParseNode(): IParseNode {
		return this._pParseNode;
	}

	_addCodeFragment(sCode: string): void {
		if (this._isComplexPass()) {
			this._sFunctionCode += sCode;
		}
	}

	_markAsComplex(isComplex: boolean): void {
		this._bIsComlexPass = isComplex;
	}

	_getSharedVariableMapV(): IMap<IAFXVariableDeclInstruction> {
		return this._pSharedVariableMapV;
	}

	_getGlobalVariableMapV(): IMap<IAFXVariableDeclInstruction> {
		return this._pGlobalVariableMapV;
	}

	_getUniformVariableMapV(): IMap<IAFXVariableDeclInstruction> {
		return this._pUniformVariableMapV;
	}

	_getForeignVariableMapV(): IMap<IAFXVariableDeclInstruction> {
		return this._pForeignVariableMapV;
	}

	_getTextureVariableMapV(): IMap<IAFXVariableDeclInstruction> {
		return this._pTextureVariableMapV;
	}

	_getUsedComplexTypeMapV(): IMap<IAFXTypeInstruction> {
		return this._pUsedComplexTypeMapV;
	}

	_getSharedVariableMapP(): IMap<IAFXVariableDeclInstruction> {
		return this._pSharedVariableMapP;
	}

	_getGlobalVariableMapP(): IMap<IAFXVariableDeclInstruction> {
		return this._pGlobalVariableMapP;
	}

	_getUniformVariableMapP(): IMap<IAFXVariableDeclInstruction> {
		return this._pUniformVariableMapP;
	}

	_getForeignVariableMapP(): IMap<IAFXVariableDeclInstruction> {
		return this._pForeignVariableMapP;
	}

	_getTextureVariableMapP(): IMap<IAFXVariableDeclInstruction> {
		return this._pTextureVariableMapP;
	}

	_getUsedComplexTypeMapP(): IMap<IAFXTypeInstruction> {
		return this._pUsedComplexTypeMapP;
	}

	_getFullUniformMap(): IMap<IAFXVariableDeclInstruction> {
		return this._pFullUniformVariableMap;
	}

	_getFullForeignMap(): IMap<IAFXVariableDeclInstruction> {
		return this._pFullForeignVariableMap;
	}

	_getFullTextureMap(): IMap<IAFXVariableDeclInstruction> {
		return this._pFullTextureVariableMap;
	}

	_isComplexPass(): boolean {
		return this._bIsComlexPass;
	}

	_getVertexShader(): IAFXFunctionDeclInstruction {
		return this._pVertexShader;
	}

	_getPixelShader(): IAFXFunctionDeclInstruction {
		return this._pPixelShader;
	}

	_addOwnUsedForignVariable(pVarDecl: IAFXVariableDeclInstruction): void {
		if (isNull(this._pOwnUsedForeignVariableMap)) {
			this._pOwnUsedForeignVariableMap = {};
		}

		this._pOwnUsedForeignVariableMap[pVarDecl._getInstructionID()] = pVarDecl;
	}

	_addShader(pShader: IAFXFunctionDeclInstruction): void {
		var isVertex: boolean = pShader._getFunctionType() === EFunctionType.k_Vertex;

		if (this._isComplexPass()) {
			if (isNull(this._pShadersMap)) {
				this._pShadersMap = <IMap<IAFXFunctionDeclInstruction>>{};
			}
			var iShader: number = pShader._getInstructionID();
			this._pShadersMap[iShader] = pShader;

			var sCode: string = isVertex ? "out.vertex=" : "out.fragment=";
			sCode += "shaderMap[" + iShader.toString() + "];"
			this._addCodeFragment(sCode);
		}
		else {
			if (isVertex) {
				this._pVertexShader = pShader;
			}
			else {
				this._pPixelShader = pShader;
			}
		}
	}

	_setState(eType: ERenderStates, eValue: ERenderStateValues): void {
		// if (isNull(this._pPassStateMap)) {
		// 	this._pPassStateMap = render.createRenderStateMap();
		// }

		if (this._isComplexPass()) {
			this._addCodeFragment("states[" + eType + "]=" + eValue + ";");
		}
		// else {
		// 	this._pPassStateMap[eType] = eValue;
		// }
	}

	_finalizePass(): void {
		if (this._isComplexPass()) {
			this._fnPassFunction = <any>(new Function("engine", "foreigns", "uniforms", "states", "shaderMap", "out", this._sFunctionCode));
		}

		this.generateInfoAboutUsedVaraibles();

		this._pTempNodeList = null;
		this._pTempFoundedFuncList = null;
		this._pTempFoundedFuncTypeList = null;
		this._pParseNode = null;
		this._sFunctionCode = "";
	}

	_evaluate(pEngineStates: any, pForeigns: any, pUniforms: any): boolean {
		if (this._isComplexPass()) {
			this._pComplexPassEvaluateOutput.fragment = null;
			this._pComplexPassEvaluateOutput.vertex = null;
			// this.clearPassStates();

			this._fnPassFunction(pEngineStates, pForeigns, pUniforms, this._pPassStateMap, this._pShadersMap, this._pComplexPassEvaluateOutput);

			this._pVertexShader = this._pComplexPassEvaluateOutput.vertex;
			this._pPixelShader = this._pComplexPassEvaluateOutput.fragment;
		}

		return true;
	}

	_getState(eType: ERenderStates): ERenderStateValues {
		return !isNull(this._pPassStateMap) ? this._pPassStateMap[eType] : ERenderStateValues.UNDEF;
	}

	_getRenderStates(): IMap<ERenderStateValues> {
		return this._pPassStateMap;
	}

	// private clearPassStates(): void {
	// 	if (!isNull(this._pPassStateMap)) {
	// 		render.clearRenderStateMap(this._pPassStateMap);
	// 	}
	// }

	private generateInfoAboutUsedVaraibles(): void {
		if (isNull(this._pSharedVariableMapV)) {
			this._pSharedVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
			this._pGlobalVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
			this._pUniformVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
			this._pForeignVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
			this._pTextureVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
			this._pUsedComplexTypeMapV = <IMap<IAFXTypeInstruction>>{};

			this._pSharedVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
			this._pGlobalVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
			this._pUniformVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
			this._pForeignVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
			this._pTextureVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
			this._pUsedComplexTypeMapP = <IMap<IAFXTypeInstruction>>{};

			this._pFullUniformVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
			this._pFullForeignVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
			this._pFullTextureVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
		}

		if (this._isComplexPass()) {
			for (var i in this._pShadersMap) {
				this.addInfoAbouUsedVariablesFromFunction(this._pShadersMap[i]);
			}
		}
		else {
			if (!isNull(this._pVertexShader)) {
				this.addInfoAbouUsedVariablesFromFunction(this._pVertexShader);
			}
			if (!isNull(this._pPixelShader)) {
				this.addInfoAbouUsedVariablesFromFunction(this._pPixelShader);
			}
		}

		if (!isNull(this._pOwnUsedForeignVariableMap)) {
			for (var i in this._pOwnUsedForeignVariableMap) {
				this._pFullForeignVariableMap[i] = this._pOwnUsedForeignVariableMap[i];
				if (this._pOwnUsedForeignVariableMap[i]._hasConstantInitializer()) {
					this._pOwnUsedForeignVariableMap[i]._prepareDefaultValue();
				}
			}
		}
	}

	private addInfoAbouUsedVariablesFromFunction(pFunction: IAFXFunctionDeclInstruction): void {
		var pSharedVars: IMap<IAFXVariableDeclInstruction> = pFunction._getSharedVariableMap();
		var pGlobalVars: IMap<IAFXVariableDeclInstruction> = pFunction._getGlobalVariableMap();
		var pUniformVars: IMap<IAFXVariableDeclInstruction> = pFunction._getUniformVariableMap();
		var pForeignVars: IMap<IAFXVariableDeclInstruction> = pFunction._getForeignVariableMap();
		var pTextureVars: IMap<IAFXVariableDeclInstruction> = pFunction._getTextureVariableMap();
		var pTypes: IMap<IAFXTypeInstruction> = pFunction._getUsedComplexTypeMap();


		var pSharedVarsTo: IMap<IAFXVariableDeclInstruction> = null;
		var pGlobalVarsTo: IMap<IAFXVariableDeclInstruction> = null;
		var pUniformVarsTo: IMap<IAFXVariableDeclInstruction> = null;
		var pForeignVarsTo: IMap<IAFXVariableDeclInstruction> = null;
		var pTextureVarsTo: IMap<IAFXVariableDeclInstruction> = null;
		var pTypesTo: IMap<IAFXTypeInstruction> = null;

		if (pFunction._getFunctionType() === EFunctionType.k_Vertex) {
			pSharedVarsTo = this._pSharedVariableMapV;
			pGlobalVarsTo = this._pGlobalVariableMapV;
			pUniformVarsTo = this._pUniformVariableMapV;
			pForeignVarsTo = this._pForeignVariableMapV;
			pTextureVarsTo = this._pTextureVariableMapV;
			pTypesTo = this._pUsedComplexTypeMapV;
		}
		else {
			pSharedVarsTo = this._pSharedVariableMapP;
			pGlobalVarsTo = this._pGlobalVariableMapP;
			pUniformVarsTo = this._pUniformVariableMapP;
			pForeignVarsTo = this._pForeignVariableMapP;
			pTextureVarsTo = this._pTextureVariableMapP;
			pTypesTo = this._pUsedComplexTypeMapP;
		}

		for (var i in pSharedVars) {
			if (!isNull(pSharedVars[i]) && !pSharedVars[i]._isField()) {
				pSharedVarsTo[i] = pSharedVars[i];
			}
		}
		for (var i in pGlobalVars) {
			if (!isNull(pGlobalVars[i])) {
				pGlobalVarsTo[i] = pGlobalVars[i];
			}
		}
		for (var i in pUniformVars) {
			if (!isNull(pUniformVars[i])) {
				pUniformVarsTo[i] = pUniformVars[i];
				this._pFullUniformVariableMap[i] = pUniformVars[i];
			}
		}
		for (var i in pForeignVars) {
			if (!isNull(pForeignVars[i])) {
				pForeignVarsTo[i] = pForeignVars[i];
				this._pFullForeignVariableMap[i] = pForeignVars[i];
			}
		}
		for (var i in pTextureVars) {
			if (!isNull(pTextureVars[i])) {
				pTextureVarsTo[i] = pTextureVars[i];
				this._pFullTextureVariableMap[i] = pTextureVars[i];
			}
		}
		for (var i in pTypes) {
			if (!isNull(pTypes[i])) {
				pTypesTo[i] = pTypes[i];
			}
		}
	}

	static POST_EFFECT_SEMANTIC = "POST_EFFECT";
}

