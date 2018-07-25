import { ERenderStates } from "./ERenderStates";
import { IDispatch } from "../../sandbox/actions";
import { IdExprInstruction } from "../fx/instructions/IdExprInstruction";
import { ERenderStateValues } from "./ERenderStateValues";
import { IMap } from "./IMap";
import { IParseNode } from "./parser/IParser";
import { ProgramScope } from "../fx/ProgramScope";

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
    k_ConstructorCallInstruction,
    k_CompileExprInstruction,
    k_InitExprInstruction,
    k_SamplerStateBlockInstruction,
    k_SamplerStateInstruction,
    k_FunctionDeclInstruction,
    k_ShaderFunctionInstruction,
    k_SystemFunctionDeclInstruction,
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
    k_TechniqueInstruction,
    k_ProvideInstruction
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


export enum EScopeType {
    k_System,
    k_Global,
    k_Default,
    k_Struct,
    k_Annotation
}

export interface IScope {
    strictMode: boolean;

    readonly parent: IScope;
    readonly type: EScopeType;

    readonly variableMap: IMap<IVariableDeclInstruction>;
    readonly typeMap: IMap<ITypeInstruction>;
    readonly functionMap: IMap<IFunctionDeclInstruction[]>;
    readonly techniqueMap: IMap<ITechniqueInstruction>;

    isStrict(): boolean;

    findVariable(variableName: string): IVariableDeclInstruction;
    findType(typeName: string): ITypeInstruction;
    findFunction(funcName: string, args: ITypedInstruction[]): IFunctionDeclInstruction | null | undefined;
    findShaderFunction(funcName: string, argTypes: ITypedInstruction[]): IFunctionDeclInstruction | null | undefined;
    findTechnique(techName: string): ITechniqueInstruction | null;

    hasVariable(variableName: string): boolean;
    hasType(typeName: string): boolean;
    hasFunction(funcName: string, argTypes: ITypedInstruction[]): boolean;
    hasTechnique(techniqueName: string): boolean;

    hasVariableInScope(variableName: string): boolean;
    hasTypeInScope(typeName: string): boolean;
    hasFunctionInScope(func: IFunctionDeclInstruction): boolean;
    hasTechniqueInScope(tech: ITechniqueInstruction): boolean;

    addVariable(variable: IVariableDeclInstruction): boolean;
    addType(type: ITypeInstruction): boolean;
    addFunction(func: IFunctionDeclInstruction): boolean;
    addTechnique(technique: ITechniqueInstruction): boolean;
}


/**
 * All opertion are represented by: 
 * operator : arg1 ... argn
 * Operator and instructions may be empty.
 */
export interface IInstruction {
    readonly parent: IInstruction;
    readonly scope: IScope;

    /** Specifies whether to display the instruction in the code. */
    readonly visible: boolean;

    readonly sourceNode: IParseNode | null;
    readonly instructionType: EInstructionTypes;
    readonly instructionID: number;
    readonly instructionName: string;

    toString(): string;
    toCode(): string;

    /** Internal API */

    $hide(): void;
    $withParent<T extends IInstruction>(parent: IInstruction): T;
    $withNoParent<T extends IInstruction>(): T;

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
    readonly value: string;
}


export interface IProvideInstruction extends IInstruction {
    readonly moduleName: string;
}



export interface ITypeInstruction extends IInstruction {
    readonly size: number;
    readonly name: string;
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

    toDeclString(): string;
}


export interface IVariableTypeInstruction extends ITypeInstruction {
    readonly usageList: string[];
    readonly subType: ITypeInstruction;
    readonly padding: number;

    isUniform(): boolean;
    hasUsage(usageName: string): boolean;

    // for structures internal usage
    $overwritePadding(val: number): void;
}


export interface ITypedInstruction extends IInstruction {
    readonly type: ITypeInstruction;
}


export interface IConditionalExprInstruction extends IExprInstruction {
    readonly condition: IExprInstruction;
    readonly left: ITypedInstruction;
    readonly right: ITypedInstruction;
}


