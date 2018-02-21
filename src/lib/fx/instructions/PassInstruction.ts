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
    (engine: any, uniforms: any, states: IMap<ERenderStateValues>, shaderMap: IMap<IAFXFunctionDeclInstruction>, out: IEvaluateOutput): void;
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

    private _pUniformVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
    private _pTextureVariableMapV: IMap<IAFXVariableDeclInstruction> = null;
    private _pUsedComplexTypeMapV: IMap<IAFXTypeInstruction> = null;

    private _pUniformVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
    private _pTextureVariableMapP: IMap<IAFXVariableDeclInstruction> = null;
    private _pUsedComplexTypeMapP: IMap<IAFXTypeInstruction> = null;

    private _pFullUniformVariableMap: IMap<IAFXVariableDeclInstruction> = null;
    private _pFullTextureVariableMap: IMap<IAFXVariableDeclInstruction> = null;

    private _pComplexPassEvaluateOutput: IEvaluateOutput = { "fragment": null, "vertex": null };

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = null;
        this._eInstructionType = EAFXInstructionTypes.k_PassInstruction;
    }

    addFoundFunction(pNode: IParseNode, pShader: IAFXFunctionDeclInstruction, eType: EFunctionType): void {
        if (isNull(this._pTempNodeList)) {
            this._pTempNodeList = [];
            this._pTempFoundedFuncList = [];
            this._pTempFoundedFuncTypeList = [];
        }

        this._pTempNodeList.push(pNode);
        this._pTempFoundedFuncList.push(pShader);
        this._pTempFoundedFuncTypeList.push(eType);
    }

    getFoundedFunction(pNode: IParseNode): IAFXFunctionDeclInstruction {
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

    getFoundedFunctionType(pNode: IParseNode): EFunctionType {
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

    addCodeFragment(sCode: string): void {
        if (this.isComplexPass()) {
            this._sFunctionCode += sCode;
        }
    }

    markAsComplex(isComplex: boolean): void {
        this._bIsComlexPass = isComplex;
    }

    get uniformVariableMapV(): IMap<IAFXVariableDeclInstruction> {
        return this._pUniformVariableMapV;
    }

    get textureVariableMapV(): IMap<IAFXVariableDeclInstruction> {
        return this._pTextureVariableMapV;
    }

    get usedComplexTypeMapV(): IMap<IAFXTypeInstruction> {
        return this._pUsedComplexTypeMapV;
    }

    get uniformVariableMapP(): IMap<IAFXVariableDeclInstruction> {
        return this._pUniformVariableMapP;
    }

    get textureVariableMapP(): IMap<IAFXVariableDeclInstruction> {
        return this._pTextureVariableMapP;
    }

    get usedComplexTypeMapP(): IMap<IAFXTypeInstruction> {
        return this._pUsedComplexTypeMapP;
    }

    get fullUniformMap(): IMap<IAFXVariableDeclInstruction> {
        return this._pFullUniformVariableMap;
    }

    get fullTextureMap(): IMap<IAFXVariableDeclInstruction> {
        return this._pFullTextureVariableMap;
    }

    isComplexPass(): boolean {
        return this._bIsComlexPass;
    }

    get vertexShader(): IAFXFunctionDeclInstruction {
        return this._pVertexShader;
    }

    get pixelShader(): IAFXFunctionDeclInstruction {
        return this._pPixelShader;
    }

    addShader(pShader: IAFXFunctionDeclInstruction): void {
        var isVertex: boolean = pShader.functionType === EFunctionType.k_Vertex;

        if (this.isComplexPass()) {
            if (isNull(this._pShadersMap)) {
                this._pShadersMap = <IMap<IAFXFunctionDeclInstruction>>{};
            }
            var iShader: number = pShader.instructionID;
            this._pShadersMap[iShader] = pShader;

            var sCode: string = isVertex ? "out.vertex=" : "out.fragment=";
            sCode += "shaderMap[" + iShader.toString() + "];"
            this.addCodeFragment(sCode);
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

    setState(eType: ERenderStates, eValue: ERenderStateValues): void {
        // if (isNull(this._pPassStateMap)) {
        // 	this._pPassStateMap = render.createRenderStateMap();
        // }

        if (this.isComplexPass()) {
            this.addCodeFragment("states[" + eType + "]=" + eValue + ";");
        }
        // else {
        // 	this._pPassStateMap[eType] = eValue;
        // }
    }

    finalizePass(): void {
        if (this.isComplexPass()) {
            this._fnPassFunction = <any>(new Function("engine", "uniforms", "states", "shaderMap", "out", this._sFunctionCode));
        }

        this.generateInfoAboutUsedVaraibles();

        this._pTempNodeList = null;
        this._pTempFoundedFuncList = null;
        this._pTempFoundedFuncTypeList = null;
        this._pParseNode = null;
        this._sFunctionCode = "";
    }

    evaluate(pEngineStates: any, pUniforms: any): boolean {
        if (this.isComplexPass()) {
            this._pComplexPassEvaluateOutput.fragment = null;
            this._pComplexPassEvaluateOutput.vertex = null;
            // this.clearPassStates();

            this._fnPassFunction(pEngineStates, pUniforms, this._pPassStateMap, this._pShadersMap, this._pComplexPassEvaluateOutput);

            this._pVertexShader = this._pComplexPassEvaluateOutput.vertex;
            this._pPixelShader = this._pComplexPassEvaluateOutput.fragment;
        }

        return true;
    }

    getState(eType: ERenderStates): ERenderStateValues {
        return !isNull(this._pPassStateMap) ? this._pPassStateMap[eType] : ERenderStateValues.UNDEF;
    }

    get renderStates(): IMap<ERenderStateValues> {
        return this._pPassStateMap;
    }


    private generateInfoAboutUsedVaraibles(): void {
        {
            this._pUniformVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
            this._pTextureVariableMapV = <IMap<IAFXVariableDeclInstruction>>{};
            this._pUsedComplexTypeMapV = <IMap<IAFXTypeInstruction>>{};

            this._pUniformVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
            this._pTextureVariableMapP = <IMap<IAFXVariableDeclInstruction>>{};
            this._pUsedComplexTypeMapP = <IMap<IAFXTypeInstruction>>{};

            this._pFullUniformVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
            this._pFullTextureVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
        }

        if (this.isComplexPass()) {
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
    }

    private addInfoAbouUsedVariablesFromFunction(pFunction: IAFXFunctionDeclInstruction): void {
        var pUniformVars: IMap<IAFXVariableDeclInstruction> = pFunction.uniformVariableMap;
        var pTextureVars: IMap<IAFXVariableDeclInstruction> = pFunction.textureVariableMap;
        var pTypes: IMap<IAFXTypeInstruction> = pFunction.usedComplexTypeMap;


        var pSharedVarsTo: IMap<IAFXVariableDeclInstruction> = null;
        var pGlobalVarsTo: IMap<IAFXVariableDeclInstruction> = null;
        var pUniformVarsTo: IMap<IAFXVariableDeclInstruction> = null;
        var pForeignVarsTo: IMap<IAFXVariableDeclInstruction> = null;
        var pTextureVarsTo: IMap<IAFXVariableDeclInstruction> = null;
        var pTypesTo: IMap<IAFXTypeInstruction> = null;

        if (pFunction.functionType === EFunctionType.k_Vertex) {
            pUniformVarsTo = this._pUniformVariableMapV;
            pTextureVarsTo = this._pTextureVariableMapV;
            pTypesTo = this._pUsedComplexTypeMapV;
        }
        else {
            pUniformVarsTo = this._pUniformVariableMapP;
            pTextureVarsTo = this._pTextureVariableMapP;
            pTypesTo = this._pUsedComplexTypeMapP;
        }

        for (var i in pUniformVars) {
            if (!isNull(pUniformVars[i])) {
                pUniformVarsTo[i] = pUniformVars[i];
                this._pFullUniformVariableMap[i] = pUniformVars[i];
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
}

