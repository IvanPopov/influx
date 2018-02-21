import { ERenderStates } from "./ERenderStates";
import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";
import { IParseNode } from "./parser/IParser";

export enum EAFXInstructionTypes {
    k_Instruction = 0,
    k_InstructionCollector,
    k_SimpleInstruction,
    k_VariableTypeInstruction,
    k_SystemTypeInstruction,
    k_ComplexTypeInstruction,
    k_TypedInstruction,
    k_DeclInstruction,
    k_IntInstruction,
    k_FloatInstruction,
    k_BoolInstruction,
    k_StringInstruction,
    k_IdInstruction,
    k_KeywordInstruction,
    k_TypeDeclInstruction,
    k_VariableDeclInstruction,
    k_AnnotationInstruction,
    k_UsageTypeInstruction,
    k_BaseTypeInstruction,
    k_StructDeclInstruction,
    k_StructFieldsInstruction,
    k_ExprInstruction,
    k_IdExprInstruction,
    k_ArithmeticExprInstruction,
    k_AssignmentExprInstruction,
    k_RelationalExprInstruction,
    k_LogicalExprInstruction,
    k_ConditionalExprInstruction,
    k_CastExprInstruction,
    k_UnaryExprInstruction,
    k_PostfixIndexInstruction,
    k_PostfixArithmeticInstruction,
    k_PrimaryExprInstruction,
    k_ComplexExprInstruction,
    k_FunctionCallInstruction,
    k_SystemCallInstruction,
    k_ConstructorCallInstruction,
    k_CompileExprInstruction,
    k_InitExprInstruction,
    k_SamplerStateBlockInstruction,
    k_SamplerStateInstruction,
    // k_ExtractExprInstruction,
    k_FunctionDeclInstruction,
    k_ShaderFunctionInstruction,
    k_SystemFunctionInstruction,
    k_FunctionDefInstruction,
    k_StmtInstruction,
    k_StmtBlockInstruction,
    k_ExprStmtInstruction,
    k_BreakStmtInstruction,
    k_WhileStmtInstruction,
    k_ForStmtInstruction,
    k_IfStmtInstruction,
    k_DeclStmtInstruction,
    k_ReturnStmtInstruction,
    // k_ExtractStmtInstruction,
    k_SemicolonStmtInstruction,
    k_PassInstruction,
    k_TechniqueInstruction
}


export enum EFunctionType {
    k_Vertex = 0,
    k_Pixel = 1,
    k_Function = 2,
    k_PassFunction = 3
}

export enum ECheckStage {
    CODE_TARGET_SUPPORT, /* Отсутсвуют конструкции не поддерживаемые языком назначения (GLSL) */
    SELF_CONTAINED /* Код замкнут, нет не определенных функций, пассов, техник. Нет мертвых функций. */
    // VALIDATION  /* Код не содерит синтаксиески неправильных выражений, то что не исчерпывается */ 
}

export enum EVarUsedMode {
    k_Read,
    k_Write,
    k_ReadWrite,
    k_Undefined,
    k_Default = k_ReadWrite
}

export interface IAFXInstructionStateMap extends IMap<string> {
}

export interface IAFXInstructionRoutine {
    (): void;
}

export interface IAFXInstructionError {
    code: number;
    info: any;
}

export interface IAFXTypeUseInfoContainer {
    type: IAFXVariableTypeInstruction;
    isRead: boolean;
    isWrite: boolean;
    numRead: number;
    numWrite: number;
    numUsed: number;
}

export enum EExtractExprType {
    k_Header,

    k_Float,
    k_Int,
    k_Bool,

    k_Float2,
    k_Int2,
    k_Bool2,

    k_Float3,
    k_Int3,
    k_Bool3,

    k_Float4,
    k_Int4,
    k_Bool4,

    k_Float4x4
}



/**
 * All opertion are represented by: 
 * operator : arg1 ... argn
 * Operator and instructions may be empty.
 */
export interface IAFXInstruction {
    parent: IAFXInstruction;
    operator: string;
    instructions: IAFXInstruction[];
    visible: boolean;
    scope: number;
    