export interface IDeclInstruction extends IInstruction {
    readonly name: string;
    readonly id: IIdInstruction;

    readonly semantics: string;
    readonly annotation: IAnnotationInstruction;

    // todo: remove it?
    readonly builtIn: boolean;
}


export interface IFunctionDefInstruction extends IDeclInstruction {
    readonly returnType: ITypeInstruction; 
    readonly functionName: IIdInstruction;
    readonly name: string;
    readonly paramList: IVariableDeclInstruction[];
    // todo: remove it.
    readonly numArgsRequired: number;

    toString(): string;              // << declaration with uniq name
}


export interface ITypeDeclInstruction extends IDeclInstruction {
    readonly type: ITypeInstruction;
    readonly name: string;
}


export interface ISamplerStateInstruction extends IInstruction {
    readonly name: string;
    readonly value: IInstruction;
}


export interface IVariableDeclInstruction extends IDeclInstruction, ITypedInstruction {
    readonly id: IIdInstruction;
    readonly type: IVariableTypeInstruction;
    readonly initExpr: IInitExprInstruction;
    readonly defaultValue: any;
    readonly nameIndex: number;

    /**
     * Helper:
     *  Returns 'structName.fieldName' for structs;
     *  Returns 'varName' for variables;
     */
    readonly fullName: string;

    isUniform(): boolean;
    isField(): boolean;
    isSampler(): boolean;
    isVarying(): boolean;

    checkVertexUsage(): boolean;
    checkPixelUsage(): boolean;
}


export interface IFunctionDeclInstruction extends IDeclInstruction {
    readonly definition: IFunctionDefInstruction;
    readonly implementation: IStmtBlockInstruction;
    readonly functionType: EFunctionType;

    checkVertexUsage(): boolean;
    checkPixelUsage(): boolean;

    $overwriteType(type: EFunctionType): void;
}


export interface IStructDeclInstruction extends IInstruction {

}


export interface IIdInstruction extends IInstruction {
    readonly name: string;

    /** Specifies whether to emit ID to source code or not. */
    readonly visible: boolean;
}


export interface IKeywordInstruction extends IInstruction {
    value: string;
}


export interface IExprInstruction extends ITypedInstruction {
    readonly type: IVariableTypeInstruction;

    evaluate(): boolean;
    getEvalValue(): any;

    isConst(): boolean;
}


export interface IConstructorCallInstruction extends IExprInstruction {
    readonly arguments: IInstruction[];
    readonly ctor: IVariableTypeInstruction;
}


export interface ISamplerStateBlockInstruction extends IExprInstruction {
    readonly texture: IVariableDeclInstruction;
    readonly params: ISamplerStateInstruction[];
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
    
    // todo: refactor this!!
    optimizeForVariableType(type: IVariableTypeInstruction): boolean;
}


export interface IIdExprInstruction extends IExprInstruction {
    readonly type: IVariableTypeInstruction;
    readonly declaration: IDeclInstruction;
}


export interface IFunctionCallInstruction extends IExprInstruction {
    readonly args: IExprInstruction[];
    readonly declaration: IDeclInstruction;
}


export interface ILiteralInstruction extends IExprInstruction {
    readonly value: number | string | boolean;
}


export interface IAnnotationInstruction extends IInstruction {
}


export interface IStmtInstruction extends IInstruction {
}

export interface IIfStmtInstruction extends IStmtInstruction {
    readonly cond: IExprInstruction;
    readonly conseq: IStmtInstruction;
    readonly contrary: IStmtInstruction;
}


export interface IStmtBlockInstruction extends IStmtInstruction {
    readonly stmtList: IStmtInstruction[];
}

export interface IPassInstruction extends IDeclInstruction {
    readonly id: IIdInstruction;

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


    getState(type: ERenderStates): ERenderStateValues;

    $finalizePass(): void;
}


export interface ITechniqueInstruction extends IDeclInstruction {
    name: string;

    readonly passList: IPassInstruction[];
}


export interface IFunctionDeclListMap {
    [functionName: string]: IFunctionDeclInstruction[];
}