import { DeclInstruction } from "./DeclInstruction";
import { IAFXFunctionDeclInstruction, EFunctionType, IAFXVariableDeclInstruction, IAFXTypeUseInfoContainer, IAFXTypeDeclInstruction, IAFXSimpleInstruction, EAFXInstructionTypes, IAFXTypeInstruction, IAFXIdInstruction, IAFXVariableTypeInstruction, IAFXDeclInstruction, IAFXStmtInstruction, IAFXInstruction, IAFXInitExprInstruction } from "../../idl/IAFXInstruction";
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
export class FunctionDeclInstruction extends DeclInstruction implements IAFXFunctionDeclInstruction {
    protected _pFunctionDefenition: FunctionDefInstruction = null;
    protected _pImplementation: StmtBlockInstruction = null;
    protected _eFunctionType: EFunctionType = EFunctionType.k_Function;

    protected _bUsedAsFunction: boolean = false;
    protected _bUsedAsVertex: boolean = false;
    protected _bUsedAsPixel: boolean = false;
    protected _bCanUsedAsFunction: boolean = true;

    protected _bUsedInVertex: boolean = false;
    protected _bUsedInPixel: boolean = false;

    protected _iImplementationScope: number = Instruction.UNDEFINE_SCOPE;

    protected _isInBlackList: boolean = false;

    protected _pOutVariable: IAFXVariableDeclInstruction = null;

    //Info about used data
    protected _pUsedFunctionMap: IMap<IAFXFunctionDeclInstruction> = null;
    protected _pUsedFunctionList: IAFXFunctionDeclInstruction[] = null;

    protected _pAttributeVariableMap: IMap<IAFXVariableDeclInstruction> = null;
    protected _pVaryingVariableMap: IMap<IAFXVariableDeclInstruction> = null;

    protected _pUsedVarTypeMap: IMap<IAFXTypeUseInfoContainer> = null;

    protected _pUniformVariableMap: IMap<IAFXVariableDeclInstruction> = null;
    protected _pTextureVariableMap: IMap<IAFXVariableDeclInstruction> = null;

    protected _pUsedComplexTypeMap: IMap<IAFXTypeInstruction> = null;

    protected _pAttributeVariableKeys: number[] = null;
    protected _pVaryingVariableKeys: number[] = null;

    protected _pUniformVariableKeys: number[] = null;
    protected _pTextureVariableKeys: number[] = null;
    protected _pUsedComplexTypeKeys: number[] = null;

    protected _pVertexShader: IAFXFunctionDeclInstruction = null;
    protected _pPixelShader: IAFXFunctionDeclInstruction = null;

