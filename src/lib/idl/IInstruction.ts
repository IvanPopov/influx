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
    k_Function = 2
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
    readonly parent: IInstruction;
    readonly scope: number;

    /** Specifies whether to display the instruction in the code. */
    readonly visible: boolean;

    readonly sourceNode: IParseNode | null;
    readonly instructionType: EInstructionTypes;
    readonly instructionID: number;
    readonly globalScope: boolean;

    prepareFor(type: EFunctionType): void;

    toString(): string;
    toCode(): string;

    /** Internal API */
    $hide(): void;
    $linkTo(parent: IInstruction): void;
    $linkToScope(scope: number): void;

    _check(eStage: ECheckStage): boolean;
    _getLastError(): IInstructionError;
    _setError(eCode: number, pInfo?: any): void;
    _clearError(): void;
    _isErrorOccured(): boolean;
}


export interface IInstructionCollector extends IInstruction {
    readonly instructions: IInstruction[];
}


export interface ISimpleInstruction extends IInstruction {
    value: string;
}


export interface ITypeInstruction extends IInstruction {
    readonly size: number;
    readonly name: string;
    readonly realName: string;
    readonly baseType: ITypeInstruction;
    readonly length: number;
    readonly arrayElementType: ITypeInstruction;

    readonly builtIn: boolean;
    readonly hash: string;
    readonly strongHash: string;

    readonly writable: boolean;
    readonly readable: boolean;

    readonly fieldNames: string[];
    readonly fields: IVariableDeclInstruction[];

    isBase(): boolean;
    isArray(): boolean;
    isNotBaseArray(): boolean;
    isComplex(): boolean;
    isConst(): boolean;
    isSampler(): boolean;
    isSamplerCube(): boolean;
    isSampler2D(): boolean;
    isContainArray(): boolean;
    isContainSampler(): boolean;
    isContainComplexType(): boolean;

    isEqual(type: ITypeInstruction): boolean;
    isStrongEqual(type: ITypeInstruction): boolean;

    hasField(fieldName: string): boolean;
    hasFieldWithSematics(semantics: string);
    hasAllUniqueSemantics(): boolean;
    hasFieldWithoutSemantics(): boolean;

    getField(fieldName: string): IVariableDeclInstruction;
    getFieldBySemantics(semantics: string): IVariableDeclInstruction;
    getFieldType(fieldName: string): IVariableTypeInstruction;

    toDeclString(): string;
}


export interface IVariableTypeInstruction extends ITypeInstruction {
    readonly usageList: string[];
    readonly subType: ITypeInstruction;
    readonly padding: number;

    isUniform(): boolean;
    hasUsage(sUsageName: string): boolean;

    // for structures internal usage
    $overwritePadding(val: number): void;
}


export interface ITypedInstruction extends IAnalyzedInstruction {
    type: ITypeInstruction;
}


export interface IConditionalExprInstruction extends IExprInstruction {
    readonly condition: IExprInstruction;
    readonly left: ITypedInstruction;
    readonly right: ITypedInstruction;
}


export interface IDeclInstruction extends ITypedInstruction {
    readonly name: string;
    readonly realName: string;
    readonly nameID: IIdInstruction;

    readonly semantics: string;
    readonly annotation: IAnnotationInstruction;

    /** Additional markers */
    readonly builtIn: boolean;
    readonly vertex: boolean;
    readonly pixel: boolean;
}


export interface IFunctionDefInstruction extends IDeclInstruction {
    readonly returnType: ITypeInstruction; 
    readonly functionName: IIdInstruction;
    readonly name: string;
    readonly realName: string;
    readonly arguments: IVariableDeclInstruction[];

    readonly numArgsRequired: number;
    readonly shaderInput: IVariableDeclInstruction[];
    
    // moved to effect.fx
    // addParameter(pParam: IVariableDeclInstruction, useStrict?: boolean): boolean;
    
    /** Determines if the function has a complex type on the input of the shader. */
    isComplexShaderInput(): boolean; // << todo: rename! 
    
    canUsedAsFunction(): boolean;
    checkForVertexUsage(): boolean;
    checkForPixelUsage(): boolean;

    toString(): string;  // << declaration with uniq name

    isShader(): boolean;

    $makeShader(): void;
}


export interface ITypeDeclInstruction extends IDeclInstruction {
    type: ITypeInstruction;
    name: string;
    realName: string;
}

export interface IVariableDeclInstruction extends IDeclInstruction {
    readonly id: IIdInstruction;
    readonly type: IVariableTypeInstruction;
    readonly initExpr: IInitExprInstruction;
    readonly defaultValue: any;
    readonly nameIndex: number;
    readonly fullName: string;

    isUniform(): boolean;
    isField(): boolean;
    isSampler(): boolean;
    isVarying(): boolean;
}

