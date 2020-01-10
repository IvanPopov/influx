import { ERenderStates } from "@lib/idl/ERenderStates";
import { ERenderStateValues } from "@lib/idl/ERenderStateValues";
import { IMap } from "@lib/idl/IMap";
import { IParseNode } from "@lib/idl/parser/IParser";

export enum EInstructionTypes {
    k_Instruction = 0,
    
    k_Id,
    k_Provide,
    k_Collector,
    k_Keyword,      // FIXME: useless type
    k_Simple,       // FIXME: useless type
    k_SamplerState,
    k_Attribute,
    k_Annotation,   // FIXME: instruction is not fully implemented
    k_UsageType,    // FIXME: instruction is not implemented
    
    k_Typed,        // NOTE: Abstract type
    k_VariableType,
    k_SystemType,
    k_ComplexType,
    k_ProxyType,
    
    k_Expr,         // NOTE: Abstract type
    k_IdExpr,
    k_IntExpr,
    k_FloatExpr,
    k_BoolExpr,
    k_StringExpr,
    k_ArithmeticExpr,
    k_AssignmentExpr,
    k_RelationalExpr,
    k_LogicalExpr,
    k_ConditionalExpr,
    k_CastExpr,
    k_UnaryExpr,
    k_PostfixIndexExpr,
    k_PostfixPointExpr,
    k_PostfixArithmeticExpr,
    k_ComplexExpr,
    k_FunctionCallExpr,
    k_ConstructorCallExpr,
    k_CompileExpr,
    k_InitExpr,
    k_SamplerStateBlockExpr,

    k_Decl,
    k_TypeDecl,
    k_VariableDecl,
    k_StructDecl,
    k_FunctionDecl,
    k_SystemFunctionDecl,
    k_FunctionDef,
    k_PassDecl,
    k_TechniqueDecl,
    
    k_Stmt,
    k_ExprStmt,
    k_BreakStmt,
    k_WhileStmt,
    k_ForStmt,
    k_IfStmt,
    k_DeclStmt,
    k_ReturnStmt,
    k_SemicolonStmt,
    k_StmtBlock,
    
    // part fx
    k_PartFxDecl,
    k_PartFxPass,
    k_SpawnStmt
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


export interface ITypeTemplate {
    readonly scope: IScope;
    readonly name: string;
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction;
    typeName(args?: ITypeInstruction[]): string;
}


export interface IScope {
    strictMode: boolean;

    readonly parent: IScope;
    readonly type: EScopeType;

    readonly variables: IMap<IVariableDeclInstruction>;
    readonly types: IMap<ITypeInstruction>;
    readonly functions: IMap<IFunctionDeclInstruction[]>;
    readonly typeTemplates: IMap<ITypeTemplate>;
    
    readonly techniques: IMap<ITechniqueInstruction>;

    /** Recursive check for all parents for strict mode */
    isStrict(): boolean;

    findVariable(variableName: string): IVariableDeclInstruction;
    findType(typeName: string): ITypeInstruction;
    findTypeTemplate(typeName: string): ITypeTemplate;
    findFunction(funcName: string, args: Array<ITypeInstruction | RegExp>): IFunctionDeclInstruction | null | undefined;
    findTechnique(techName: string): ITechniqueInstruction | null;

    /** @deprecated */
    findFunctionInScope(func: IFunctionDeclInstruction): IFunctionDeclInstruction;

    addVariable(variable: IVariableDeclInstruction): boolean;
    addType(type: ITypeInstruction): boolean;
    addTypeTemplate(template: ITypeTemplate): boolean;
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

    readonly sourceNode: IParseNode | null;
    readonly instructionType: EInstructionTypes;
    readonly instructionID: number;
    readonly instructionName: string;

    toString(): string;
    toCode(): string;

    /** Internal API */
    $withParent<T extends IInstruction>(parent: IInstruction): T;
    $withNoParent<T extends IInstruction>(): T;

    /** @deprecated */
    _check(eStage: ECheckStage): boolean;
    /** @deprecated */
    _getLastError(): IInstructionError;
    /** @deprecated */
    _setError(eCode: number, pInfo?: any): void;
    /** @deprecated */
    _clearError(): void;
    /** @deprecated */
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

    readonly writable: boolean;
    readonly readable: boolean;

    readonly fieldNames: string[];
    readonly fields: IVariableDeclInstruction[];
    readonly methods: IFunctionDeclInstruction[];