    readonly instructionType: EAFXInstructionTypes;
    readonly sourceNode: IParseNode | null;
    readonly instructionID: number;
    readonly globalScope: boolean;

    _check(eStage: ECheckStage): boolean;
    _getLastError(): IAFXInstructionError;
    _setError(eCode: number, pInfo?: any): void;
    _clearError(): void;
    _isErrorOccured(): boolean;

    push(pInstruction: IAFXInstruction, isSetParent?: boolean): void;
    prepareFor(eUsedType: EFunctionType): void;

    toString(): string;
    toCode(): string;
    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXInstruction;
}

export interface IAFXSimpleInstruction extends IAFXInstruction {
    value: string;
}

export interface IAFXTypeInstruction extends IAFXInstruction {
    toDeclString(): string;

    size: number;
    name: string;
    realName: string;

    readonly builtIn: boolean;
    readonly hash: string;
    readonly strongHash: string;
    readonly baseType: IAFXTypeInstruction;
    readonly length: number;
    readonly arrayElementType: IAFXTypeInstruction;
    readonly typeDecl: IAFXTypeDeclInstruction;
    readonly writable: boolean;
    readonly readable: boolean;

    isBase(): boolean;
    isArray(): boolean;
    isNotBaseArray(): boolean;
    isComplex(): boolean;
    isEqual(pType: IAFXTypeInstruction): boolean;
    isStrongEqual(pType: IAFXTypeInstruction): boolean;
    isConst(): boolean;
    isSampler(): boolean;
    isSamplerCube(): boolean;
    isSampler2D(): boolean;
    isContainArray(): boolean;
    isContainSampler(): boolean;
    isContainComplexType(): boolean;

    hasField(sFieldName: string): boolean;
    hasFieldWithSematic(sSemantic: string);
    hasAllUniqueSemantics(): boolean;
    hasFieldWithoutSemantic(): boolean;

    getField(sFieldName: string): IAFXVariableDeclInstruction;
    getFieldBySemantic(sSemantic: string): IAFXVariableDeclInstruction;
    getFieldType(sFieldName: string): IAFXVariableTypeInstruction;
    getFieldNameList(): string[];

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypeInstruction;
}

export interface IAFXVariableTypeInstruction extends IAFXTypeInstruction {
    collapsed: boolean;

    isFromVariableDecl(): boolean;
    isFromTypeDecl(): boolean;

    isUniform(): boolean;
    isConst(): boolean;

    isTypeOfField(): boolean;
    isUnverifiable(): boolean;

	/**
	 * init api
	 */
    setPadding(iPadding: number): void;
    pushType(pType: IAFXTypeInstruction): void;
    addUsage(sUsage: string): void;
    addArrayIndex(pExpr: IAFXExprInstruction): void;

    markAsUnverifiable(isUnverifiable: boolean): void;
    addAttrOffset(pOffset: IAFXVariableDeclInstruction): void;

	/**
	 * Type info
	 */
    padding: number;
    arrayElementType: IAFXVariableTypeInstruction;

    usageList: string[];
    subType: IAFXTypeInstruction;

    hasUsage(sUsageName: string): boolean;

    getFieldExpr(sFieldName: string): IAFXIdExprInstruction;
    getFieldIfExist(sFieldName: string): IAFXVariableDeclInstruction;

    subVarDecls: IAFXVariableDeclInstruction[];

    fullName: string;
    varDeclName: string;
    typeDeclName: string;

    parentVarDecl: IAFXVariableDeclInstruction;
    parentContainer: IAFXVariableDeclInstruction;
    mainVariable: IAFXVariableDeclInstruction;
    attrOffset: IAFXVariableDeclInstruction;

	/**
	 * System
	 */
    wrap(): IAFXVariableTypeInstruction;

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXVariableTypeInstruction;

    setCloneHash(sHash: string, sStrongHash: string): void;
    setCloneArrayIndex(pElementType: IAFXVariableTypeInstruction, pIndexExpr: IAFXExprInstruction, iLength: number): void;
    setCloneFields(pFieldMap: IMap<IAFXVariableDeclInstruction>): void;
}


