import { DeclInstruction } from "./DeclInstruction";
import { IFunctionDefInstruction, IStmtBlockInstruction } from "./../../idl/IInstruction";
import { IFunctionDeclInstruction, EFunctionType, IVariableDeclInstruction, ITypeUseInfoContainer, ITypeDeclInstruction, ISimpleInstruction, EInstructionTypes, ITypeInstruction, IIdInstruction, IVariableTypeInstruction, IDeclInstruction, IStmtInstruction, IInstruction, IInitExprInstruction } from "../../idl/IInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { isNull, isDef, isDefAndNotNull } from "../../common";
import { IdInstruction } from "./IdInstruction";
import { FunctionDefInstruction } from "./FunctionDefInstruction";
import { StmtBlockInstruction } from "./StmtBlockInstruction";
import { EEffectTempErrors } from "../../idl/EEffectErrors";
import { SamplerStateBlockInstruction } from "./SamplerStateBlockInstruction";
import { VariableDeclInstruction } from "./VariableInstruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";
import * as Effect from "../Effect";


/**
 * Represent type func(...args)[:Semantic] [<Annotation> {stmts}]
 * EMPTY_OPERTOR FunctionDefInstruction StmtBlockInstruction
 */
export class FunctionDeclInstruction extends DeclInstruction implements IFunctionDeclInstruction {
    protected _definition: IFunctionDefInstruction;
    protected _implementation: IStmtBlockInstruction;
    protected _functionType: EFunctionType;
    protected _implementationScope: number;

    protected _bUsedAsFunction: boolean;
    protected _bUsedAsVertex: boolean;
    protected _bUsedAsPixel: boolean;
    protected _bCanUsedAsFunction: boolean;
    protected _bUsedInVertex: boolean;
    protected _bUsedInPixel: boolean;

    //Info about used data
    protected _usedFunctionMap: IMap<IFunctionDeclInstruction>;
    protected _attributeVariableMap: IMap<IVariableDeclInstruction>;
    protected _varyingVariableMap: IMap<IVariableDeclInstruction>;
    protected _usedVarTypeMap: IMap<ITypeUseInfoContainer>;
    protected _uniformVariableMap: IMap<IVariableDeclInstruction>;
    protected _textureVariableMap: IMap<IVariableDeclInstruction>;
    protected _usedComplexTypeMap: IMap<ITypeInstruction>;

    protected _vertexShader: IFunctionDeclInstruction;
    protected _pixelShader: IFunctionDeclInstruction;

    // not builtin used system functions.
    private _extSystemTypeList: ITypeDeclInstruction[];
    private _extSystemFunctionList: IFunctionDeclInstruction[];

    constructor(node: IParseNode, definition: IFunctionDefInstruction,
        implementation: IStmtBlockInstruction, semantics: string = null) {
        super(node, semantics, null, EInstructionTypes.k_FunctionDeclInstruction);

        this._definition = definition;
        this._implementation = implementation;
        this._functionType = EFunctionType.k_Function;
        this._implementationScope = Instruction.UNDEFINE_SCOPE;

        this._bUsedAsFunction = false;
        this._bUsedAsVertex = false;
        this._bUsedAsPixel = false;
        this._bCanUsedAsFunction = true;
        this._bUsedInVertex = false;
        this._bUsedInPixel = false;

        this._usedFunctionMap = {};
        this._attributeVariableMap = {};
        this._varyingVariableMap = {};
        this._usedVarTypeMap = {};
        this._uniformVariableMap = {};
        this._textureVariableMap = {};
        this._usedComplexTypeMap = {};

        this._vertexShader = null;
        this._pixelShader = null;

        this._extSystemTypeList = [];
        this._extSystemFunctionList = [];
    }



    get functionType(): EFunctionType {
        return this._functionType;
    }


    get implementationScope(): number {
        return this._implementationScope;
    }


    get implementation(): IStmtBlockInstruction {
        return this._implementation;
    }


    get definition(): IFunctionDefInstruction {
        return this._definition;
    }


    get vertexShader(): IFunctionDeclInstruction {
        return this._vertexShader;
    }


    get pixelShader(): IFunctionDeclInstruction {
        return this._pixelShader;
    }


    get attributeVariableMap(): IMap<IVariableDeclInstruction> {
        return this._attributeVariableMap;
    }