    private _pExtSystemTypeList: IAFXTypeDeclInstruction[] = null;
    private _pExtSystemFunctionList: IAFXFunctionDeclInstruction[] = null;


    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null, null];
        this._eInstructionType = EAFXInstructionTypes.k_FunctionDeclInstruction;
    }

    toCode(): string {
        let sCode = "";

        sCode += this._pFunctionDefenition.toCode();
        sCode += this._pImplementation.toCode();

        return sCode;
    }

    toFinalDefCode(): string {
        return this._pFunctionDefenition.toCode();
    }

    get type(): IAFXTypeInstruction {
        return <IAFXTypeInstruction>this.returnType;
    }

    get name(): string {
        return this._pFunctionDefenition.name;
    }

    get realName(): string {
        return this._pFunctionDefenition.realName;
    }

    get nameID(): IAFXIdInstruction {
        return this._pFunctionDefenition.nameID;
    }

    get arguments(): IAFXVariableDeclInstruction[] {
        return this._pFunctionDefenition.arguments;
    }

    get numNeededArguments(): number {
        return this._pFunctionDefenition.numNeededArguments;
    }

    hasImplementation(): boolean {
        return !isNull(this._pImplementation);
    }

    get returnType(): IAFXVariableTypeInstruction {
        return this._pFunctionDefenition.returnType;
    }

    get functionType(): EFunctionType {
        return this._eFunctionType;
    }

    set functionType(eFunctionType: EFunctionType) {
        this._eFunctionType = eFunctionType;
    }

    set implementationScope(iScope: number) {
        this._iImplementationScope = iScope;
    }

    get implementationScope(): number {
        return this._iImplementationScope;
    }

    set functionDef(pFunctionDef: IAFXDeclInstruction) {
        this._pFunctionDefenition = <FunctionDefInstruction>pFunctionDef;
        this._pInstructionList[0] = pFunctionDef;
        pFunctionDef.parent = this;
    }

    set implementation(pImplementation: IAFXStmtInstruction) {
        this._pImplementation = <StmtBlockInstruction>pImplementation;
        this._pInstructionList[1] = pImplementation;
        pImplementation.parent = pImplementation;
    }

    clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXFunctionDeclInstruction {
        let pClone: FunctionDeclInstruction = <FunctionDeclInstruction>super.clone(pRelationMap);

        if (!isNull(this._pOutVariable)) {
            pClone.setOutVariable(<IAFXVariableDeclInstruction>pRelationMap[this._pOutVariable.instructionID]);
        }

        let pUsedVarTypeMap: IMap<IAFXTypeUseInfoContainer> = this.cloneVarTypeUsedMap(this._pUsedVarTypeMap, pRelationMap);
        let pUniformVariableMap: IMap<IAFXVariableDeclInstruction> = this.cloneVarDeclMap(this._pUniformVariableMap, pRelationMap);
        let pTextureVariableMap: IMap<IAFXVariableDeclInstruction> = this.cloneVarDeclMap(this._pTextureVariableMap, pRelationMap);
        let pUsedComplexTypeMap: IMap<IAFXTypeInstruction> = this.cloneTypeMap(this._pUsedComplexTypeMap, pRelationMap);

        pClone.setUsedFunctions(this._pUsedFunctionMap, this._pUsedFunctionList);
        pClone.setUsedVariableData(pUsedVarTypeMap,
            pUniformVariableMap,
            pTextureVariableMap,
            pUsedComplexTypeMap);
        pClone.initAfterClone();

        return pClone;
    }

    addOutVariable(pVariable: IAFXVariableDeclInstruction): boolean {
        if (!isNull(this._pOutVariable)) {
            return false;
        }

        if (!pVariable.type.isEqual(this.returnType)) {
            return false;
        }

        this._pOutVariable = pVariable;
        return true;
    }

    getOutVariable(): IAFXVariableDeclInstruction {
        return this._pOutVariable;
    }

    get vertexShader(): IAFXFunctionDeclInstruction {
        return this._pVertexShader;
    }

    get pixelShader(): IAFXFunctionDeclInstruction {
        return this._pPixelShader;
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
        return this.isUsedInVertex() ? this.isForVertex() : true;
    }

    checkPixelUsage(): boolean {
        return this.isUsedInPixel() ? this.isForPixel() : true;
    }

    checkDefenitionForVertexUsage(): boolean {
        return this._pFunctionDefenition.checkForVertexUsage();
    }

    checkDefenitionForPixelUsage(): boolean {
        return this._pFunctionDefenition.checkForPixelUsage();
    }

    canUsedAsFunction(): boolean {
        return this._bCanUsedAsFunction && this._pFunctionDefenition.canUsedAsFunction();
    }

    notCanUsedAsFunction(): void {
        this._bCanUsedAsFunction = false;
    }

    addUsedFunction(pFunction: IAFXFunctionDeclInstruction): boolean {
        if (pFunction.instructionType === EAFXInstructionTypes.k_SystemFunctionInstruction &&
            !pFunction.builtIn) {

            this.addExtSystemFunction(pFunction);
            return true;
        }

        if (isNull(this._pUsedFunctionMap)) {
            this._pUsedFunctionMap = <IMap<IAFXFunctionDeclInstruction>>{};
            this._pUsedFunctionList = [];
        }

        let iFuncId: number = pFunction.instructionID;

        if (!isDef(this._pUsedFunctionMap[iFuncId])) {
            this._pUsedFunctionMap[iFuncId] = pFunction;
            this._pUsedFunctionList.push(pFunction);
            return true;
        }

        return false;
    }

    addUsedVariable(pVariable: IAFXVariableDeclInstruction): void {

    }

    get usedFunctionList(): IAFXFunctionDeclInstruction[] {
        return this._pUsedFunctionList;
    }

    isBlackListFunction(): boolean {
        return this._isInBlackList;
    }

    addToBlackList(): void {
        this._isInBlackList = true;
    }

    get stringDef(): string {
        return this._pFunctionDefenition.stringDef;
    }

    convertToVertexShader(): IAFXFunctionDeclInstruction {
        let pShader: FunctionDeclInstruction = null;

        if ((!this.canUsedAsFunction() || !this.isUsedAsFunction()) &&
            (!this.isUsedInPixel())) {
            pShader = this;
        }
        else {
            pShader = <FunctionDeclInstruction>this.clone();
        }

        pShader.prepareForVertex();
        this._pVertexShader = pShader;

        return pShader;
    }

    convertToPixelShader(): IAFXFunctionDeclInstruction {
        let pShader: FunctionDeclInstruction = null;

        if ((!this.canUsedAsFunction() || !this.isUsedAsFunction()) &&
            (!this.isUsedInVertex())) {
            pShader = this;
        }
        else {
            pShader = <FunctionDeclInstruction>this.clone();
        }

        pShader.prepareForPixel();
        this._pPixelShader = pShader;

        return pShader;
    }

    prepareForVertex(): void {
        this.functionType = (EFunctionType.k_Vertex);

        let pShaderInputParamList: IAFXVariableDeclInstruction[] = this._pFunctionDefenition.getParameListForShaderInput();
        for (let i: number = 0; i < pShaderInputParamList.length; i++) {
            let pParamType: IAFXVariableTypeInstruction = pShaderInputParamList[i].type;

            if (pParamType.isComplex() &&
                isDef(this._pUsedVarTypeMap[pParamType.instructionID]) &&
                this._pUsedVarTypeMap[pParamType.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: this.name });
                return;
            }
        }

        let pOutVariable: IAFXVariableDeclInstruction = this.getOutVariable();

        if (!isNull(pOutVariable)) {
            if (isDef(this._pUsedVarTypeMap[pOutVariable.type.instructionID]) &&
                this._pUsedVarTypeMap[pOutVariable.type.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_OUTPUT, { funcName: this.name });
                return;
            }

            pOutVariable.markAsShaderOutput(true);
        }

        if (this._pFunctionDefenition.isComplexShaderInput()) {
            pShaderInputParamList[0].visible = (false);
        }

        this._pImplementation.prepareFor(EFunctionType.k_Vertex);
        this._pFunctionDefenition.markAsShaderDef(true);
        this.generatesVertexAttrubutes();
        this.generateVertexVaryings();
    }

    prepareForPixel(): void {
        this.setFunctionType(EFunctionType.k_Pixel);

        let pShaderInputParamList: IAFXVariableDeclInstruction[] = this._pFunctionDefenition.getParameListForShaderInput();
        for (let i: number = 0; i < pShaderInputParamList.length; i++) {
            let pParamType: IAFXVariableTypeInstruction = pShaderInputParamList[i].type;

            if (pParamType.isComplex() &&
                isDef(this._pUsedVarTypeMap[pParamType.instructionID]) &&
                this._pUsedVarTypeMap[pParamType.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: this.name });
                return;
            }
        }

        if (this._pFunctionDefenition.isComplexShaderInput()) {
            pShaderInputParamList[0].visible = (false);
        }

        this._pImplementation.prepareFor(EFunctionType.k_Pixel);
        this._pFunctionDefenition.markAsShaderDef(true);

        this.generatePixelVaryings();
    }

    setOutVariable(pVar: IAFXVariableDeclInstruction): void {
        this._pOutVariable = pVar;
    }

    setUsedFunctions(pUsedFunctionMap: IMap<IAFXFunctionDeclInstruction>,
        pUsedFunctionList: IAFXFunctionDeclInstruction[]): void {
        this._pUsedFunctionMap = pUsedFunctionMap;
        this._pUsedFunctionList = pUsedFunctionList;
    }

    setUsedVariableData(pUsedVarTypeMap: IMap<IAFXTypeUseInfoContainer>,
        pUniformVariableMap: IMap<IAFXVariableDeclInstruction>,
        pTextureVariableMap: IMap<IAFXVariableDeclInstruction>,
        pUsedComplexTypeMap: IMap<IAFXTypeInstruction>): void {
        this._pUsedVarTypeMap = pUsedVarTypeMap;
        this._pUniformVariableMap = pUniformVariableMap;
        this._pTextureVariableMap = pTextureVariableMap;
        this._pUsedComplexTypeMap = pUsedComplexTypeMap;
    }

    initAfterClone(): void {
        this._pFunctionDefenition = <FunctionDefInstruction>this._pInstructionList[0];
        this._pImplementation = <StmtBlockInstruction>this._pInstructionList[1];
    }

    generateInfoAboutUsedData(): void {
        if (!isNull(this._pUsedVarTypeMap)) {
            return;
        }

        let pUsedData: IMap<IAFXTypeUseInfoContainer> = <IMap<IAFXTypeUseInfoContainer>>{};
        this._pImplementation.addUsedData(pUsedData);

        this._pUsedVarTypeMap = pUsedData;

        if (isNull(this._pUsedComplexTypeMap)) {
            this._pUniformVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
            this._pTextureVariableMap = <IMap<IAFXVariableDeclInstruction>>{};
            this._pUsedComplexTypeMap = <IMap<IAFXTypeInstruction>>{};
        }

        //this.addUsedComplexType(this.returnType._baseType);

        for (let i in pUsedData) {
            let pAnalyzedInfo: IAFXTypeUseInfoContainer = pUsedData[i];
            let pAnalyzedType: IAFXVariableTypeInstruction = pAnalyzedInfo.type;

            if (pAnalyzedType.globalScope) {
                this.addGlobalVariableType(pAnalyzedType, pAnalyzedInfo.isWrite, pAnalyzedInfo.isRead);
            }
            else if (pAnalyzedType.isUniform()) {
                this.addUniformParameter(pAnalyzedType);
            }
            else if (pAnalyzedType.scope < this.implementationScope) {
                if (!this.isUsedAsFunction()) {
                    if (!isNull(this.getOutVariable()) &&
                        this.getOutVariable().type !== pAnalyzedType) {

                        this.addUsedComplexType(pAnalyzedType.baseType);
                    }
                }
            }
        }
        if (!isNull(this._pUsedFunctionList)) {
            for (let j: number = 0; j < this._pUsedFunctionList.length; j++) {
                this.addUsedInfoFromFunction(this._pUsedFunctionList[j]);
            }
        }
    }

    get attributeVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return this._pAttributeVariableMap;
    }

    get varyingVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return this._pVaryingVariableMap;
    }

    get uniformVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return this._pUniformVariableMap;
    }

    get textureVariableMap(): IMap<IAFXVariableDeclInstruction> {
        return this._pTextureVariableMap;
    }

    get usedComplexTypeMap(): IMap<IAFXTypeInstruction> {
        return this._pUsedComplexTypeMap;
    }

    get attributeVariableKeys(): number[] {
        if (isNull(this._pAttributeVariableKeys) && !isNull(this._pAttributeVariableMap)) {
            this._pAttributeVariableKeys = <number[]><any>Object.keys(this._pAttributeVariableMap);
        }

        return this._pAttributeVariableKeys;
    }

    get varyingVariableKeys(): number[] {
        if (isNull(this._pVaryingVariableKeys) && !isNull(this._pVaryingVariableMap)) {
            this._pVaryingVariableKeys = <number[]><any>Object.keys(this._pVaryingVariableMap);
        }

        return this._pVaryingVariableKeys;
    }


    get uniformVariableKeys(): number[] {
        if (isNull(this._pUniformVariableKeys) && !isNull(this._pUniformVariableMap)) {
            this._pUniformVariableKeys = <number[]><any[]>Object.keys(this._pUniformVariableMap);
        }

        return this._pUniformVariableKeys;
    }

    get textureVariableKeys(): number[] {
        if (isNull(this._pTextureVariableKeys) && !isNull(this._pTextureVariableMap)) {
            this._pTextureVariableKeys = <number[]><any[]>Object.keys(this._pTextureVariableMap);
        }

        return this._pTextureVariableKeys;
    }

    get usedComplexTypeKeys(): number[] {
        if (isNull(this._pUsedComplexTypeKeys)) {
            this._pUsedComplexTypeKeys = <number[]><any[]>Object.keys(this._pUsedComplexTypeMap);
        }

        return this._pUsedComplexTypeKeys;
    }

    get extSystemFunctionList(): IAFXFunctionDeclInstruction[] {
        return this._pExtSystemFunctionList;
    }

    get extSystemTypeList(): IAFXTypeDeclInstruction[] {
        return this._pExtSystemTypeList;
    }

    private generatesVertexAttrubutes(): void {
        throw null;
        
    }

    private generateVertexVaryings(): void {
        if (isNull(this.getOutVariable())) {
            return;
        }

        this._pVaryingVariableMap = <IMap<IAFXVariableDeclInstruction>>{};

        let pContainerVariable: IAFXVariableDeclInstruction = this.getOutVariable();
        let pContainerType: IAFXVariableTypeInstruction = pContainerVariable.type;


        let pVaryingNames: string[] = pContainerType.getFieldNameList();

        for (let i: number = 0; i < pVaryingNames.length; i++) {
            let pVarying: IAFXVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

            if (!this.isVariableTypeUse(pVarying.type)) {
                continue;
            }

            this._pVaryingVariableMap[pVarying.instructionID] = pVarying;
        }

        this._pVaryingVariableKeys = this.varyingVariableKeys;
    }

    private generatePixelVaryings(): void {
        let pShaderInputParamList: IAFXVariableDeclInstruction[] = this._pFunctionDefenition.getParameListForShaderInput();
        let isComplexInput: boolean = this._pFunctionDefenition.isComplexShaderInput();

        this._pVaryingVariableMap = <IMap<IAFXVariableDeclInstruction>>{};

        if (isComplexInput) {
            let pContainerVariable: IAFXVariableDeclInstruction = pShaderInputParamList[0];
            let pContainerType: IAFXVariableTypeInstruction = pContainerVariable.type;

            let pVaryingNames: string[] = pContainerType.getFieldNameList();

            for (let i: number = 0; i < pVaryingNames.length; i++) {
                let pVarying: IAFXVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

                if (!this.isVariableTypeUse(pVarying.type)) {
                    continue;
                }

                this._pVaryingVariableMap[pVarying.instructionID] = pVarying;
            }
        }
        else {
            for (let i: number = 0; i < pShaderInputParamList.length; i++) {
                let pVarying: IAFXVariableDeclInstruction = pShaderInputParamList[i];

                if (!this.isVariableTypeUse(pVarying.type)) {
                    continue;
                }

                this._pVaryingVariableMap[pVarying.instructionID] = pVarying;
            }
        }

        this._pVaryingVariableKeys = this.varyingVariableKeys;
    }

    private cloneVarTypeUsedMap(pMap: IMap<IAFXTypeUseInfoContainer>, pRelationMap: IMap<IAFXInstruction>): IMap<IAFXTypeUseInfoContainer> {
        let pCloneMap: IMap<IAFXTypeUseInfoContainer> = <IMap<IAFXTypeUseInfoContainer>>{};

        for (let j in pMap) {
            let pType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>(isDef(pRelationMap[j]) ? pRelationMap[j] : pMap[j].type);
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

    private cloneVarDeclMap(pMap: IMap<IAFXVariableDeclInstruction>, pRelationMap: IMap<IAFXInstruction>): IMap<IAFXVariableDeclInstruction> {
        let pCloneMap: IMap<IAFXVariableDeclInstruction> = <IMap<IAFXVariableDeclInstruction>>{};

        for (let i in pMap) {
            let pVar: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>(isDef(pRelationMap[i]) ? pRelationMap[i] : pMap[i]);

            if (!isNull(pVar)) {
                let id: number = pVar.instructionID;
                pCloneMap[id] = pVar;
            }
        }

        return pCloneMap;
    }

    private cloneTypeMap(pMap: IMap<IAFXTypeInstruction>, pRelationMap: IMap<IAFXInstruction>): IMap<IAFXTypeInstruction> {
        let pCloneMap: IMap<IAFXTypeInstruction> = <IMap<IAFXTypeInstruction>>{};

        for (let i in pMap) {
            let pVar: IAFXTypeInstruction = <IAFXTypeInstruction>(isDef(pRelationMap[i]) ? pRelationMap[i] : pMap[i]);
            let id: number = pVar.instructionID;
            pCloneMap[id] = pVar;
        }

        return pCloneMap;
    }

    private addGlobalVariableType(pVariableType: IAFXVariableTypeInstruction,
        isWrite: boolean, isRead: boolean): void {
        if (!pVariableType.isFromVariableDecl()) {
            return;
        }

        let pVariable: IAFXVariableDeclInstruction = <IAFXVariableDeclInstruction>pVariableType.parentVarDecl;
        let pMainVariable: IAFXVariableDeclInstruction = pVariableType.mainVariable;
        let iMainVar: number = pMainVariable.instructionID;

       if (isWrite || pMainVariable.type.isConst()) {
            if (isDefAndNotNull(this._pUniformVariableMap[iMainVar])) {
                this._pUniformVariableMap[iMainVar] = null;
            }
        }
        else {
            {
                this._pUniformVariableMap[iMainVar] = pMainVariable;

                if (!pMainVariable.type.isComplex() && pMainVariable.hasConstantInitializer()) {
                    pMainVariable.prepareDefaultValue();
                }
            }
        }

        if (pVariable.isSampler() && pVariable.hasInitializer()) {
            let pInitExpr: IAFXInitExprInstruction = pVariable.initializeExpr;
            let pTexture: IAFXVariableDeclInstruction = null;
            let pSamplerStates: SamplerStateBlockInstruction = null;

            if (pVariableType.isArray()) {
                let pList: IAFXInitExprInstruction[] = <IAFXInitExprInstruction[]>pInitExpr.instructions;
                for (let i: number = 0; i < pList.length; i++) {
                    pSamplerStates = <SamplerStateBlockInstruction>pList[i].instructions[0];
                    pTexture = pSamplerStates.texture;

                    if (!isNull(pTexture)) {
                        this._pTextureVariableMap[pTexture.instructionID] = pTexture;
                    }
                }
            }
            else {
                pSamplerStates = <SamplerStateBlockInstruction>pInitExpr.instructions[0];
                pTexture = pSamplerStates.texture;

                if (!isNull(pTexture)) {
                    this._pTextureVariableMap[pTexture.instructionID] = pTexture;
                }
            }
        }

        // this.addUsedComplexType(pMainVariable.type._baseType);
    }

    private addUniformParameter(pType: IAFXVariableTypeInstruction): void {
        let pMainVariable: IAFXVariableDeclInstruction = pType.mainVariable;
        let iMainVar: number = pMainVariable.instructionID;

        this._pUniformVariableMap[iMainVar] = pMainVariable;
        this.addUsedComplexType(pMainVariable.type.baseType);

        if (!pMainVariable.type.isComplex() && pMainVariable.hasConstantInitializer()) {
            pMainVariable.prepareDefaultValue();
        }
    }

    private addUsedComplexType(pType: IAFXTypeInstruction): void {
        if (pType.isBase() || isDef(this._pUsedComplexTypeMap[pType.instructionID])) {
            return;
        }

        this._pUsedComplexTypeMap[pType.instructionID] = pType;

        let pFieldNameList: string[] = pType.getFieldNameList();

        for (let i: number = 0; i < pFieldNameList.length; i++) {
            this.addUsedComplexType(pType.getFieldType(pFieldNameList[i]).baseType);
        }
    }

    private addUsedInfoFromFunction(pFunction: IAFXFunctionDeclInstruction): void {
        pFunction.generateInfoAboutUsedData();

        let pUniformVarMap: IMap<IAFXVariableDeclInstruction> = pFunction.uniformVariableMap;
        let pTextureVarMap: IMap<IAFXVariableDeclInstruction> = pFunction.textureriableMap();
        let pUsedComplexTypeMap: IMap<IAFXTypeInstruction> = pFunction.usedComplexTypeMap;

        for (let j in pTextureVarMap) {
            this._pTextureVariableMap[pTextureVarMap[j].instructionID] = pTextureVarMap[j];
        }

        for (let j in pUniformVarMap) {
            {
                this._pUniformVariableMap[pUniformVarMap[j].instructionID] = pUniformVarMap[j];
            }
        }

        for (let j in pUsedComplexTypeMap) {
            this._pUsedComplexTypeMap[pUsedComplexTypeMap[j].instructionID] = pUsedComplexTypeMap[j];
        }

        this.addExtSystemFunction(pFunction);
    }

    private addExtSystemFunction(pFunction: IAFXFunctionDeclInstruction): void {
        if (isNull(this._pExtSystemFunctionList)) {
            this._pExtSystemFunctionList = [];
            this._pExtSystemTypeList = [];
        }

        if (pFunction.instructionType === EAFXInstructionTypes.k_SystemFunctionInstruction) {
            if (this._pExtSystemFunctionList.indexOf(pFunction) !== -1) {
                return;
            }

            this._pExtSystemFunctionList.push(pFunction);
        }

        let pTypes = pFunction.extSystemTypeList;
        let pFunctions = pFunction.extSystemFunctionList;

        if (!isNull(pTypes)) {
            for (let j: number = 0; j < pTypes.length; j++) {
                if (this._pExtSystemTypeList.indexOf(pTypes[j]) === -1) {
                    this._pExtSystemTypeList.push(pTypes[j]);
                }
            }
        }

        if (!isNull(pFunctions)) {
            for (let j: number = 0; j < pFunctions.length; j++) {
                if (this._pExtSystemFunctionList.indexOf(pFunctions[j]) === -1) {
                    this._pExtSystemFunctionList.unshift(pFunctions[j]);
                }
            }
        }
    }

    private isVariableTypeUse(pVariableType: IAFXVariableTypeInstruction): boolean {
        let id: number = pVariableType.instructionID;

        if (!isDef(this._pUsedVarTypeMap[id])) {
            return false;
        }

        if (this._pUsedVarTypeMap[id].numUsed === 0) {
            return false;
        }

        return true;
    }
}