    /** 
     * @deprecated
     * Use type.equals() instead.
     */
    isEqual(type: ITypeInstruction): boolean;

    isBase(): boolean;
    isArray(): boolean;
    // Returns true is type is user defined array.
    // an user defined array like: float f[4]
    // not: float4 
    isNotBaseArray(): boolean;
    isComplex(): boolean;
    isConst(): boolean;

    /** @deprecated */
    isContainArray(): boolean;
    /** @deprecated */
    isContainSampler(): boolean;
    /** @deprecated */
    isContainComplexType(): boolean;

    hasField(fieldName: string): boolean;
    hasFieldWithSematics(semantic: string);
    hasAllUniqueSemantics(): boolean;
    hasFieldWithoutSemantics(): boolean;

    getField(fieldName: string): IVariableDeclInstruction;
    getFieldBySemantics(semantic: string): IVariableDeclInstruction;

    // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    getMethod(methodName: string, args?: Array<ITypeInstruction | RegExp>): IFunctionDeclInstruction;

    /** @deprecated */
    toDeclString(): string;


    isUAV(): boolean;
    isSampler(): boolean;
    isTexture(): boolean;
}


export type IVariableUsage = 'uniform' | 'const' | 'in' | 'out' | 'inout';

export interface IVariableTypeInstruction extends ITypeInstruction {
    readonly usages: IVariableUsage[];
    readonly subType: ITypeInstruction;
    readonly padding: number;

    isUniform(): boolean;

    hasUsage(usageName: IVariableUsage): boolean;

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

    readonly semantic: string;
    readonly annotation: IAnnotationInstruction;
}


export interface IFunctionDefInstruction extends IDeclInstruction {
    readonly returnType: IVariableTypeInstruction;
    readonly name: string;
    readonly params: IVariableDeclInstruction[];
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

    isParameter(): boolean;
    isLocal(): boolean;
    isGlobal(): boolean;
    isField(): boolean;
}


export interface IFunctionDeclInstruction extends IDeclInstruction {
    readonly def: IFunctionDefInstruction;
    readonly impl: IStmtBlockInstruction;
    readonly attributes: IAttributeInstruction[];
}


export interface IStructDeclInstruction extends IInstruction {

}


export interface IIdInstruction extends IInstruction {
    readonly name: string;
}


export interface IKeywordInstruction extends IInstruction {
    value: string;
}


export interface IExprInstruction extends ITypedInstruction {
    readonly type: IVariableTypeInstruction;

    /** @deprecated */
    evaluate(): boolean;
    /** @deprecated */
    getEvalValue(): any;

    isConst(): boolean;
    isConstExpr(): boolean;
}

export type ILogicalOperator = "&&" | "||";

export interface ILogicalExprInstruction extends IExprInstruction {
    operator: ILogicalOperator;
    left: IExprInstruction;
    right: IExprInstruction;
}

export type IUnaryOperator = "+" | "-" | "!" | "++" | "--";

export interface IUnaryExprInstruction extends IExprInstruction {
    readonly expr: IExprInstruction;
    readonly operator: IUnaryOperator;
}

export interface IPostfixPointInstruction extends IExprInstruction {
    readonly element: IExprInstruction;
    readonly postfix: IIdExprInstruction;
}


export interface IPostfixIndexInstruction extends IExprInstruction {
    readonly index: IExprInstruction;
    readonly element: IExprInstruction;
}


export interface IConstructorCallInstruction extends IExprInstruction {
    readonly args: IInstruction[];
    readonly ctor: IVariableTypeInstruction;
}

export interface IArithmeticExprInstruction extends IExprInstruction {
    readonly right: IExprInstruction;
    readonly left: IExprInstruction;
    readonly operator: '+' | '-' | '/' | '*' | '%';
}

export interface ICastExprInstruction extends IExprInstruction {
    readonly expr: IExprInstruction;

    isUseless(): boolean;
}


export interface IComplexExprInstruction extends IExprInstruction {
    readonly expr: IExprInstruction;
}


export interface IPostfixArithmeticInstruction extends IExprInstruction {
    readonly expr: IExprInstruction;
    readonly operator: string;
}


export interface ISamplerStateBlockInstruction extends IExprInstruction {
    readonly texture: IVariableDeclInstruction;
    readonly params: ISamplerStateInstruction[];
    readonly operator: string;
}


export interface ICompileExprInstruction extends IExprInstruction {
    readonly function: IFunctionDeclInstruction;
    readonly args: IExprInstruction[];
}


export interface IRelationalExprInstruction extends IExprInstruction {
    readonly left: IExprInstruction;
    readonly right: IExprInstruction;
    readonly operator: string;
}

export interface IAssignmentExprInstruction extends IExprInstruction {
    readonly operator: string;
    readonly left: IExprInstruction;
    readonly right: ITypedInstruction;
}


export interface IInitExprInstruction extends IExprInstruction {
    readonly args: IExprInstruction[];

