import { IFunctionDeclInstruction, IPassInstruction, EFunctionType, IVariableDeclInstruction, EInstructionTypes, ITypeInstruction } from "../../idl/IInstruction";
import { ERenderStateValues } from "../../idl/ERenderStateValues";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { DeclInstruction } from "./DeclInstruction";
import { isNull } from "../../common";
import { ERenderStates } from "../../idl/ERenderStates";

interface IEvaluateOutput {
    "fragment": IFunctionDeclInstruction;
    "vertex": IFunctionDeclInstruction;
};

interface IPassFunction {
    (engine: any, uniforms: any, states: IMap<ERenderStateValues>, shaderMap: IMap<IFunctionDeclInstruction>, out: IEvaluateOutput): void;
}

export class PassInstruction extends DeclInstruction implements IPassInstruction {
    private _pTempNodeList: IParseNode[] = null;
    private _pTempFoundedFuncList: IFunctionDeclInstruction[] = null;
    private _pTempFoundedFuncTypeList: EFunctionType[] = null;
    private _pParseNode: IParseNode = null;

    private _sFunctionCode: string = "";

    private _pShadersMap: IMap<IFunctionDeclInstruction> = null;
    private _pPassStateMap: IMap<ERenderStateValues> = null;

    private _bIsComlexPass: boolean = false;
    private _fnPassFunction: IPassFunction = null;

    private _pVertexShader: IFunctionDeclInstruction = null;
    private _pPixelShader: IFunctionDeclInstruction = null;

    private _pUniformVariableMapV: IMap<IVariableDeclInstruction> = null;
    private _pTextureVariableMapV: IMap<IVariableDeclInstruction> = null;
    private _pUsedComplexTypeMapV: IMap<ITypeInstruction> = null;

    private _pUniformVariableMapP: IMap<IVariableDeclInstruction> = null;
    private _pTextureVariableMapP: IMap<IVariableDeclInstruction> = null;
    private _pUsedComplexTypeMapP: IMap<ITypeInstruction> = null;

    private _pFullUniformVariableMap: IMap<IVariableDeclInstruction> = null;
    private _pFullTextureVariableMap: IMap<IVariableDeclInstruction> = null;

    private _pComplexPassEvaluateOutput: IEvaluateOutput = { "fragment": null, "vertex": null };

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_PassInstruction);

        this._pTempNodeList = null;
        this._pTempFoundedFuncList = null;
        this._pTempFoundedFuncTypeList = null;
        this._pParseNode = null;

        this._sFunctionCode = "";

        this._pShadersMap = null;
        this._pPassStateMap = null;

        this._bIsComlexPass = false;
        this._fnPassFunction = null;

        this._pVertexShader = null;
        this._pPixelShader = null;

        this._pUniformVariableMapV = null;
        this._pTextureVariableMapV = null;
        this._pUsedComplexTypeMapV = null;

        this._pUniformVariableMapP = null;
        this._pTextureVariableMapP = null;
        this._pUsedComplexTypeMapP = null;

        this._pFullUniformVariableMap = null;
        this._pFullTextureVariableMap = null;

        this._pComplexPassEvaluateOutput = { "fragment": null, "vertex": null };

    }

    addFoundFunction(pNode: IParseNode, pShader: IFunctionDeclInstruction, eType: EFunctionType): void {
        if (isNull(this._pTempNodeList)) {
            this._pTempNodeList = [];
            this._pTempFoundedFuncList = [];
            this._pTempFoundedFuncTypeList = [];
        }

        this._pTempNodeList.push(pNode);
        this._pTempFoundedFuncList.push(pShader);
        this._pTempFoundedFuncTypeList.push(eType);
    }

    getFoundedFunction(pNode: IParseNode): IFunctionDeclInstruction {
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
        if (this.complexPass) {
            this._sFunctionCode += sCode;
        }
    }

    set complexPass(isComplex: boolean) {
        this._bIsComlexPass = isComplex;
    }

    get uniformVariableMapV(): IMap<IVariableDeclInstruction> {
        return this._pUniformVariableMapV;
    }

    get textureVariableMapV(): IMap<IVariableDeclInstruction> {
        return this._pTextureVariableMapV;
    }

    get usedComplexTypeMapV(): IMap<ITypeInstruction> {
        return this._pUsedComplexTypeMapV;
    }

    get uniformVariableMapP(): IMap<IVariableDeclInstruction> {
        return this._pUniformVariableMapP;
    }

    get textureVariableMapP(): IMap<IVariableDeclInstruction> {
        return this._pTextureVariableMapP;
    }

    get usedComplexTypeMapP(): IMap<ITypeInstruction> {
        return this._pUsedComplexTypeMapP;
    }

    get fullUniformMap(): IMap<IVariableDeclInstruction> {
        return this._pFullUniformVariableMap;
    }

    get fullTextureMap(): IMap<IVariableDeclInstruction> {
        return this._pFullTextureVariableMap;
    }

    get complexPass(): boolean {
        return this._bIsComlexPass;
    }

    get vertexShader(): IFunctionDeclInstruction {
        return this._pVertexShader;
    }

    get pixelShader(): IFunctionDeclInstruction {
        return this._pPixelShader;
    }

    addShader(pShader: IFunctionDeclInstruction): void {
        var isVertex: boolean = pShader.functionType === EFunctionType.k_Vertex;

        if (this.complexPass) {
            if (isNull(this._pShadersMap)) {
                this._pShadersMap = <IMap<IFunctionDeclInstruction>>{};
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

        if (this.complexPass) {
            this.addCodeFragment("states[" + eType + "]=" + eValue + ";");
        }
        // else {
        // 	this._pPassStateMap[eType] = eValue;
        // }
    }

    finalizePass(): void {
        if (this.complexPass) {
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
        if (this.complexPass) {
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
            this._pUniformVariableMapV = <IMap<IVariableDeclInstruction>>{};
            this._pTextureVariableMapV = <IMap<IVariableDeclInstruction>>{};
            this._pUsedComplexTypeMapV = <IMap<ITypeInstruction>>{};

            this._pUniformVariableMapP = <IMap<IVariableDeclInstruction>>{};
            this._pTextureVariableMapP = <IMap<IVariableDeclInstruction>>{};
            this._pUsedComplexTypeMapP = <IMap<ITypeInstruction>>{};

            this._pFullUniformVariableMap = <IMap<IVariableDeclInstruction>>{};
            this._pFullTextureVariableMap = <IMap<IVariableDeclInstruction>>{};
        }

        if (this.complexPass) {
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

    private addInfoAbouUsedVariablesFromFunction(pFunction: IFunctionDeclInstruction): void {
        var pUniformVars: IMap<IVariableDeclInstruction> = pFunction.uniformVariableMap;
        var pTextureVars: IMap<IVariableDeclInstruction> = pFunction.textureVariableMap;
        var pTypes: IMap<ITypeInstruction> = pFunction.usedComplexTypeMap;


        var pSharedVarsTo: IMap<IVariableDeclInstruction> = null;
        var pGlobalVarsTo: IMap<IVariableDeclInstruction> = null;
        var pUniformVarsTo: IMap<IVariableDeclInstruction> = null;
        var pForeignVarsTo: IMap<IVariableDeclInstruction> = null;
        var pTextureVarsTo: IMap<IVariableDeclInstruction> = null;
        var pTypesTo: IMap<ITypeInstruction> = null;

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

