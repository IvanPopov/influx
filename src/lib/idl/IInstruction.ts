import { ERenderStates } from "./ERenderStates";
import { IdExprInstruction } from "./../fx/instructions/IdExprInstruction";
import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";
import { IParseNode } from "./parser/IParser";

export enum EInstructionTypes {
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
    k_PostfixPointInstruction,
    k_PostfixArithmeticInstruction,
    k_ComplexExprInstruction,
    k_FunctionCallInstruction,
    k_SystemCallInstruction,
    k_ConstructorCallInstruction,
    k_CompileExprInstruction,
    k_InitExprInstruction,
    k_SamplerStateBlockInstruction,
    k_SamplerStateInstruction,
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


export interface IInstructionError {
    code: number;
    info: any;
}

export interface ITypeUseInfoContainer {
    type: IVariableTypeInstruction;
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
export interface IInstruction {
    parent: IInstruction;
    scope: number;
    /** Specifies whether to display the instruction in the code. */
    visible: boolean;

    readonly operator: string;
    readonly instructions: IInstruction[];

    readonly sourceNode: IParseNode | null;
    readonly instructionType: EInstructionTypes;
    readonly instructionID: number;
    readonly globalScope: boolean;

    _check(eStage: ECheckStage): boolean;
    _getLastError(): IInstructionError;
    _setError(eCode: number, pInfo?: any): void;
    _clearError(): void;
    _isErrorOccured(): boolean;

    push(pInstruction: IInstruction, isSetParent?: boolean): void;
    prepareFor(eUsedType: EFunctionType): void;

    toString(): string;
    toCode(): string;
}

export interface ISimpleInstruction extends IInstruction {
    value: string;
}

export interface ITypeInstruction extends IInstruction {
    toDeclString(): string;

    size: number;
    name: string;
    realName: string;

    readonly builtIn: boolean;
    readonly hash: string;
    readonly strongHash: string;
    readonly baseType: ITypeInstruction;
    readonly length: number;
    readonly arrayElementType: ITypeInstruction;
    readonly typeDecl: ITypeDeclInstruction;

    writable: boolean;
    readable: boolean;

    fieldNameList: string[];
    fieldDeclList: IVariableDeclInstruction[];

    isBase(): boolean;
    isArray(): boolean;
    isNotBaseArray(): boolean;
    isComplex(): boolean;
    isEqual(pType: ITypeInstruction): boolean;
    isStrongEqual(pType: ITypeInstruction): boolean;
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

    getField(sFieldName: string): IVariableDeclInstruction;
    getFieldBySemantic(sSemantic: string): IVariableDeclInstruction;
    getFieldType(sFieldName: string): IVariableTypeInstruction;

}

export interface IVariableTypeInstruction extends ITypeInstruction {
    readonly builtIn;
    readonly hash: string;
    readonly strongHash: string;
    readonly typeDecl: ITypeDeclInstruction;
    readonly usageList: string[];
    readonly subType: ITypeInstruction;
    readonly vars: IVariableDeclInstruction[];
    readonly fullName: string;
    readonly varDeclName: string;
    readonly typeDeclName: string;
    readonly parentContainer: IVariableDeclInstruction;
    readonly mainVariable: IVariableDeclInstruction;
    readonly arrayElementType: IVariableTypeInstruction;
    readonly attrOffset: IVariableDeclInstruction;

    name: string;
    realName: string;
    writable: boolean;
    readable: boolean;
    padding: number;
    collapsed: boolean;
    parentVarDecl: IVariableDeclInstruction;

    isFromVariableDecl(): boolean;
    isFromTypeDecl(): boolean;
    isContainComplexType(): boolean;
    isContainArray(): boolean;
    isSampler2D(): boolean;
    isContainSampler(): boolean;
    isUniform(): boolean;
    isConst(): boolean;
    isTypeOfField(): boolean;

    pushType(pType: ITypeInstruction): void;
    addUsage(sUsage: string): void;
    addArrayIndex(pExpr: IExprInstruction): void;
    addAttrOffset(pOffset: IVariableDeclInstruction): void;

    hasUsage(sUsageName: string): boolean;
    hasField(sFieldName: string): boolean;
    hasFieldWithSematic(sSemantic: string): boolean;
    hasAllUniqueSemantics(): boolean;
    hasFieldWithoutSemantic(): boolean;

    getFieldExpr(sFieldName: string): IIdExprInstruction;
    getFieldIfExist(sFieldName: string): IVariableDeclInstruction;
    getFieldBySemantic(sSemantic: string): IVariableDeclInstruction;
    getFieldType(sFieldName: string): IVariableTypeInstruction;
    getFieldIfExist(sFieldName: string): IVariableDeclInstruction;