    get varyingVariableMap(): IMap<IVariableDeclInstruction> {
        return this._varyingVariableMap;
    }


    get uniformVariableMap(): IMap<IVariableDeclInstruction> {
        return this._uniformVariableMap;
    }


    get textureVariableMap(): IMap<IVariableDeclInstruction> {
        return this._textureVariableMap;
    }


    get usedComplexTypeMap(): IMap<ITypeInstruction> {
        return this._usedComplexTypeMap;
    }


    get extSystemTypeList(): ITypeDeclInstruction[] {
        return this._extSystemTypeList;
    }


    get extSystemFunctionList(): IFunctionDeclInstruction[] {
        return this._extSystemFunctionList;
    }

    get arguments(): IVariableDeclInstruction[] {
        console.error("@not_implemented");
        return null;
    }


    toCode(): string {
        let code = '';
        code += this._definition.toCode();
        code += this._implementation.toCode();
        return code;
    }


    markUsedAs(eUsedType: EFunctionType): void {
        switch (eUsedType) {
            case EFunctionType.k_Vertex:
                this._bUsedInVertex = true;
                this._bUsedAsVertex = true;
                break;
            case EFunctionType.k_Pixel:
                this._bUsedInPixel = true;
                this._bUsedAsPixel = true;
                break;
            case EFunctionType.k_Function:
                this._bUsedAsFunction = true;
                break;
        }
    }

    isUsedAs(eUsedType: EFunctionType): boolean {
        switch (eUsedType) {
            case EFunctionType.k_Vertex:
                return this._bUsedAsVertex;
            case EFunctionType.k_Pixel:
                return this._bUsedAsPixel;
            case EFunctionType.k_Function:
                return this._bUsedAsFunction;
        }
        return false;
    }

    isUsedAsFunction(): boolean {
        return this._bUsedAsFunction;
    }

    isUsedAsVertex(): boolean {
        return this._bUsedAsVertex;
    }

    isUsedAsPixel(): boolean {
        return this._bUsedAsPixel;
    }

    markUsedInVertex(): void {
        this._bUsedInVertex = true;
    }

    markUsedInPixel(): void {
        this._bUsedInPixel = true;
    }

    isUsedInVertex(): boolean {
        return this._bUsedInVertex;
    }

    isUsedInPixel(): boolean {
        return this._bUsedInPixel;
    }

    isUsed(): boolean {
        return this._bUsedAsFunction || this._bUsedAsVertex || this._bUsedAsPixel;
    }

    checkVertexUsage(): boolean {
        return this.isUsedInVertex() ? this.vertex : true;
    }

    checkPixelUsage(): boolean {
        return this.isUsedInPixel() ? this.pixel : true;
    }

    checkDefinitionForVertexUsage(): boolean {
        return this._definition.checkForVertexUsage();
    }

    checkDefinitionForPixelUsage(): boolean {
        return this._definition.checkForPixelUsage();
    }

    canUsedAsFunction(): boolean {
        return this._bCanUsedAsFunction && this._definition.canUsedAsFunction();
    }

    addUsedFunction(pFunction: IFunctionDeclInstruction): boolean {
        if (pFunction.instructionType === EInstructionTypes.k_SystemFunctionInstruction &&
            !pFunction.builtIn) {

            this.addExtSystemFunction(pFunction);
            return true;
        }

        let iFuncId: number = pFunction.instructionID;

        if (!isDef(this._usedFunctionMap[iFuncId])) {
            this._usedFunctionMap[iFuncId] = pFunction;
            return true;
        }

        return false;
    }

    addUsedVariable(pVariable: IVariableDeclInstruction): void {

    }


    convertToVertexShader(): IFunctionDeclInstruction {
        let pShader: IFunctionDeclInstruction = null;

        if ((!this.canUsedAsFunction() || !this.isUsedAsFunction()) &&
            (!this.isUsedInPixel())) {
            pShader = this;
        }
        else {
            // pShader = <FunctionDeclInstruction>this.clone();
            console.error("not implemented!!");
        }

        pShader.prepareForVertex();
        this._vertexShader = pShader;

        return pShader;
    }