export interface IAFXTypedInstruction extends IAFXInstruction {
    type: IAFXTypeInstruction;
    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypedInstruction;
}


export interface IAFXDeclInstruction extends IAFXTypedInstruction {
    readonly name: string;
    readonly realName: string;
    readonly nameID: IAFXIdInstruction;

    semantics: string;
    annotation: IAFXAnnotationInstruction;
    builtIn: boolean;

    isForAll(): boolean;
    isForPixel(): boolean;
    isForVertex(): boolean;

    setForAll(canUse: boolean): void;
    setForPixel(canUse: boolean): void;
    setForVertex(canUse: boolean): void;

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXDeclInstruction;
}

export interface IAFXTypeDeclInstruction extends IAFXDeclInstruction {
    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXTypeDeclInstruction;
}

export interface IAFXVariableDeclInstruction extends IAFXDeclInstruction {
    initializeExpr: IAFXInitExprInstruction;
    defaultValue: any;

    value: any;
    type: IAFXVariableTypeInstruction;

    nameIndex: number;
    fullNameExpr: IAFXExprInstruction;
    fullName: string;

    name: string;
    realName: string;

    collapsed: boolean;
    attrExtractionBlock: IAFXInstruction;
    vars: IAFXVariableDeclInstruction[];

    lockInitializer(): void;
    unlockInitializer(): void;

    prepareDefaultValue(): void;

    isUniform(): boolean;
    isField(): boolean;
    isSampler(): boolean;

    isDefinedByZero(): boolean;
    defineByZero(isDefine: boolean): void;

    markAsVarying(bValue: boolean): void;
    markAsShaderOutput(isShaderOutput: boolean): void;
    isShaderOutput(): boolean;

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXVariableDeclInstruction;
}

export interface IAFXFunctionDeclInstruction extends IAFXDeclInstruction {
    toFinalDefCode(): string;
    hasImplementation(): boolean;

    arguments: IAFXTypedInstruction[];
    numNeededArguments: number;
    returnType: IAFXVariableTypeInstruction;
    functionType: EFunctionType;

    vertexShader: IAFXFunctionDeclInstruction;
    pixelShader: IAFXFunctionDeclInstruction;

    definition: IAFXDeclInstruction
    implementation: IAFXStmtInstruction;

    attributeVariableMap: IMap<IAFXVariableDeclInstruction>;
    varyingVariableMap: IMap<IAFXVariableDeclInstruction>;

    uniformVariableMap: IMap<IAFXVariableDeclInstruction>;
    textureVariableMap: IMap<IAFXVariableDeclInstruction>;
    usedComplexTypeMap: IMap<IAFXTypeInstruction>;

    attributeVariableKeys: number[];
    varyingVariableKeys: number[];

    uniformVariableKeys: number[];
    textureVariableKeys: number[];
    usedComplexTypeKeys: number[];

    extSystemFunctionList: IAFXFunctionDeclInstruction[];
    extSystemTypeList: IAFXTypeDeclInstruction[];

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXFunctionDeclInstruction;

    addOutVariable(pVariable: IAFXVariableDeclInstruction): boolean;
    getOutVariable(): IAFXVariableDeclInstruction;

    markUsedAs(eUsedType: EFunctionType): void;
    isUsedAs(eUsedType: EFunctionType): boolean;
    isUsedAsFunction(): boolean;
    isUsedAsVertex(): boolean;
    isUsedAsPixel(): boolean;
    isUsed(): boolean;
    markUsedInVertex(): void;
    markUsedInPixel(): void;
    isUsedInVertex(): boolean;
    isUsedInPixel(): boolean;
    checkVertexUsage(): boolean;
    checkPixelUsage(): boolean;

    checkDefenitionForVertexUsage(): boolean;
    checkDefenitionForPixelUsage(): boolean;

    canUsedAsFunction(): boolean;
    notCanUsedAsFunction(): void;

    addUsedFunction(pFunction: IAFXFunctionDeclInstruction): boolean;
    getUsedFunctionList(): IAFXFunctionDeclInstruction[];
    addUsedVariable(pVariable: IAFXVariableDeclInstruction): void;

    isBlackListFunction(): boolean;
    addToBlackList(): void;
    getStringDef(): string;