    wrap(): IVariableTypeInstruction;
}


export interface ITypedInstruction extends IInstruction {
    type: ITypeInstruction;
}


export interface IDeclInstruction extends ITypedInstruction {
    readonly name: string;
    readonly realName: string;
    readonly nameID: IIdInstruction;

    semantics: string;
    annotation: IAnnotationInstruction;
    builtIn: boolean;

    vertex: boolean;
    pixel: boolean;
}


export interface IFunctionDefInstruction extends IDeclInstruction {
    /** Return type. */
    type: ITypeInstruction;
    returnType: ITypeInstruction; 
    functionName: IIdInstruction;
    name: string;
    realName: string;
    arguments: IVariableDeclInstruction[];
    numArgsRequired: number;
    shaderDef: boolean; // << Is it function represent shader?
    stringDef: string;  // << declaration with uniq name

    readonly paramListForShaderInput: IVariableDeclInstruction[];

    addParameter(pParam: IVariableDeclInstruction, useStrict?: boolean): boolean;
    
    /** Determines if the function has a complex type on the input of the shader. */
    isComplexShaderInput(): boolean; // << todo: rename! 

    setShaderParams(pParamList: IVariableDeclInstruction[], isComplexInput: boolean): void;
    
    /** TODO: remove or rename/fix */
    setAnalyzedInfo(isAnalyzedForVertexUsage: boolean, isAnalyzedForPixelUsage: boolean, bCanUsedAsFunction: boolean);

    canUsedAsFunction(): boolean;
    checkForVertexUsage(): boolean;
    checkForPixelUsage(): boolean;
}


export interface ITypeDeclInstruction extends IDeclInstruction {
}

export interface IVariableDeclInstruction extends IDeclInstruction {
    readonly initializeExpr: IInitExprInstruction;
    readonly defaultValue: any;
    readonly type: IVariableTypeInstruction;
    readonly nameID: IIdInstruction;
    readonly vars: IVariableDeclInstruction[];
    readonly nameIndex: number;
    readonly fullNameExpr: IExprInstruction;
    readonly fullName: string;
    
    value: any;
    varying: boolean;
    shaderOutput: boolean;

    name: string;
    realName: string;

    collapsed: boolean;
    attrExtractionBlock: IInstruction;

    lockInitializer(): void;
    unlockInitializer(): void;

    prepareDefaultValue(): void;
    fillNameIndex(): void;

    isUniform(): boolean;
    isField(): boolean;
    isSampler(): boolean;
}

export interface IFunctionDeclInstruction extends IDeclInstruction {
    readonly nameID: IIdInstruction;
    readonly arguments: ITypedInstruction[];
    readonly numArgsRequired: number;
    readonly type: ITypeInstruction;
    readonly returnType: IVariableTypeInstruction;

    readonly vertexShader: IFunctionDeclInstruction;
    readonly pixelShader: IFunctionDeclInstruction;
    readonly stringDef: string;
    
    readonly attributeVariableMap: IMap<IVariableDeclInstruction>;
    readonly varyingVariableMap: IMap<IVariableDeclInstruction>;
    
    readonly uniformVariableMap: IMap<IVariableDeclInstruction>;
    readonly textureVariableMap: IMap<IVariableDeclInstruction>;
    readonly usedComplexTypeMap: IMap<ITypeInstruction>;
    
    readonly attributeVariableKeys: number[];
    readonly varyingVariableKeys: number[];
    
    readonly uniformVariableKeys: number[];
    readonly textureVariableKeys: number[];
    readonly usedComplexTypeKeys: number[];
    readonly usedFunctionList: IFunctionDeclInstruction[];
    
    readonly extSystemFunctionList: IFunctionDeclInstruction[];
    readonly extSystemTypeList: ITypeDeclInstruction[];
    
    definition: IDeclInstruction
    implementation: IStmtInstruction;
    functionType: EFunctionType;

    addOutVariable(pVariable: IVariableDeclInstruction): boolean;
    getOutVariable(): IVariableDeclInstruction;

    isUsedAs(eUsedType: EFunctionType): boolean;
    isUsedAsFunction(): boolean;
    isUsedAsVertex(): boolean;
    isUsedAsPixel(): boolean;
    isUsed(): boolean;
    isUsedInVertex(): boolean;
    isUsedInPixel(): boolean;

    checkVertexUsage(): boolean;
    checkPixelUsage(): boolean;

    markUsedAs(eUsedType: EFunctionType): void;
    markUsedInVertex(): void;
    markUsedInPixel(): void;

