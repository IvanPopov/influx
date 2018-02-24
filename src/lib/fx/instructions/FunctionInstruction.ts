import { DeclInstruction } from "./DeclInstruction";
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
    protected _pFunctionDefenition: FunctionDefInstruction;
    protected _pImplementation: StmtBlockInstruction;
    protected _eFunctionType: EFunctionType;

    protected _bUsedAsFunction: boolean;
    protected _bUsedAsVertex: boolean;
    protected _bUsedAsPixel: boolean;
    protected _bCanUsedAsFunction: boolean;

    protected _bUsedInVertex: boolean;
    protected _bUsedInPixel: boolean;

    protected _iImplementationScope: number;

    protected _isInBlackList: boolean;

    protected _pOutVariable: IVariableDeclInstruction;

    //Info about used data
    protected _pUsedFunctionList: IFunctionDeclInstruction[];
    protected _pUsedFunctionMap: IMap<IFunctionDeclInstruction>;

    protected _pAttributeVariableMap: IMap<IVariableDeclInstruction>;
    protected _pVaryingVariableMap: IMap<IVariableDeclInstruction>;

    protected _pUsedVarTypeMap: IMap<ITypeUseInfoContainer>;

    protected _pUniformVariableMap: IMap<IVariableDeclInstruction>;
    protected _pTextureVariableMap: IMap<IVariableDeclInstruction>;

    protected _pUsedComplexTypeMap: IMap<ITypeInstruction>;

    protected _pAttributeVariableKeys: number[];
    protected _pVaryingVariableKeys: number[];

    protected _pUniformVariableKeys: number[];
    protected _pTextureVariableKeys: number[];
    protected _pUsedComplexTypeKeys: number[];

    protected _pVertexShader: IFunctionDeclInstruction;
    protected _pPixelShader: IFunctionDeclInstruction;

    private _pExtSystemTypeList: ITypeDeclInstruction[];
    private _pExtSystemFunctionList: IFunctionDeclInstruction[];

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_FunctionDeclInstruction);

        this._pFunctionDefenition = null;
        this._pImplementation = null;
        this._eFunctionType = EFunctionType.k_Function;

        this._bUsedAsFunction = false;
        this._bUsedAsVertex = false;
        this._bUsedAsPixel = false;
        this._bCanUsedAsFunction = true;

        this._bUsedInVertex = false;
        this._bUsedInPixel = false;

        this._iImplementationScope = Instruction.UNDEFINE_SCOPE;

        this._isInBlackList = false;
        this._pOutVariable = null;

        this._pUsedFunctionList = [];
        this._pUsedFunctionMap = {};

        this._pAttributeVariableMap = {};
        this._pVaryingVariableMap = {};

        this._pUsedVarTypeMap = null;

        this._pUniformVariableMap = {};
        this._pTextureVariableMap = {};

        this._pUsedComplexTypeMap = {};

        this._pAttributeVariableKeys = [];
        this._pVaryingVariableKeys = [];

        this._pUniformVariableKeys = [];
        this._pTextureVariableKeys = [];
        this._pUsedComplexTypeKeys = [];

        this._pVertexShader = null;
        this._pPixelShader = null;

        this._pExtSystemTypeList = [];
        this._pExtSystemFunctionList = [];
    }

    get type(): ITypeInstruction {
        return <ITypeInstruction>this.returnType;
    }

    get name(): string {
        return this._pFunctionDefenition.name;
    }

    get realName(): string {
        return this._pFunctionDefenition.realName;
    }

    get nameID(): IIdInstruction {
        return this._pFunctionDefenition.nameID;
    }

    get arguments(): IVariableDeclInstruction[] {
        return this._pFunctionDefenition.arguments;
    }

    get numArgsRequired(): number {
        return this._pFunctionDefenition.numArgsRequired;
    }

    get returnType(): IVariableTypeInstruction {
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

    set definition(pFunctionDef: IDeclInstruction) {
        this._pFunctionDefenition = <FunctionDefInstruction>pFunctionDef;
        this.instructions[0] = pFunctionDef;
        pFunctionDef.parent = this;
    }

    get definition(): IDeclInstruction {
        return this._pFunctionDefenition;
    }

    set implementation(pImplementation: IStmtInstruction) {
        this._pImplementation = <StmtBlockInstruction>pImplementation;
        this.instructions[1] = pImplementation;
        pImplementation.parent = pImplementation;
    }

    get vertexShader(): IFunctionDeclInstruction {
        return this._pVertexShader;
    }

    get pixelShader(): IFunctionDeclInstruction {
        return this._pPixelShader;
    }

    get usedFunctionList(): IFunctionDeclInstruction[] {
        return this._pUsedFunctionList;
    }


    get attributeVariableMap(): IMap<IVariableDeclInstruction> {
        return this._pAttributeVariableMap;
    }

    get varyingVariableMap(): IMap<IVariableDeclInstruction> {
        return this._pVaryingVariableMap;
    }

    get uniformVariableMap(): IMap<IVariableDeclInstruction> {
        return this._pUniformVariableMap;
    }

    get textureVariableMap(): IMap<IVariableDeclInstruction> {
        return this._pTextureVariableMap;
    }

    get usedComplexTypeMap(): IMap<ITypeInstruction> {
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

    get extSystemFunctionList(): IFunctionDeclInstruction[] {
        return this._pExtSystemFunctionList;
    }

    get extSystemTypeList(): ITypeDeclInstruction[] {
        return this._pExtSystemTypeList;
    }

    toCode(): string {
        let sCode = "";

        sCode += this._pFunctionDefenition.toCode();
        sCode += this._pImplementation.toCode();

        return sCode;
    }


    addOutVariable(pVariable: IVariableDeclInstruction): boolean {
        if (!isNull(this._pOutVariable)) {
            return false;
        }

        if (!pVariable.type.isEqual(this.returnType)) {
            return false;
        }

        this._pOutVariable = pVariable;
        return true;
    }


    getOutVariable(): IVariableDeclInstruction {
        return this._pOutVariable;
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

    addUsedFunction(pFunction: IFunctionDeclInstruction): boolean {
        if (pFunction.instructionType === EInstructionTypes.k_SystemFunctionInstruction &&
            !pFunction.builtIn) {

            this.addExtSystemFunction(pFunction);
            return true;
        }

        if (isNull(this._pUsedFunctionMap)) {
            this._pUsedFunctionMap = <IMap<IFunctionDeclInstruction>>{};
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

    addUsedVariable(pVariable: IVariableDeclInstruction): void {

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

    convertToVertexShader(): IFunctionDeclInstruction {
        let pShader: FunctionDeclInstruction = null;

        if ((!this.canUsedAsFunction() || !this.isUsedAsFunction()) &&
            (!this.isUsedInPixel())) {
            pShader = this;
        }
        else {
            // pShader = <FunctionDeclInstruction>this.clone();
            console.error("not implemented!!");
        }

        pShader.prepareForVertex();
        this._pVertexShader = pShader;

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
        this._pPixelShader = pShader;

        return pShader;
    }

    prepareForVertex(): void {
        this.functionType = (EFunctionType.k_Vertex);

        let pShaderInputParamList: IVariableDeclInstruction[] = this._pFunctionDefenition.paramListForShaderInput;
        for (let i: number = 0; i < pShaderInputParamList.length; i++) {
            let pParamType: IVariableTypeInstruction = pShaderInputParamList[i].type;

            if (pParamType.isComplex() &&
                isDef(this._pUsedVarTypeMap[pParamType.instructionID]) &&
                this._pUsedVarTypeMap[pParamType.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_INPUT, { funcName: this.name });
                return;
            }
        }

        let pOutVariable: IVariableDeclInstruction = this.getOutVariable();

        if (!isNull(pOutVariable)) {
            if (isDef(this._pUsedVarTypeMap[pOutVariable.type.instructionID]) &&
                this._pUsedVarTypeMap[pOutVariable.type.instructionID].isRead) {

                this._setError(EEffectTempErrors.BAD_LOCAL_OF_SHADER_OUTPUT, { funcName: this.name });
                return;
            }

            pOutVariable.shaderOutput = (true);
        }

        if (this._pFunctionDefenition.isComplexShaderInput()) {
            pShaderInputParamList[0].visible = (false);
        }

        this._pImplementation.prepareFor(EFunctionType.k_Vertex);
        this._pFunctionDefenition.shaderDef = (true);
        this.generatesVertexAttrubutes();
        this.generateVertexVaryings();
    }

    prepareForPixel(): void {
        this.functionType = (EFunctionType.k_Pixel);

        let pShaderInputParamList: IVariableDeclInstruction[] = this._pFunctionDefenition.paramListForShaderInput;
        for (let i: number = 0; i < pShaderInputParamList.length; i++) {
            let pParamType: IVariableTypeInstruction = pShaderInputParamList[i].type;

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
        this._pFunctionDefenition.shaderDef = (true);

        this.generatePixelVaryings();
    }

    setOutVariable(pVar: IVariableDeclInstruction): void {
        this._pOutVariable = pVar;
    }

    setUsedFunctions(pUsedFunctionMap: IMap<IFunctionDeclInstruction>,
        pUsedFunctionList: IFunctionDeclInstruction[]): void {
        this._pUsedFunctionMap = pUsedFunctionMap;
        this._pUsedFunctionList = pUsedFunctionList;
    }

    setUsedVariableData(pUsedVarTypeMap: IMap<ITypeUseInfoContainer>,
        pUniformVariableMap: IMap<IVariableDeclInstruction>,
        pTextureVariableMap: IMap<IVariableDeclInstruction>,
        pUsedComplexTypeMap: IMap<ITypeInstruction>): void {
        this._pUsedVarTypeMap = pUsedVarTypeMap;
        this._pUniformVariableMap = pUniformVariableMap;
        this._pTextureVariableMap = pTextureVariableMap;
        this._pUsedComplexTypeMap = pUsedComplexTypeMap;
    }

    initAfterClone(): void {
        this._pFunctionDefenition = <FunctionDefInstruction>this.instructions[0];
        this._pImplementation = <StmtBlockInstruction>this.instructions[1];
    }

    generateInfoAboutUsedData(): void {
        if (!isNull(this._pUsedVarTypeMap)) {
            return;
        }

        let pUsedData: IMap<ITypeUseInfoContainer> = <IMap<ITypeUseInfoContainer>>{};

        this._pImplementation.addUsedData(pUsedData);
        this._pUsedVarTypeMap = pUsedData;

        for (let i in pUsedData) {
            let pAnalyzedInfo: ITypeUseInfoContainer = pUsedData[i];
            let pAnalyzedType: IVariableTypeInstruction = pAnalyzedInfo.type;

            if (pAnalyzedType.globalScope) {
                this.addGlobalVariableType(pAnalyzedType, pAnalyzedInfo.isWrite, pAnalyzedInfo.isRead);
            } else if (pAnalyzedType.isUniform()) {
                this.addUniformParameter(pAnalyzedType);
            } else if (pAnalyzedType.scope < this.implementationScope) {
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


    private generatesVertexAttrubutes(): void {
        throw null;

    }

    private generateVertexVaryings(): void {
        if (isNull(this.getOutVariable())) {
            return;
        }

        this._pVaryingVariableMap = <IMap<IVariableDeclInstruction>>{};

        let pContainerVariable: IVariableDeclInstruction = this.getOutVariable();
        let pContainerType: IVariableTypeInstruction = pContainerVariable.type;


        let pVaryingNames: string[] = pContainerType.fieldNameList;

        for (let i: number = 0; i < pVaryingNames.length; i++) {
            let pVarying: IVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

            if (!this.isVariableTypeUse(pVarying.type)) {
                continue;
            }

            this._pVaryingVariableMap[pVarying.instructionID] = pVarying;
        }

        this._pVaryingVariableKeys = this.varyingVariableKeys;
    }

    private generatePixelVaryings(): void {
        let pShaderInputParamList: IVariableDeclInstruction[] = this._pFunctionDefenition.paramListForShaderInput;
        let isComplexInput: boolean = this._pFunctionDefenition.isComplexShaderInput();

        this._pVaryingVariableMap = <IMap<IVariableDeclInstruction>>{};

        if (isComplexInput) {
            let pContainerVariable: IVariableDeclInstruction = pShaderInputParamList[0];
            let pContainerType: IVariableTypeInstruction = pContainerVariable.type;

            let pVaryingNames: string[] = pContainerType.fieldNameList;

            for (let i: number = 0; i < pVaryingNames.length; i++) {
                let pVarying: IVariableDeclInstruction = pContainerType.getField(pVaryingNames[i]);

                if (!this.isVariableTypeUse(pVarying.type)) {
                    continue;
                }

                this._pVaryingVariableMap[pVarying.instructionID] = pVarying;
            }
        }
        else {
            for (let i: number = 0; i < pShaderInputParamList.length; i++) {
                let pVarying: IVariableDeclInstruction = pShaderInputParamList[i];

                if (!this.isVariableTypeUse(pVarying.type)) {
                    continue;
                }

                this._pVaryingVariableMap[pVarying.instructionID] = pVarying;
            }
        }

        this._pVaryingVariableKeys = this.varyingVariableKeys;
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
        if (!pVariableType.isFromVariableDecl()) {
            return;
        }

        let pVariable: IVariableDeclInstruction = <IVariableDeclInstruction>pVariableType.parentVarDecl;
        let pMainVariable: IVariableDeclInstruction = pVariableType.mainVariable;
        let iMainVar: number = pMainVariable.instructionID;

        if (isWrite || pMainVariable.type.isConst()) {
            if (isDefAndNotNull(this._pUniformVariableMap[iMainVar])) {
                this._pUniformVariableMap[iMainVar] = null;
            }
        }
        else {
            {
                this._pUniformVariableMap[iMainVar] = pMainVariable;

                if (!pMainVariable.type.isComplex() && (!isNull(pMainVariable.initializeExpr) && pMainVariable.initializeExpr.isConst())) {
                    pMainVariable.prepareDefaultValue();
                }
            }
        }

        if (pVariable.isSampler() && !isNull(pVariable.initializeExpr)) {
            let pInitExpr: IInitExprInstruction = pVariable.initializeExpr;
            let pTexture: IVariableDeclInstruction = null;
            let pSamplerStates: SamplerStateBlockInstruction = null;

            if (pVariableType.isArray()) {
                let pList: IInitExprInstruction[] = <IInitExprInstruction[]>pInitExpr.instructions;
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

    private addUniformParameter(pType: IVariableTypeInstruction): void {
        let pMainVariable: IVariableDeclInstruction = pType.mainVariable;
        let iMainVar: number = pMainVariable.instructionID;

        this._pUniformVariableMap[iMainVar] = pMainVariable;
        this.addUsedComplexType(pMainVariable.type.baseType);

        if (!pMainVariable.type.isComplex() && !isNull(pMainVariable.initializeExpr) && pMainVariable.initializeExpr.isConst()) {
            pMainVariable.prepareDefaultValue();
        }
    }

    private addUsedComplexType(pType: ITypeInstruction): void {
        if (pType.isBase() || isDef(this._pUsedComplexTypeMap[pType.instructionID])) {
            return;
        }

        this._pUsedComplexTypeMap[pType.instructionID] = pType;

        let pFieldNameList: string[] = pType.fieldNameList;

        for (let i: number = 0; i < pFieldNameList.length; i++) {
            this.addUsedComplexType(pType.getFieldType(pFieldNameList[i]).baseType);
        }
    }

    private addUsedInfoFromFunction(pFunction: IFunctionDeclInstruction): void {
        pFunction.generateInfoAboutUsedData();

        let pUniformVarMap: IMap<IVariableDeclInstruction> = pFunction.uniformVariableMap;
        let pTextureVarMap: IMap<IVariableDeclInstruction> = pFunction.textureVariableMap;
        let pUsedComplexTypeMap: IMap<ITypeInstruction> = pFunction.usedComplexTypeMap;

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

    private addExtSystemFunction(pFunction: IFunctionDeclInstruction): void {
        if (isNull(this._pExtSystemFunctionList)) {
            this._pExtSystemFunctionList = [];
            this._pExtSystemTypeList = [];
        }

        if (pFunction.instructionType === EInstructionTypes.k_SystemFunctionInstruction) {
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

    private isVariableTypeUse(pVariableType: IVariableTypeInstruction): boolean {
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