    convertToPixelShader(): IFunctionDeclInstruction {
        let pShader: FunctionDeclInstruction = null;

        if ((!this.canUsedAsFunction() || !this.isUsedAsFunction()) &&
            (!this.isUsedInVertex())) {
            pShader = this;
        }
        else {
            // pShader = <FunctionDeclInstruction>this.clone();
            console.error("not implemented!!");
        }

        pShader.prepareForPixel();
        this._pixelShader = pShader;

        return pShader;
    }


    prepareForVertex(): void {
        this.$overwriteType(EFunctionType.k_Vertex);

        let pShaderInputParamList: IVariableDeclInstruction[] = this._definition.shaderInput;
        for (let i: number = 0; i < pShaderInputParamList.length; i++) {
            let pParamType: IVariableTypeInstruction = pShaderInputParamList[i].type;

            if (pParamType.isComplex() &&
                isDef(this._usedVarTypeMap[pParamType.instructionID]) &&
                this._usedVarTypeMap[pParamType.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: this.name });
                return;
            }
        }

        if (this._definition.isComplexShaderInput()) {
            pShaderInputParamList[0].$hide();
        }

        this._implementation.prepareFor(EFunctionType.k_Vertex);
        this._definition.$makeShader();
        this.generatesVertexAttrubutes();
        this.generateVertexVaryings();
    }


    prepareForPixel(): void {
        this.$overwriteType(EFunctionType.k_Pixel);

        let pShaderInputParamList: IVariableDeclInstruction[] = this._definition.shaderInput;
        for (let i: number = 0; i < pShaderInputParamList.length; i++) {
            let pParamType: IVariableTypeInstruction = pShaderInputParamList[i].type;

            if (pParamType.isComplex() &&
                isDef(this._usedVarTypeMap[pParamType.instructionID]) &&
                this._usedVarTypeMap[pParamType.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: this.name });
                return;
            }
        }

        if (this._definition.isComplexShaderInput()) {
            pShaderInputParamList[0].$hide();
        }

        this._implementation.prepareFor(EFunctionType.k_Pixel);
        this._definition.$makeShader();

        this.generatePixelVaryings();
    }


    generateInfoAboutUsedData(): void {
        if (!isNull(this._usedVarTypeMap)) {
            return;
        }

        let pUsedData: IMap<ITypeUseInfoContainer> = <IMap<ITypeUseInfoContainer>>{};

        this._implementation.addUsedData(pUsedData);
        this._usedVarTypeMap = pUsedData;

        for (let i in pUsedData) {
            let pAnalyzedInfo: ITypeUseInfoContainer = pUsedData[i];
            let pAnalyzedType: IVariableTypeInstruction = pAnalyzedInfo.type;

            if (pAnalyzedType.globalScope) {
                this.addGlobalVariableType(pAnalyzedType, pAnalyzedInfo.isWrite, pAnalyzedInfo.isRead);
            } else if (pAnalyzedType.isUniform()) {
                this.addUniformParameter(pAnalyzedType);
            }
        }

        for (let j in this._usedFunctionMap) {
            this.addUsedInfoFromFunction(this._usedFunctionMap[j]);
        }
    }


    private generatesVertexAttrubutes(): void {
        throw null;

    }

    private generateVertexVaryings(): void {
        // this._varyingVariableMap = <IMap<IVariableDeclInstruction>>{};

        // let pContainerVariable: IVariableDeclInstruction = this.getOutVariable();
        // let pContainerType: IVariableTypeInstruction = pContainerVariable.type;


        // let pVaryingNames: string[] = pContainerType.fieldNames;

        // for (let i: number = 0; i < pVaryingNames.length; i++) {
        //     let pVarying: IVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

        //     if (!this.isVariableTypeUse(pVarying.type)) {
        //         continue;
        //     }

        //     this._varyingVariableMap[pVarying.instructionID] = pVarying;
        // }

        // this._varyingVariableKeys = this.varyingVariableKeys;
    }


    private generatePixelVaryings(): void {
        let pShaderInputParamList: IVariableDeclInstruction[] = this._definition.shaderInput;
        let isComplexInput: boolean = this._definition.isComplexShaderInput();

        this._varyingVariableMap = <IMap<IVariableDeclInstruction>>{};

        if (isComplexInput) {
            let pContainerVariable: IVariableDeclInstruction = pShaderInputParamList[0];
            let pContainerType: IVariableTypeInstruction = pContainerVariable.type;

            let pVaryingNames: string[] = pContainerType.fieldNames;

            for (let i: number = 0; i < pVaryingNames.length; i++) {
                let pVarying: IVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

                if (!this.isVariableTypeUse(pVarying.type)) {
                    continue;
                }

                this._varyingVariableMap[pVarying.instructionID] = pVarying;
            }
        }
        else {
            for (let i: number = 0; i < pShaderInputParamList.length; i++) {
                let pVarying: IVariableDeclInstruction = pShaderInputParamList[i];

                if (!this.isVariableTypeUse(pVarying.type)) {
                    continue;
                }

                this._varyingVariableMap[pVarying.instructionID] = pVarying;
            }
        }
    }

    private cloneVarTypeUsedMap(pMap: IMap<ITypeUseInfoContainer>, pRelationMap: IMap<IInstruction>): IMap<ITypeUseInfoContainer> {
        let pCloneMap: IMap<ITypeUseInfoContainer> = <IMap<ITypeUseInfoContainer>>{};

        for (let j in pMap) {
            let pType: IVariableTypeInstruction = <IVariableTypeInstruction>(isDef(pRelationMap[j]) ? pRelationMap[j] : pMap[j].type);
            let id: number = pType.instructionID;
            pCloneMap[id] = {
                type: pType,
                isRead: pMap[j].isRead,
                isWrite: pMap[j].isWrite,
                numRead: pMap[j].numRead,
                numWrite: pMap[j].numWrite,
                numUsed: pMap[j].numUsed
            }
        }

        return pCloneMap;
    }

    private cloneVarDeclMap(pMap: IMap<IVariableDeclInstruction>, pRelationMap: IMap<IInstruction>): IMap<IVariableDeclInstruction> {
        let pCloneMap: IMap<IVariableDeclInstruction> = <IMap<IVariableDeclInstruction>>{};

        for (let i in pMap) {
            let pVar: IVariableDeclInstruction = <IVariableDeclInstruction>(isDef(pRelationMap[i]) ? pRelationMap[i] : pMap[i]);

            if (!isNull(pVar)) {
                let id: number = pVar.instructionID;
                pCloneMap[id] = pVar;
            }
        }

        return pCloneMap;
    }

    private cloneTypeMap(pMap: IMap<ITypeInstruction>, pRelationMap: IMap<IInstruction>): IMap<ITypeInstruction> {
        let pCloneMap: IMap<ITypeInstruction> = <IMap<ITypeInstruction>>{};

        for (let i in pMap) {
            let pVar: ITypeInstruction = <ITypeInstruction>(isDef(pRelationMap[i]) ? pRelationMap[i] : pMap[i]);
            let id: number = pVar.instructionID;
            pCloneMap[id] = pVar;
        }

        return pCloneMap;
    }

    private addGlobalVariableType(pVariableType: IVariableTypeInstruction,
        isWrite: boolean, isRead: boolean): void {
        if (!VariableTypeInstruction.isInheritedFromVariableDecl(pVariableType)) {
            return;
        }

        let pVariable: IVariableDeclInstruction = <IVariableDeclInstruction>VariableTypeInstruction.findParentVariableDecl(pVariableType);
        let pMainVariable: IVariableDeclInstruction = VariableTypeInstruction.findMainVariable(pVariableType);
        let iMainVar: number = pMainVariable.instructionID;

        if (isWrite || pMainVariable.type.isConst()) {
            if (isDefAndNotNull(this._uniformVariableMap[iMainVar])) {
                this._uniformVariableMap[iMainVar] = null;
            }
        }
        else {
            this._uniformVariableMap[iMainVar] = pMainVariable;

            // if (!pMainVariable.type.isComplex() && (!isNull(pMainVariable.initExpr) && pMainVariable.initExpr.isConst())) {
            //     pMainVariable.prepareDefaultValue();
            // }
        }

        if (pVariable.isSampler() && !isNull(pVariable.initExpr)) {
            let pInitExpr: IInitExprInstruction = pVariable.initExpr;
            let pTexture: IVariableDeclInstruction = null;
            let pSamplerStates: SamplerStateBlockInstruction = null;

            if (pVariableType.isArray()) {
                let list: IInitExprInstruction[] = <IInitExprInstruction[]>pInitExpr.arguments;
                for (let i: number = 0; i < list.length; i++) {
                    pSamplerStates = <SamplerStateBlockInstruction>list[i].arguments[0];
                    pTexture = pSamplerStates.texture;

                    if (!isNull(pTexture)) {
                        this._textureVariableMap[pTexture.instructionID] = pTexture;
                    }
                }
            }
            else {
                pSamplerStates = <SamplerStateBlockInstruction>pInitExpr.arguments[0];
                pTexture = pSamplerStates.texture;

                if (!isNull(pTexture)) {
                    this._textureVariableMap[pTexture.instructionID] = pTexture;
                }
            }
        }

        // this.addUsedComplexType(pMainVariable.type._baseType);
    }

    private addUniformParameter(pType: IVariableTypeInstruction): void {
        let pMainVariable: IVariableDeclInstruction = VariableTypeInstruction.findMainVariable(pType);
        let iMainVar: number = pMainVariable.instructionID;

        this._uniformVariableMap[iMainVar] = pMainVariable;
        this.addUsedComplexType(pMainVariable.type.baseType);

        // if (!pMainVariable.type.isComplex() && !isNull(pMainVariable.initExpr) && pMainVariable.initExpr.isConst()) {
        //     pMainVariable.prepareDefaultValue();
        // }
    }

    private addUsedComplexType(pType: ITypeInstruction): void {
        if (pType.isBase() || isDef(this._usedComplexTypeMap[pType.instructionID])) {
            return;
        }

        this._usedComplexTypeMap[pType.instructionID] = pType;

        let fieldNames: string[] = pType.fieldNames;

        for (let i: number = 0; i < fieldNames.length; i++) {
            this.addUsedComplexType(pType.getFieldType(fieldNames[i]).baseType);
        }
    }

    private addUsedInfoFromFunction(pFunction: IFunctionDeclInstruction): void {
        pFunction.generateInfoAboutUsedData();

        let pUniformVarMap: IMap<IVariableDeclInstruction> = pFunction.uniformVariableMap;
        let pTextureVarMap: IMap<IVariableDeclInstruction> = pFunction.textureVariableMap;
        let pUsedComplexTypeMap: IMap<ITypeInstruction> = pFunction.usedComplexTypeMap;

        for (let j in pTextureVarMap) {
            this._textureVariableMap[pTextureVarMap[j].instructionID] = pTextureVarMap[j];
        }

        for (let j in pUniformVarMap) {
            {
                this._uniformVariableMap[pUniformVarMap[j].instructionID] = pUniformVarMap[j];
            }
        }

        for (let j in pUsedComplexTypeMap) {
            this._usedComplexTypeMap[pUsedComplexTypeMap[j].instructionID] = pUsedComplexTypeMap[j];
        }

        this.addExtSystemFunction(pFunction);
    }

    private addExtSystemFunction(pFunction: IFunctionDeclInstruction): void {
        if (pFunction.instructionType === EInstructionTypes.k_SystemFunctionInstruction) {
            if (this._extSystemFunctionList.indexOf(pFunction) !== -1) {
                return;
            }

            this._extSystemFunctionList.push(pFunction);
        }

        let pTypes = pFunction.extSystemTypeList;
        let pFunctions = pFunction.extSystemFunctionList;

        if (!isNull(pTypes)) {
            for (let j: number = 0; j < pTypes.length; j++) {
                if (this._extSystemTypeList.indexOf(pTypes[j]) === -1) {
                    this._extSystemTypeList.push(pTypes[j]);
                }
            }
        }

        if (!isNull(pFunctions)) {
            for (let j: number = 0; j < pFunctions.length; j++) {
                if (this._extSystemFunctionList.indexOf(pFunctions[j]) === -1) {
                    this._extSystemFunctionList.unshift(pFunctions[j]);
                }
            }
        }
    }

    private isVariableTypeUse(pVariableType: IVariableTypeInstruction): boolean {
        let id: number = pVariableType.instructionID;

        if (!isDef(this._usedVarTypeMap[id])) {
            return false;
        }

        if (this._usedVarTypeMap[id].numUsed === 0) {
            return false;
        }

        return true;
    }


    $overwriteType(type: EFunctionType) {
        this._functionType = type;
    }

    $linkToImplementationScope(scope: number) {
        this._implementationScope = scope;
    }
}