export interface IFunctionDeclInstruction extends IDeclInstruction {
    readonly definition: IFunctionDefInstruction;
    readonly implementation: IStmtInstruction;
    readonly functionType: EFunctionType;
    readonly arguments: IVariableDeclInstruction[];

    readonly vertexShader: IFunctionDeclInstruction;
    readonly pixelShader: IFunctionDeclInstruction;
    
    readonly attributeVariableMap: IMap<IVariableDeclInstruction>;
    readonly varyingVariableMap: IMap<IVariableDeclInstruction>;
    readonly uniformVariableMap: IMap<IVariableDeclInstruction>;
    readonly textureVariableMap: IMap<IVariableDeclInstruction>;
    readonly usedComplexTypeMap: IMap<ITypeInstruction>;

    readonly extSystemFunctionList: IFunctionDeclInstruction[];
    readonly extSystemTypeList: ITypeDeclInstruction[];
    

    isUsedAs(type: EFunctionType): boolean;
    isUsedAsFunction(): boolean;
    isUsedAsVertex(): boolean;
    isUsedAsPixel(): boolean;
    isUsed(): boolean;
    isUsedInVertex(): boolean;
    isUsedInPixel(): boolean;
    canUsedAsFunction(): boolean;

    checkVertexUsage(): boolean;
    checkPixelUsage(): boolean;

    /**
     * Active API
     */

    // todo: remove
    markUsedAs(type: EFunctionType): void;
    markUsedInVertex(): void;
    markUsedInPixel(): void;

    checkDefinitionForVertexUsage(): boolean;
    checkDefinitionForPixelUsage(): boolean;

    convertToVertexShader(): IFunctionDeclInstruction;
    convertToPixelShader(): IFunctionDeclInstruction;

    prepareForVertex(): void;
    prepareForPixel(): void;

    generateInfoAboutUsedData(): void;

    $overwriteType(type: EFunctionType): void;
    $linkToImplementationScope(scope: number): void;
}


export interface IStructDeclInstruction extends IInstruction {

}


export interface IIdInstruction extends IInstruction {
    readonly name: string;
    readonly realName: string;

    /** Specifies whether to emit ID to source code or not. */
    readonly visible: boolean;
}


export interface IKeywordInstruction extends IInstruction {
    value: string;
}


export interface IAnalyzedInstruction extends IInstruction {
    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>, eUsedMode?: EVarUsedMode): void;
}


export interface IExprInstruction extends ITypedInstruction, IAnalyzedInstruction {
    readonly type: IVariableTypeInstruction;

    evaluate(): boolean;
    getEvalValue(): any;

    isConst(): boolean;
}


export interface IConstructorCallInstruction extends IExprInstruction {
    arguments: IInstruction[];
    ctor: IVariableTypeInstruction;
}


export interface ISamplerStateBlockInstruction extends IExprInstruction {
    readonly texture: IVariableDeclInstruction;
    readonly params: IMap<string>;
    readonly operator: string;
}


export interface ICompileExprInstruction extends IExprInstruction {
    readonly function: IFunctionDeclInstruction;
}


export interface IPairedExprInstruction extends IExprInstruction {
    readonly left: IInstruction;
    readonly right: IInstruction;
    readonly operator: string;
}

export interface IAssignmentExprInstruction extends IPairedExprInstruction {
    readonly operator: string;
    readonly left: IInstruction;
    readonly right: IInstruction;
}


export interface IInitExprInstruction extends IExprInstruction {
    readonly arguments: IExprInstruction[];

    isArray(): boolean;
    isConst(): boolean;
    
    optimizeForVariableType(type: IVariableTypeInstruction): boolean;
    
}


export interface IIdExprInstruction extends IExprInstruction {
    readonly type: IVariableTypeInstruction;
    readonly visible: boolean;
    readonly declaration: IDeclInstruction;
}


export interface IFunctionCallInstruction extends IIdExprInstruction {
    readonly declaration: IFunctionDeclInstruction;
    readonly args: IExprInstruction[];
}


export interface ILiteralInstruction extends IExprInstruction {
    readonly value: number | string | boolean;
}


export interface IAnnotationInstruction extends IInstruction {
}


export interface IStmtInstruction extends IInstruction, IAnalyzedInstruction {
}

export interface IIfStmtInstruction extends IStmtInstruction {
    readonly cond: IExprInstruction;
    readonly ifStmt: IStmtInstruction;
    readonly elseStmt: IStmtInstruction;
}


export interface IStmtBlockInstruction extends IStmtInstruction {
    readonly instructions: IStmtInstruction[];
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


    finalizePass(): void;
    evaluate(pEngineStates: any, pForeigns: any, pUniforms: any): boolean;
    getState(eType: ERenderStates): ERenderStateValues;
}


export interface ITechniqueInstruction extends IDeclInstruction {
    name: string;

    readonly passList: IPassInstruction[];
}


export interface IFunctionDeclListMap {
    [functionName: string]: IFunctionDeclInstruction[];
}