    isArray(): boolean;
    isConst(): boolean;

    // todo: refactor this!!
    optimizeForVariableType(type: IVariableTypeInstruction): boolean;
}


export interface IIdExprInstruction extends IExprInstruction {
    readonly name: string;
    readonly id: IIdInstruction;

    /** @helpers */
    readonly type: IVariableTypeInstruction;
    readonly decl: IVariableDeclInstruction;
}


export interface IFunctionCallInstruction extends IExprInstruction {
    readonly callee: IExprInstruction;
    readonly args: IExprInstruction[];

    // move it to method?
    readonly decl: IFunctionDeclInstruction;   
}


export interface ILiteralInstruction<T = number | boolean | string> extends IExprInstruction {
    readonly value: T;
}


export type IExprDerived =
    | IArithmeticExprInstruction
    | IAssignmentExprInstruction
    | ICastExprInstruction
    | ICompileExprInstruction
    | IComplexExprInstruction
    | IConditionalExprInstruction
    | IConstructorCallInstruction
    | IFunctionCallInstruction
    | IIdExprInstruction
    | IInitExprInstruction
    | ILiteralInstruction<number>
    | ILiteralInstruction<boolean>
    | ILiteralInstruction<string>
    | ILogicalExprInstruction
    | IPostfixArithmeticInstruction
    | IPostfixIndexInstruction
    | IPostfixPointInstruction
    | IRelationalExprInstruction
    | ISamplerStateBlockInstruction
    | IUnaryExprInstruction;

export interface IAnnotationInstruction extends IInstruction {
}


export interface IStmtInstruction extends IInstruction {
}

export interface IAttributeInstruction extends IInstruction {
    readonly name: string;
    readonly args: ILiteralInstruction<number | boolean>[];
}

export interface IForStmtInstruction extends IStmtInstruction {
    readonly init: ITypedInstruction;
    readonly cond: IExprInstruction;
    readonly step: IExprInstruction;
    readonly body: IStmtInstruction;
}

export type IDoWhileOperator = "do" | "while";

export interface IWhileStmtInstruction extends IStmtInstruction {
    readonly cond: IExprInstruction;
    readonly body: IStmtInstruction;
    readonly operator: IDoWhileOperator;
}

export interface IDeclStmtInstruction extends IStmtInstruction {
    readonly declList: IDeclInstruction[];
}

export type IReturnOperator = "return";

export interface IReturnStmtInstruction extends IStmtInstruction {
    readonly operator: IReturnOperator;
    readonly expr: IExprInstruction;
}

export interface IIfStmtInstruction extends IStmtInstruction {
    readonly cond: IExprInstruction;
    readonly conseq: IStmtInstruction;
    readonly contrary: IStmtInstruction;
    readonly attributes: IAttributeInstruction[];
}


export interface IStmtBlockInstruction extends IStmtInstruction {
    readonly stmtList: IStmtInstruction[];
}



export interface IExprStmtInstruction extends IStmtInstruction {
    expr: IExprInstruction;
}



export interface IPassInstruction extends IDeclInstruction {
    readonly id: IIdInstruction;

    readonly vertexShader: IFunctionDeclInstruction;
    readonly pixelShader: IFunctionDeclInstruction;

    readonly renderStates: IMap<ERenderStateValues>;
    getState(type: ERenderStates): ERenderStateValues;
}


export type IStmtDerived =
    | IDeclStmtInstruction
    | IReturnStmtInstruction
    | IIfStmtInstruction
    | IStmtBlockInstruction
    | IExprStmtInstruction
    | IWhileStmtInstruction
    | IForStmtInstruction;


export enum ETechniqueType {
    k_BasicFx,  // << basic Microsoft DirectX like effect
    k_PartFx,
    k_Unknown
}

export interface ITechniqueInstruction extends IDeclInstruction {
    readonly passList: IPassInstruction[];
    readonly type: ETechniqueType;
}


export interface IFunctionDeclListMap {
    [functionName: string]: IFunctionDeclInstruction[];
}