    checkDefenitionForVertexUsage(): boolean;
    checkDefenitionForPixelUsage(): boolean;

    canUsedAsFunction(): boolean;
    notCanUsedAsFunction(): void;

    addUsedFunction(pFunction: IFunctionDeclInstruction): boolean;
    addUsedVariable(pVariable: IVariableDeclInstruction): void;

    convertToVertexShader(): IFunctionDeclInstruction;
    convertToPixelShader(): IFunctionDeclInstruction;

    prepareForVertex(): void;
    prepareForPixel(): void;

    generateInfoAboutUsedData(): void;

    isBlackListFunction(): boolean;
    addToBlackList(): void;
}


export interface IStructDeclInstruction extends IInstruction {

}


export interface IIdInstruction extends IInstruction {
    name: string;
    realName: string;
    varying: boolean;

    readonly visible: boolean;
}


export interface IKeywordInstruction extends IInstruction {
    value: string;
}


export interface IAnalyzedInstruction extends IInstruction {
    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>, eUsedMode?: EVarUsedMode): void;
}


export interface IExprInstruction extends ITypedInstruction, IAnalyzedInstruction {
    type: IVariableTypeInstruction;

    evaluate(): boolean;
    getEvalValue(): any;
    simplify(): boolean;
    isConst(): boolean;
}


export interface ISamplerStateBlockInstruction extends IExprInstruction {
    texture: IVariableDeclInstruction;
    addState(sStateType: string, sStateValue: string): void;
}


export interface ICompileExprInstruction extends IExprInstruction {
    readonly function: IFunctionDeclInstruction;
}


export interface IPairedExprInstruction extends IExprInstruction {
    readonly left: IInstruction;
    readonly right: IInstruction;
}

export interface IAssignmentExprInstruction extends IPairedExprInstruction {

}


export interface IInitExprInstruction extends IExprInstruction {
    optimizeForVariableType(pType: IVariableTypeInstruction): boolean;
}


export interface IIdExprInstruction extends IExprInstruction {
    type: IVariableTypeInstruction;
    readonly visible: boolean;

}


export interface IFunctionCallInstruction extends IIdExprInstruction {
    readonly declaration: IFunctionDeclInstruction;
}


export interface ILiteralInstruction extends IExprInstruction {
    value: any;
}


export interface IAnnotationInstruction extends IInstruction {
}


export interface IStmtInstruction extends IInstruction, IAnalyzedInstruction {
}


export interface IPassInstruction extends IDeclInstruction {
    readonly uniformVariableMapV: IMap<IVariableDeclInstruction>;
    readonly textureVariableMapV: IMap<IVariableDeclInstruction>;
    readonly usedComplexTypeMapV: IMap<ITypeInstruction>;

    readonly uniformVariableMapP: IMap<IVariableDeclInstruction>;
    readonly textureVariableMapP: IMap<IVariableDeclInstruction>;
    readonly usedComplexTypeMapP: IMap<ITypeInstruction>;

    readonly fullUniformMap: IMap<IVariableDeclInstruction>;
    readonly fullTextureMap: IMap<IVariableDeclInstruction>;

    readonly vertexShader: IFunctionDeclInstruction;
    readonly pixelShader: IFunctionDeclInstruction;
    readonly renderStates: IMap<ERenderStateValues>;

    complexPass: boolean;

    addFoundFunction(pNode: IParseNode, pShader: IFunctionDeclInstruction, eType: EFunctionType): void;
    getFoundedFunction(pNode: IParseNode): IFunctionDeclInstruction;
    getFoundedFunctionType(pNode: IParseNode): EFunctionType;
    addCodeFragment(sCode: string): void;

    addShader(pShader: IFunctionDeclInstruction): void;
    setState(eType: ERenderStates, eValue: ERenderStateValues): void;
    finalizePass(): void;
    evaluate(pEngineStates: any, pForeigns: any, pUniforms: any): boolean;

    getState(eType: ERenderStates): ERenderStateValues;
}


export interface ITechniqueInstruction extends IDeclInstruction {
    name: string;
    complexName: boolean;

    readonly passList: IPassInstruction[];
    readonly totalPasses: number;

    addPass(pPass: IPassInstruction): void;
    getPass(iPass: number): IPassInstruction;

}


export interface IVariableBlendInfo {
    varList: IVariableDeclInstruction[];
    blendType: IVariableTypeInstruction;
    name: string;
    nameIndex: number;
}


export interface IVariableBlendInfoMap {
    [index: number]: IVariableBlendInfo;
}


export interface IFunctionDeclListMap {
    [functionName: string]: IFunctionDeclInstruction[];
}