    convertToVertexShader(): IAFXFunctionDeclInstruction;
    convertToPixelShader(): IAFXFunctionDeclInstruction;

    prepareForVertex(): void;
    prepareForPixel(): void;

    generateInfoAboutUsedData(): void;
}


export interface IAFXStructDeclInstruction extends IAFXInstruction {

}


export interface IAFXIdInstruction extends IAFXInstruction {
    name: string;
    realName: string;

    readonly visible: boolean;

    markAsVarying(bValue: boolean): void;

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXIdInstruction;
}


export interface IAFXKeywordInstruction extends IAFXInstruction {
    value: string;
}


export interface IAFXAnalyzedInstruction extends IAFXInstruction {
    addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>, eUsedMode?: EVarUsedMode): void;
}


export interface IAFXExprInstruction extends IAFXTypedInstruction, IAFXAnalyzedInstruction {
    type: IAFXVariableTypeInstruction;

    evaluate(): boolean;
    getEvalValue(): any;
    simplify(): boolean;
    isConst(): boolean;

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXExprInstruction;
}


export interface IAFXInitExprInstruction extends IAFXExprInstruction {
    optimizeForVariableType(pType: IAFXVariableTypeInstruction): boolean;
}


export interface IAFXIdExprInstruction extends IAFXExprInstruction {
    readonly type: IAFXVariableTypeInstruction;
    readonly visible: boolean;

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXIdExprInstruction;
}


export interface IAFXLiteralInstruction extends IAFXExprInstruction {
    value: any;
    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction;
}


export interface IAFXAnnotationInstruction extends IAFXInstruction {
}


export interface IAFXStmtInstruction extends IAFXInstruction, IAFXAnalyzedInstruction {
}


export interface IAFXPassInstruction extends IAFXDeclInstruction {
    addFoundFunction(pNode: IParseNode, pShader: IAFXFunctionDeclInstruction, eType: EFunctionType): void;
    getFoundedFunction(pNode: IParseNode): IAFXFunctionDeclInstruction;
    getFoundedFunctionType(pNode: IParseNode): EFunctionType;
    addCodeFragment(sCode: string): void;

    uniformVariableMapV: IMap<IAFXVariableDeclInstruction>;
    textureVariableMapV: IMap<IAFXVariableDeclInstruction>;
    usedComplexTypeMapV: IMap<IAFXTypeInstruction>;

    uniformVariableMapP: IMap<IAFXVariableDeclInstruction>;
    textureVariableMapP: IMap<IAFXVariableDeclInstruction>;
    usedComplexTypeMapP: IMap<IAFXTypeInstruction>;

    fullUniformMap: IMap<IAFXVariableDeclInstruction>;
    fullTextureMap: IMap<IAFXVariableDeclInstruction>;

    vertexShader: IAFXFunctionDeclInstruction;
    pixelShader: IAFXFunctionDeclInstruction;
    renderStates: IMap<ERenderStateValues>;

    isComplexPass();
    addShader(pShader: IAFXFunctionDeclInstruction): void;
    setState(eType: ERenderStates, eValue: ERenderStateValues): void;
    finalizePass(): void;
    evaluate(pEngineStates: any, pForeigns: any, pUniforms: any): boolean;

    getState(eType: ERenderStates): ERenderStateValues;
}


export interface IAFXTechniqueInstruction extends IAFXDeclInstruction {
    name: string;
    complexName: boolean;
    passList: IAFXPassInstruction[];

    isPostEffect(): boolean;
    addPass(pPass: IAFXPassInstruction): void;
    getPass(iPass: number): IAFXPassInstruction;

    totalOwnPasses: number;
    totalPasses: number;
}


export interface IAFXVariableBlendInfo {
    varList: IAFXVariableDeclInstruction[];
    blendType: IAFXVariableTypeInstruction;
    name: string;
    nameIndex: number;
}


export interface IAFXVariableBlendInfoMap {
    [index: number]: IAFXVariableBlendInfo;
}


export interface IAFXFunctionDeclListMap {
    [functionName: string]: IAFXFunctionDeclInstruction[];
}
