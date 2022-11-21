import { assert, isDef, isDefAndNotNull, isNull, mwalk } from '@lib/common';
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { EAnalyzerWarnings as EWarnings } from '@lib/idl/EAnalyzerWarnings';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { EInstructionTypes, EScopeType, ETechniqueType, IAnnotationInstruction, IArithmeticOperator, IAttributeInstruction, IBitwiseOperator, ICbufferInstruction, IConstructorCallInstruction, IDeclInstruction, IDoWhileOperator, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IIdInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, ILogicalOperator, IPassInstruction, IPresetInstruction, IPresetPropertyInstruction, IProvideInstruction, IScope, IStmtBlockInstruction, IStmtInstruction, ITechniqueInstruction, ITypeDeclInstruction, ITypedefInstruction, ITypedInstruction, ITypeInstruction, IUnaryOperator, IVariableDeclInstruction, IVariableTypeInstruction, IVariableUsage } from '@lib/idl/IInstruction';
import { IMap } from '@lib/idl/IMap';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IFile, IParseNode, IRange } from "@lib/idl/parser/IParser";
import { Diagnostics } from '@lib/util/Diagnostics';
import { isNumber } from '@lib/util/s3d/type';
import { AnalyzerDiagnostics } from '../AnalyzerDiagnostics';
import { visitor } from '../Visitors';
import { expression, instruction, type } from './helpers';
import { AnnotationInstruction } from './instructions/AnnotationInstruction';
import { ArithmeticExprInstruction } from './instructions/ArithmeticExprInstruction';
import { AssigmentOperator, AssignmentExprInstruction } from "./instructions/AssignmentExprInstruction";
import { AttributeInstruction } from './instructions/AttributeInstruction';
import { BitwiseExprInstruction } from './instructions/BitwiseExprInstruction';
import { BoolInstruction } from './instructions/BoolInstruction';
import { BreakOperator, BreakStmtInstruction } from './instructions/BreakStmtInstruction';
import { CastExprInstruction } from './instructions/CastExprInstruction';
import { CbufferInstruction } from './instructions/CbufferInstruction';
import { CompileExprInstruction } from './instructions/CompileExprInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ComplexTypeInstruction } from './instructions/ComplexTypeInstruction';
import { ConditionalExprInstruction } from './instructions/ConditionalExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { DeclStmtInstruction } from './instructions/DeclStmtInstruction';
import { ExprStmtInstruction } from './instructions/ExprStmtInstruction';
import { FloatInstruction } from './instructions/FloatInstruction';
import { ForStmtInstruction } from './instructions/ForStmtInstruction';
import { FunctionCallInstruction } from './instructions/FunctionCallInstruction';
import { FunctionDeclInstruction } from './instructions/FunctionDeclInstruction';
import { FunctionDefInstruction } from './instructions/FunctionDefInstruction';
import { IdExprInstruction } from './instructions/IdExprInstruction';
import { IdInstruction } from './instructions/IdInstruction';
import { IfStmtInstruction } from './instructions/IfStmtInstruction';
import { InitExprInstruction } from './instructions/InitExprInstruction';
import { Instruction } from './instructions/Instruction';
import { InstructionCollector } from './instructions/InstructionCollector';
import { IntInstruction } from './instructions/IntInstruction';
import { LogicalExprInstruction } from './instructions/LogicalExprInstruction';
import { PassInstruction } from './instructions/PassInstruction';
import { PostfixArithmeticInstruction, PostfixOperator } from './instructions/PostfixArithmeticInstruction';
import { PostfixIndexInstruction } from './instructions/PostfixIndexInstruction';
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';
import { PresetInstruction } from './instructions/Preset';
import { PresetProperty } from './instructions/PresetProperty';
import { ProvideInstruction } from "./instructions/ProvideInstruction";
import { ProxyTypeInstruction } from './instructions/ProxyTypeInstruction';
import { RelationalExprInstruction, RelationOperator } from './instructions/RelationalExprInstruction';
import { ReturnStmtInstruction } from './instructions/ReturnStmtInstruction';
import { SemicolonStmtInstruction } from './instructions/SemicolonStmtInstruction';
import { StmtBlockInstruction } from './instructions/StmtBlockInstruction';
import { StringInstruction } from './instructions/StringInstruction';
import { SystemTypeInstruction } from './instructions/SystemTypeInstruction';
import { TechniqueInstruction } from './instructions/TechniqueInstruction';
import { TypeDeclInstruction } from './instructions/TypeDeclInstruction';
import { TypedefInstruction } from './instructions/TypedefInstruction';
import { UnaryExprInstruction } from './instructions/UnaryExprInstruction';
import { EVariableUsageFlags, VariableDeclInstruction } from './instructions/VariableDeclInstruction';
import { VariableTypeInstruction } from './instructions/VariableTypeInstruction';
import { WhileStmtInstruction } from './instructions/WhileStmtInstruction';
import { ProgramScope, ProgramScopeEx, Scope } from './ProgramScope';
import * as SystemScope from './SystemScope';
import { determBaseType, determMostPreciseBaseType, determTypePrecision, isBoolBasedType, isFloatType, isIntegerType, isMatrixType, isScalarType, isVectorType, isIntBasedType, isUintBasedType, isFloatBasedType, isHalfBasedType, T_BOOL, T_BOOL2, T_BOOL3, T_BOOL4, T_FLOAT4, T_INT, T_UINT, T_VOID } from './SystemScope';


type IErrorInfo = IMap<any>;
type IWarningInfo = IMap<any>;

export type IExprSubstCallback = (context: Context, program: ProgramScope, sourceNode: IParseNode) => IExprInstruction;

// TODO: refactor it
function findConstructor(type: ITypeInstruction, args: IExprInstruction[]): IVariableTypeInstruction {
    return new VariableTypeInstruction({ type, scope: null });
}


const asType = (instr: ITypedInstruction): ITypeInstruction => instr ? instr.type : null;


// FIXME: refuse from the regular expressions in favor of a full typecasting graph
// relax only uint => int
const asRelaxedType = (instr: ITypedInstruction | ITypeInstruction): ITypeInstruction | RegExp => {
    if (!instr) {
        return null;
    }

    const type = ((instr as any).hasField) ? <ITypeInstruction>instr : (<ITypedInstruction> instr).type;
    //          ^^^^^^^^^^^^^^^^^^^^^^^^^^
    //          hacky way to check if "type" instruction (not "typed")

    // allow "int" => "float" substitution
    if (SystemScope.isIntBasedType(type) || SystemScope.isUintBasedType(type) || SystemScope.isBoolBasedType(type)) {
        // temp workaround in order to match int to uint and etc. 
        const n = `${type.length > 1 ? type.length : ''}`;
        return new RegExp(`^int${n}$|^uint${n}$|^bool${n}$|^float${n}$`, "g")
    }

    return type;
};

// TODO: rework 'auto' api
function tryResolveProxyType(type: IVariableTypeInstruction, host: ITypeInstruction) {
    if (type.subType && type.subType.instructionType === EInstructionTypes.k_ProxyType) {
        const proxy = <ProxyTypeInstruction>type.subType;
        if (!proxy.isResolved()) {
            proxy.resolve(host);
        }
    }
}


export function parseUintLiteral(value: string) {
    const match = value.match(/^((0x[a-fA-F0-9]{1,8}?|[0-9]+)(e([+-]?[0-9]+))?)([ulUL]*)$/);
    assert(match, `cannot parse uint literal: ${value}`);

    const signed = match[5].toLowerCase().indexOf('u') === -1;
    const exp = Number(match[4] || '0');
    const base = Number(match[2]);
    assert(base !== NaN);

    const heximal = value[1] === 'x';

    return { signed, exp, base, heximal };
}


function getRenderStateValue(state: ERenderStates, value: string): ERenderStateValues {
    let eValue: ERenderStateValues = ERenderStateValues.UNDEF;

    switch (state) {
        case ERenderStates.ALPHABLENDENABLE:
        case ERenderStates.ALPHATESTENABLE:
            console.warn('ALPHABLENDENABLE/ALPHATESTENABLE not supported in WebGL.');
            return ERenderStateValues.UNDEF;

        case ERenderStates.BLENDENABLE:
        case ERenderStates.CULLFACEENABLE:
        case ERenderStates.ZENABLE:
        case ERenderStates.ZWRITEENABLE:
        case ERenderStates.DITHERENABLE:
        case ERenderStates.SCISSORTESTENABLE:
        case ERenderStates.STENCILTESTENABLE:
        case ERenderStates.POLYGONOFFSETFILLENABLE:
            switch (value) {
                case 'TRUE':
                    eValue = ERenderStateValues.TRUE;
                    break;
                case 'FALSE':
                    eValue = ERenderStateValues.FALSE;
                    break;

                default:
                    console.warn('Unsupported render state ALPHABLENDENABLE/ZENABLE/ZWRITEENABLE/DITHERENABLE value used: '
                        + value + '.');
                    return eValue;
            }
            break;

        case ERenderStates.CULLFACE:
            switch (value) {
                case 'FRONT':
                    eValue = ERenderStateValues.FRONT;
                    break;
                case 'BACK':
                    eValue = ERenderStateValues.BACK;
                    break
                case 'FRONT_AND_BACK':
                    eValue = ERenderStateValues.FRONT_AND_BACK;
                    break;

                default:
                    console.warn('Unsupported render state CULLFACE value used: ' + value + '.');
                    return eValue;
            }
            break;

        case ERenderStates.FRONTFACE:
            switch (value) {
                case 'CW':
                    eValue = ERenderStateValues.CW;
                    break;
                case 'CCW':
                    eValue = ERenderStateValues.CCW;
                    break;

                default:
                    console.warn('Unsupported render state FRONTFACE value used: ' + value + '.');
                    return eValue;
            }
            break;

        case ERenderStates.SRCBLEND:
        case ERenderStates.DESTBLEND:
        case ERenderStates.SRCBLENDALPHA:
        case ERenderStates.DESTBLENDALPHA:
        case ERenderStates.SRCBLENDCOLOR:
        case ERenderStates.DESTBLENDCOLOR:
        case ERenderStates.BLENDFUNC:
        case ERenderStates.BLENDFUNCSEPARATE:
            switch (value) {
                case 'ZERO':
                    eValue = ERenderStateValues.ZERO;
                    break;
                case 'ONE':
                    eValue = ERenderStateValues.ONE;
                    break;
                case 'SRCCOLOR':
                    eValue = ERenderStateValues.SRCCOLOR;
                    break;
                case 'INVSRCCOLOR':
                    eValue = ERenderStateValues.INVSRCCOLOR;
                    break;
                case 'SRCALPHA':
                    eValue = ERenderStateValues.SRCALPHA;
                    break;
                case 'INVSRCALPHA':
                    eValue = ERenderStateValues.INVSRCALPHA;
                    break;
                case 'DESTALPHA':
                    eValue = ERenderStateValues.DESTALPHA;
                    break;
                case 'INVDESTALPHA':
                    eValue = ERenderStateValues.INVDESTALPHA;
                    break;
                case 'DESTCOLOR':
                    eValue = ERenderStateValues.DESTCOLOR;
                    break;
                case 'INVDESTCOLOR':
                    eValue = ERenderStateValues.INVDESTCOLOR;
                    break;
                case 'SRCALPHASAT':
                    eValue = ERenderStateValues.SRCALPHASAT;
                    break;

                default:
                    console.warn('Unsupported render state SRCBLEND/DESTBLEND value used: ' + value + '.');
                    return eValue;
            }
            break;

        case ERenderStates.BLENDEQUATION:
        case ERenderStates.BLENDEQUATIONSEPARATE:
        case ERenderStates.BLENDEQUATIONCOLOR:
        case ERenderStates.BLENDEQUATIONALPHA:
            switch (value) {
                case 'FUNCADD':
                case 'ADD':
                    eValue = ERenderStateValues.FUNCADD;
                    break;
                case 'FUNCSUBTRACT':
                case 'SUBTRACT':
                    eValue = ERenderStateValues.FUNCSUBTRACT;
                    break;
                case 'FUNCREVERSESUBTRACT':
                case 'REVERSESUBTRACT':
                    eValue = ERenderStateValues.FUNCREVERSESUBTRACT;
                    break;
                default:
                    console.warn('Unsupported render state BLENDEQUATION/BLENDEQUATIONSEPARATE value used: ' + value + '.');
                    return eValue;
            }
            break;

        case ERenderStates.ZFUNC:
            switch (value) {
                case 'NEVER':
                    eValue = ERenderStateValues.NEVER;
                    break;
                case 'LESS':
                    eValue = ERenderStateValues.LESS;
                    break;
                case 'EQUAL':
                    eValue = ERenderStateValues.EQUAL;
                    break;
                case 'LESSEQUAL':
                    eValue = ERenderStateValues.LESSEQUAL;
                    break;
                case 'GREATER':
                    eValue = ERenderStateValues.GREATER;
                    break;
                case 'NOTEQUAL':
                    eValue = ERenderStateValues.NOTEQUAL;
                    break;
                case 'GREATEREQUAL':
                    eValue = ERenderStateValues.GREATEREQUAL;
                    break;
                case 'ALWAYS':
                    eValue = ERenderStateValues.ALWAYS;
                    break;

                default:
                    console.warn('Unsupported render state ZFUNC value used: ' +
                        value + '.');
                    return eValue;
            }
            break;
        case ERenderStates.PRIMITIVETOPOLOGY:
            switch (value) {
                case 'TRIANGLELIST':
                    eValue = ERenderStateValues.TRIANGLELIST;
                    break;
                case 'LINELIST':
                    eValue = ERenderStateValues.LINELIST;
                    break;
                default:
                    console.warn('Unsupported render state ZFUNC value used: ' +
                        value + '.');
                    return eValue;
            }
            break;
    }

    return eValue;
}




function addTypeDecl(context: Context, scope: IScope, typeDecl: ITypeDeclInstruction): void {
    if (SystemScope.findType(typeDecl.name)) {
        context.error(typeDecl.sourceNode, EErrors.SystemTypeRedefinition, { typeName: typeDecl.name });
    }

    let isAdded = scope.addType(typeDecl.type);
    if (!isAdded) {
        context.error(typeDecl.sourceNode, EErrors.TypeRedefinition, { typeName: typeDecl.name });
    }
}

// TODO: rework to support complex typ defenitions like 
//  typedef const float4 TYPE_T;
//          ^^^^^^
// IP: at the moment type defenitions are not supported
function addTypeAlias(context: Context, scope: IScope, typedef: ITypedefInstruction): void {
    if (SystemScope.findType(typedef.alias)) {
        context.error(typedef.sourceNode, EErrors.SystemTypeRedefinition, { typeName: typedef.name });
    }

    let isAdded = scope.addTypeAlias(typedef.type, typedef.alias);
    if (!isAdded) {
        context.error(typedef.sourceNode, EErrors.TypeRedefinition, { typeName: typedef.alias });
    }
}



function checkFunctionForRecursion(context: Context, func: IFunctionDeclInstruction, stack: number[]): boolean {
    if (stack.indexOf(func.instructionID) !== -1) {
        context.error(func.sourceNode,
            EErrors.InvalidFunctionRecursionNotAllowed,
            { funcName: func.name });
        return false;
    }

    let recursionFound = false;

    stack = [...stack, func.instructionID];
    const recursionChecker = (instr: IInstruction) => {
        if (instr.instructionType === EInstructionTypes.k_FunctionCallExpr) {
            let fcall = (instr as IFunctionCallInstruction);
            let fdecl = fcall.decl;
            if (fdecl.instructionType === EInstructionTypes.k_SystemFunctionDecl) {
                return;
            }

            // NOTE: it is possible that the declaration was not complete 
            //       at the time of the call, so you need to look for a 
            //       version with implementation
            fdecl = fdecl.scope.findFunctionInScope(fdecl);
            if (isNull(fdecl.impl)) {
                context.error(instr.sourceNode,
                    EErrors.InvalidFunctionImplementationNotFound,
                    { funcName: fdecl.name });
                return;
            }

            // visitor(fdecl.impl, recursionChecker);
            recursionFound = recursionFound ||
                checkFunctionForRecursion(context, fdecl, stack);
        }
    };

    visitor(func.impl, recursionChecker);

    return !recursionFound;
}

function checkFunctionsForRecursion(context: Context, program: ProgramScope) {
    const gs = program.globalScope;

    let recusrionFound = false;
    mwalk(gs.functions, funcOverloads => {
        funcOverloads.forEach(func => {
            recusrionFound = recusrionFound ||
                !checkFunctionForRecursion(context, func, []);
        })
    });

    return !recusrionFound;
}



function checkForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
    if (!checkReturnTypeForVertexUsage(funcDef)) {
        return false;
    }

    if (!checkArgumentsForVertexUsage(funcDef)) {
        return false;
    }

    return true;
}


function checkForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
    if (!checkReturnTypeForPixelUsage(funcDef)) {
        return false;
    }

    if (!checkArgumentsForPixelUsage(funcDef)) {
        return false;
    }

    return true;
}



function checkReturnTypeForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
    const returnType = <IVariableTypeInstruction>funcDef.returnType;

    if (returnType.isEqual(T_VOID)) {
        return true;
    }

    if (returnType.isComplex()) {
        if (returnType.hasFieldWithoutSemantics()) {
            // todo: emit warning
            // return false;
        }

        if (!returnType.hasAllUniqueSemantics()) {
            return false;
        }

        // isGood = returnType._hasFieldWithSematic("POSITION");
        // if(!isGood){
        // 	return false;
        // }

        // samplers cant be interpolators
        if (returnType.isContainSampler()) {
            return false;
        }

        // Forbid fileds with user-defined types
        // or any other complex types.
        if (returnType.isContainComplexType()) {
            //return false;
        }
    } else {
        if (!returnType.isEqual(T_FLOAT4)) {
            return false;
        }

        if (funcDef.semantic !== "POSITION") {
            return false;
        }
    }

    return true;
}

// todo: add support for dual source blending
// todo: add support for MRT
function checkReturnTypeForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
    let returnType = <IVariableTypeInstruction>funcDef.returnType;

    if (returnType.isEqual(T_VOID)) {
        return true;
    }

    // TODO: add MRT support
    if (!returnType.isBase()) {
        return false;
    }

    if (!returnType.isEqual(T_FLOAT4)) {
        return false;
    }

    if (funcDef.semantic !== "COLOR") {
        // todo: emit warning
        // return false;
    }

    return true;
}


function checkArgumentsForVertexUsage(funcDef: IFunctionDefInstruction): boolean {
    let params = funcDef.params;
    let isAttributeByStruct = false;
    let isAttributeByParams = false;
    let isStartAnalyze = false;

    for (let i: number = 0; i < params.length; i++) {
        let param = params[i];

        if (param.type.isUniform()) {
            continue;
        }

        if (!isStartAnalyze) {
            if (isNull(param.semantic)) {
                if (param.type.isBase() ||
                    param.type.hasFieldWithoutSemantics() ||
                    !param.type.hasAllUniqueSemantics()) {
                    return false;
                }

                isAttributeByStruct = true;
            } else if (!isNull(param.semantic)) {
                if (param.type.isComplex() &&
                    (param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics())) {
                    return false;
                }

                isAttributeByParams = true;
            }

            isStartAnalyze = true;
        } else if (isAttributeByStruct) {
            return false;
        } else if (isAttributeByParams) {
            if (isNull(param.semantic)) {
                return false;
            }

            if (param.type.isComplex() &&
                (param.type.hasFieldWithoutSemantics() ||
                    !param.type.hasAllUniqueSemantics())) {
                return false;
            }
        }
    }

    return true;
}


function checkArgumentsForPixelUsage(funcDef: IFunctionDefInstruction): boolean {
    let params = funcDef.params;
    let isVaryingsByStruct = false;
    let isVaryingsByParams = false;
    let isStartAnalyze = false;

    for (let i: number = 0; i < params.length; i++) {
        let param: IVariableDeclInstruction = params[i];

        if (param.type.isUniform()) {
            continue;
        }

        if (!isStartAnalyze) {
            if (param.semantic === "") {
                if (param.type.isBase() ||
                    param.type.hasFieldWithoutSemantics() ||
                    !param.type.hasAllUniqueSemantics() ||
                    param.type.isContainSampler()) {
                    return false;
                }

                isVaryingsByStruct = true;
            } else if (param.semantic !== "") {
                if (param.type.isContainSampler()
                    //  || isSamplerType(param.type)
                ) {
                    return false;
                }

                if (param.type.isComplex() &&
                    (param.type.hasFieldWithoutSemantics() ||
                        !param.type.hasAllUniqueSemantics())) {
                    return false;
                }

                isVaryingsByParams = true;
            }

            isStartAnalyze = true;
        }
        else if (isVaryingsByStruct) {
            return false;
        }
        else if (isVaryingsByParams) {
            if (param.semantic === "") {
                // todo: emit warning
                // return false;
            }

            if (param.type.isContainSampler()
                // || isSamplerType(param.type)
            ) {
                return false;
            }

            if (param.type.isComplex() &&
                (param.type.hasFieldWithoutSemantics() ||
                    !param.type.hasAllUniqueSemantics())) {
                return false;
            }
        }
    }

    return true;
}



export interface ICompileValidator {
    // validate with custom arguments ignoring statements inside compile expression.
    args?: ITypeInstruction[];
    ret?: ITypeInstruction;
}



export class Context {
    readonly uri: IFile;
    readonly diagnostics: AnalyzerDiagnostics;

    /** driven from provide declaration */
    moduleName: string | null;

    // funct states
    func: boolean;                              // Are we inside a function analysis?
    funcDef: IFunctionDefInstruction | null;    // Current function definition.
    haveCurrentFunctionReturnOccur: boolean;    // TODO: replace with array of return statements.

    cbuffer: boolean;

    renderStates: IMap<ERenderStateValues>;

    // graph needs extensions
    expressions: IMap<IExprSubstCallback>;

    constructor(uri: IFile, expressions?: IMap<IExprSubstCallback>) {
        this.diagnostics = new AnalyzerDiagnostics;
        this.uri = uri;
        this.moduleName = null;
        this.haveCurrentFunctionReturnOccur = false;
        this.expressions = expressions || {};
    }

    beginCbuffer(): void { this.cbuffer = true; }
    endCbuffer(): void { this.cbuffer = false; }

    beginFunc(): void {
        this.func = true;
        this.haveCurrentFunctionReturnOccur = false;
        this.funcDef = null; // << will be set inside analyzeFunctionDecl();
    }

    endFunc(): void {
        this.func = false
    }


    beginPass(): void {
        this.renderStates = null;
    }

    endPass(): void {
        this.renderStates = null;
    }


    error(sourceNode: IParseNode, code: number, info: IErrorInfo = {}): void {
        let loc = this.resolveNodeSourceLocation(sourceNode);
        let file = this.uri;

        this.diagnostics.error(code, { file, loc, info });
    }


    critical(sourceNode: IParseNode, code: number, info: IErrorInfo = {}): void {
        let loc = this.resolveNodeSourceLocation(sourceNode);
        let file = this.uri;

        this.diagnostics.critical(code, { file, loc, info });
    }


    warn(sourceNode: IParseNode, code: number, info: IWarningInfo = {}): void {
        let loc = this.resolveNodeSourceLocation(sourceNode);
        let file = this.uri;

        this.diagnostics.warning(code, { file, loc, info });
    }


    private resolveNodeSourceLocation(sourceNode: IParseNode): IRange {
        if (!isDefAndNotNull(sourceNode)) {
            return null;
        }

        if (isDef(sourceNode.loc)) {
            return sourceNode.loc;
        }

        return this.resolveNodeSourceLocation(sourceNode.children[sourceNode.children.length - 1]);
    }
}



export class Analyzer {


    protected analyzeUseDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): void {
        program.currentScope.strictMode = true;
    }


    protected analyzeComplexName(sourceNode: IParseNode): string {
        const children = sourceNode.children;
        let name: string = '';

        for (let i = children.length - 1; i >= 0; i--) {
            name += children[i].value;
        }

        return name;
    }


    /**
     * AST example:
     *    ProvideDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + ComplexNameOpt 
     *         T_KW_PROVIDE = 'provide'
     */
    protected analyzeProvideDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IProvideInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        if (children.length === 3) {
            let moduleName = this.analyzeComplexName(children[1]);;
            if (!isNull(context.moduleName)) {
                console.warn(`Context module overriding detected '${context.moduleName}' => '${module}'`);
            }
            context.moduleName = moduleName;
            assert(children[2].name === 'T_KW_PROVIDE');
            return new ProvideInstruction({ sourceNode, moduleName, scope });
        }

        context.error(sourceNode, EErrors.UnsupportedProvideAs);
        return null;
    }



    /**
     * AST example:
     *    InitExpr
     *         T_UINT = '0'
     *    InitExpr
     *         T_PUNCTUATOR_125 = '}'
     *       + InitExpr 
     *         T_PUNCTUATOR_123 = '{'
     */
    protected analyzeInitExprChildren(context: Context, program: ProgramScope, sourceNode: IParseNode, children: IParseNode[], expectedType: ITypeInstruction, exprSourceNode: IParseNode = null): IInitExprInstruction {
        const scope = program.currentScope;

        let args = <IExprInstruction[]>[];
        let type = expectedType;

        if (children.length === 1) {
            let initExpr = this.analyzeExpr(context, program, children[0]);

            if (!initExpr) {
                return null;
            }

            // NOTE: exprSourceNode => source node of the whole expression like "const float name = value" for better error highlighting.
            //                                                                               ^^^^^^^^^^^^
            //       sourceNode => source node of the init expr: const float3 name = { 1, 2, 3 };
            //                                                                    ^^^^^^^^^^^^^
            //       sourceNode => source node of the init expr: const float3[1] name = { { 1, 2, 3 } };
            //                                                                            ^^^^^^^^^^^

            const resType = Analyzer.checkTwoOperandExprTypes(context, '=', expectedType, initExpr.type,
                sourceNode/* Use correct source node! */, initExpr.sourceNode, exprSourceNode || sourceNode, { isInitializing: true });
            assert(resType === null || resType.isEqual(expectedType));

            if (!resType) {
                // omit error, all errors must be already fired above (inside checkTwoOperandExprTypes)
                return null;
            }

            // // IP: quick hack to avoid future conversions
            // if (initExpr.instructionType === EInstructionTypes.k_IntExpr && !initExpr.type.isEqual(expectedType)) {
            //     let { scope, sourceNode, base, exp, signed, heximal } = <IntInstruction>initExpr;
            //     signed = expectedType.name === 'int';
            //     initExpr = new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
            // }

            args.push(initExpr);
        }
        // It's a global user defined array or just not unit array;
        // Trying to exclude types like float1.
        else if ((expectedType.isNotBaseArray() && expectedType.scope.type <= EScopeType.k_Global) ||
            expectedType.isArray()) {


            const numArgs = (children.length - 1) / 2;

            if (expectedType.length === instruction.UNDEFINE_LENGTH ||
                (expectedType.isNotBaseArray() && numArgs !== expectedType.length) ||
                (!expectedType.isNotBaseArray() && numArgs !== expectedType.baseType.length)) {
                context.error(sourceNode, EErrors.InvalidVariableInitializingEx, {
                    tooltip: `attemp to init an array with invalid number of arguments. expected: ${expectedType.length}, given: ${numArgs}`
                });
                return null;
            }

            const arrayElementType = <IVariableTypeInstruction>expectedType.arrayElementType;
            /**
             * AST example:
             *    InitExpr
             *         T_PUNCTUATOR_125 = '}'
             *       + InitExpr 
             *         T_PUNCTUATOR_44 = ','
             *       + InitExpr 
             *         T_PUNCTUATOR_123 = '{'
             */
            for (let i = children.length - 2; i >= 1; i--) {
                if (children[i].name === 'InitExpr') {
                    const initExpr = this.analyzeInitExpr(context, program, children[i], arrayElementType);

                    if (isNull(initExpr)) {
                        // omit error because it was already produced by the call above
                        return null;
                    }

                    args.push(initExpr);
                }
            }

            // type = type.baseType;
        }
        else if (expectedType.isComplex()) {

            const numArgs = (children.length - 1) / 2;
            const fieldNameList = expectedType.fieldNames;

            if (numArgs !== fieldNameList.length) {
                // TODO: emit error (invalid number of arguments)
                return null;
            }


            /**
             * AST example:
             *    InitExpr
             *         T_PUNCTUATOR_125 = '}'
             *       + InitExpr 
             *         T_PUNCTUATOR_44 = ','
             *       + InitExpr 
             *         T_PUNCTUATOR_123 = '{'
             */
            for (let i = children.length - 2; i >= 1; i--) {
                if (children[i].name === 'InitExpr') {
                    const fieldType = expectedType.getField(fieldNameList[i]).type;
                    const initExpr = this.analyzeInitExpr(context, program, children[i], fieldType);

                    if (isNull(initExpr)) {
                        // omit error because it was already produced by the call above
                        return null;
                    }

                    args.push(initExpr);
                }
            }

            // type = type.baseType;

        } else {
            const numArgs = (children.length - 1) / 2;

            // handle cases like: int a = { 1 };
            if (numArgs !== 1) {
                // TODO: emit error (invalid number of arguments)
                return null;
            }

            const exprNode = children[children.length - 2];

            let initExpr = null;
            if (exprNode.name === 'InitExpr')
                initExpr = this.analyzeInitExpr(context, program, exprNode, expectedType);
            else
                initExpr = this.analyzeExpr(context, program, children[children.length - 2]);

            // TODO: use checkTwoOperandTypes() function instead
            if (!expectedType.isEqual(initExpr.type)) {
                // TODO: emit error
                return null;
            }

            args.push(initExpr);

        }

        return new InitExprInstruction({ scope, sourceNode, args, type: <IVariableTypeInstruction>type });
    }

    /**
     * AST example:
     *    InitExpr
     *         T_UINT = '0'
     *    InitExpr
     *         T_PUNCTUATOR_125 = '}'
     *       + InitExpr 
     *         T_PUNCTUATOR_123 = '{'
     */
    protected analyzeInitExpr(context: Context, program: ProgramScope, sourceNode: IParseNode, expectedType: ITypeInstruction): IInitExprInstruction {
        return this.analyzeInitExprChildren(context, program, sourceNode, sourceNode.children, expectedType);
    }


    /**
     * AST example:
     *    SamplerStateDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + StateBlock 
     *         T_NON_TYPE_ID = 'MeshTextureSampler'
     *         T_KW_SAMPLER_STATE = 'SamplerState'
     */
    protected analyzeSamplerStateDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction {
        return null;
    }


    /**
     * AST example:
     *    VariableDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + Variable 
     *         T_PUNCTUATOR_44 = ','
     *       + Variable 
     *         T_PUNCTUATOR_44 = ','
     *       + Variable 
     *       + UsageType 
     */
    protected analyzeVariableDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {
        const children = sourceNode.children;
        const scope = program.currentScope;

        const generalType = this.analyzeUsageType(context, program, children[children.length - 1]);
        const vars: IVariableDeclInstruction[] = [];

        if (isNull(generalType)) {
            return null;
        }

        for (let i = children.length - 2; i >= 1; i--) {
            if (children[i].name === 'Variable') {
                vars.push(this.analyzeVariable(context, program, children[i], generalType));
            }
        }

        return vars;
    }


    /**
     * AST example:
     *    UsageType
     *       + Type 
     *       + Usage 
     */
    protected analyzeUsageType(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let type: ITypeInstruction = null;
        let usagesRaw: IVariableUsage[] = [];

        for (let i = children.length - 1; i >= 0; i--) {
            if (children[i].name === 'Type') {
                // basically, just get type from scope
                type = this.analyzeType(context, program, children[i]);
                if (isNull(type)) {
                    return null
                }
            }
            else if (children[i].name === 'Usage') {
                usagesRaw.push(this.analyzeUsage(children[i]));
            }
        }

        const usageIn = usagesRaw.indexOf('in') !== -1;
        const usageOut = usagesRaw.indexOf('out') !== -1;
        const usageInout = usagesRaw.indexOf('inout') !== -1;
        const usageConst = usagesRaw.indexOf('const') !== -1;
        const usageUniform = usagesRaw.indexOf('uniform') !== -1;
        const usageUnsigned = usagesRaw.indexOf('unsigned') !== -1;

        // TODO: emit errors in case of inconsistent usages
        // TODO: remplace with bitflags
        let usages: IVariableUsage[] = [];
        if (usageInout) {
            usages.push('inout');
            // emit error in case of uniform
            // emit error in case of const
        } else {
            if (usageIn && usageOut) {
                usages.push('inout');
                // emit error in case of uniform
                // emit error in case of const
            } else {
                if (usageIn) {
                    usages.push('in');
                }
                if (usageOut) {
                    usages.push('out');
                    // emit error in case of const
                    // emit error in case of uniform
                } else {
                    if (usageConst) usages.push('const');
                    if (usageUniform) usages.push('uniform');
                }
            }
        }

        if (usageUnsigned && !SystemScope.isIntBasedType(type)) {
            console.error('invalid unsigned usage');
        }

        // wrap type with usages
        return new VariableTypeInstruction({ scope, sourceNode, type, usages })
    }


    /**
     * AST example:
     *    Type
     *         T_TYPE_ID = 'float3'
     */
    protected analyzeType(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let type: ITypeInstruction = null;

        switch (sourceNode.name) {
            case 'T_TYPE_ID':
                if (sourceNode.value === 'auto') {
                    type = new ProxyTypeInstruction({ scope });
                    break;
                }

                type = scope.findType(sourceNode.value);

                if (isNull(type)) {
                    context.error(sourceNode, EErrors.InvalidTypeNameNotType, { typeName: sourceNode.value });
                }
                break;
            case 'Struct':
                type = this.analyzeStruct(context, program, sourceNode);
                break;

            case 'T_KW_VOID':
                type = T_VOID;
                break;

            case 'ScalarType':
            case 'ObjectType':
                {
                    let typeName = children[children.length - 1].value;

                    if (children.length !== 1) {
                        assert(children[children.length - 2].value === '<' && children[0].value === '>');
                        const tplName = typeName;
                        const args = children
                            .slice(1, -2)
                            .reverse()
                            .filter((v, i) => i % 2 == 0)
                            .map(sourceNode => this.analyzeType(context, program, sourceNode));

                        const template = scope.findTypeTemplate(typeName);

                        if (isNull(template)) {
                            context.error(sourceNode, EErrors.InvalidTypeNameTemplateNotFound,
                                { tplName, args: args.map(arg => arg.toCode()) });
                            return null;
                        }

                        // TODO: validate register
                        // TODO: use ESystemTypes enumeration
                        const SYSTEM_TYPES = [
                            'Buffer',
                            'RWBuffer',
                            'RWStructuredBuffer',
                            'AppendStructuredBuffer',
                            'RWTexture1D',
                            'RWTexture2D',
                            'RWTexture3D',
                            'Texture1D',
                            'Texture2D',
                            'Texture3D',
                            'Texture2DArray',
                            'TextureCubeArray',
                        ];
                        if (SYSTEM_TYPES.indexOf(template.name) !== -1) {
                            if (scope.type != EScopeType.k_Global) {
                                context.error(sourceNode, EErrors.InvalidTypeScope,
                                    { typeName: template.name, tooltip: 'only global scope allowed' });
                                return null;
                            }
                        }

                        typeName = template.typeName(args);
                        type = scope.findType(typeName);

                        if (isNull(type)) {
                            type = template.produceType(scope, args);
                            if (isNull(type)) {
                                context.error(sourceNode, EErrors.CannotProduceType, { typeName });
                                return null;
                            }
                            scope.addType(type);
                        }
                    } else {
                        type = scope.findType(typeName);
                    }

                    if (isNull(type)) {
                        context.error(sourceNode, EErrors.InvalidTypeNameNotType, { typeName });
                        return null;
                    }
                }
                break;

            case 'VectorType':
            case 'MatrixType':
                context.error(sourceNode, EErrors.InvalidTypeVectorMatrix);
                break;

            case 'BaseType':
            case 'Type':
                return this.analyzeType(context, program, children[0]);
        }

        return type;
    }


    protected analyzeUsage(sourceNode: IParseNode): IVariableUsage {
        sourceNode = sourceNode.children[0];
        const supportedUsages = ['uniform', 'const', 'in', 'out', 'inout', 'static', 'unsigned', 'precise', 'inline'];
        assert(supportedUsages.indexOf(sourceNode.value) !== -1, sourceNode.value);
        return <IVariableUsage>sourceNode.value;
    }


    /**
     * AST example:
     *    CbufferDecl
     *         T_PUNCTUATOR_59 = ';'
     *         T_PUNCTUATOR_125 = '}'
     *       + VarStructDecl 
     *         T_PUNCTUATOR_123 = '{'
     *       + Annotation 
     *       + Semantic 
     *         T_NON_TYPE_ID = 'NAME'
     *         T_KW_CBUFFER = 'cbuffer'
     * 
     * AST example:
     *    CbufferDecl
     *         T_PUNCTUATOR_59 = ';'
     *         T_PUNCTUATOR_125 = '}'
     *       + VarStructDecl 
     *         T_PUNCTUATOR_123 = '{'
     *         T_KW_CBUFFER = 'cbuffer'
     */
    protected analyzeCbufferDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ICbufferInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let annotation = <IAnnotationInstruction>null;
        let semantic = '';
        let id = <IIdInstruction>null;

        context.beginCbuffer();

        let ic = children.length - 2;
        if (children[ic].name === 'T_NON_TYPE_ID') {
            id = new IdInstruction({ scope, sourceNode: children[ic], name: children[ic].value });
            ic--;
        }

        if (children[ic].name === 'Semantic') {
            semantic = this.analyzeSemantic(children[ic]);

            const match = semantic.match(/^register\(([utbs]{1})([\d]+)\)$/);
            if (match) {
                const rtype = match[1];
                if (rtype !== 'b') {
                    context.warn(children[ic], EWarnings.InvalidCbufferRegister);
                }
            }

            ic--;
        }

        if (children[ic].name === 'Annotation') {
            annotation = this.analyzeAnnotation(context, program, children[ic]);
            ic--;
        }

        ic--;

        // program.push(EScopeType.k_Cbuffer);

        let fields = <IVariableDeclInstruction[]>[];
        for (let i = ic; i >= 2; i--) {
            switch (children[i].name) {
                case 'VariableDecl':
                    fields = fields.concat(this.analyzeVariableDecl(context, program, children[i]));
                    break;
                case 'VarStructDecl':
                    fields = fields.concat(this.analyzeVarStructDecl(context, program, children[i]));
                    break;
                default:
                    context.error(children[i], EErrors.UnknownInstruction, {});
            }
        }

        // program.pop();

        context.endCbuffer();

        const aligment = T_FLOAT4.size; // float4 aligment!
        const name = id.name;
        const type = new ComplexTypeInstruction({ scope, sourceNode, name, fields, aligment });

        {
            let isAdded = scope.addType(type);
            if (!isAdded) {
                context.error(sourceNode, EErrors.TypeRedefinition, { typeName: name });
            }
        }

        const cbuf = new CbufferInstruction({ id, type, sourceNode, semantic, annotation, scope });

        {
            let isAdded = scope.addCbuffer(cbuf);
            if (!isAdded) {
                context.error(sourceNode, EErrors.CbufferRedefinition, { typeName: name });
            }
        }

        return cbuf;
    }


    /**
     * AST example:
     *    Variable
     *       + Initializer 
     *       + Semantic 
     *       + VariableDim
     *              T_PUNCTUATOR_93 = ']'
     *              T_NON_TYPE_ID = 'N'
     *              T_PUNCTUATOR_91 = '['
     *            + VariableDim
     *                   T_NON_TYPE_ID = 'x'
     *                   ^^^^^^^^^^^^^^^^^^
     */
    protected analyzeVariable(context: Context, program: ProgramScope, sourceNode: IParseNode, generalType: IVariableTypeInstruction): IVariableDeclInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let annotation: IAnnotationInstruction = null;
        let init: IInitExprInstruction = null;
        let semantic = '';
        let usageFlags = 0;

        if (!context.func) {
            usageFlags |= EVariableUsageFlags.k_Global;
            if (context.cbuffer) {
                usageFlags |= EVariableUsageFlags.k_Cbuffer;
            }
        } else {
            // All variables found inside function definition are arguments.
            if (!context.funcDef) {
                usageFlags |= EVariableUsageFlags.k_Argument;
            }
            usageFlags |= EVariableUsageFlags.k_Local;
        }


        let id = <IIdInstruction>null;
        let arrayIndex = <IExprInstruction>null;
        let type = <IVariableTypeInstruction>null;

        let vdimNode = children[children.length - 1];
        do {
            let vdimChildren = vdimNode.children;

            if (vdimChildren.length === 1) {
                const name = vdimChildren[0].value;
                id = new IdInstruction({ scope, sourceNode, name });
                break;
            }

            assert(vdimChildren.length == 4);

            if (!isNull(arrayIndex)) {
                // usage of generalType.source node instead of sourceNode was done for more clear debugging
                generalType = new VariableTypeInstruction({ scope, sourceNode: generalType.sourceNode, type: generalType, arrayIndex });
            }

            arrayIndex = this.analyzeExpr(context, program, vdimChildren[vdimChildren.length - 3]);
            vdimNode = vdimChildren[vdimChildren.length - 1];
        } while (true);

        // using generalType.source node instead of sourceNode was done for more clear degging
        type = new VariableTypeInstruction({ scope, sourceNode: generalType.sourceNode, type: generalType, arrayIndex });

        for (let i = children.length - 2; i >= 0; i--) {
            if (children[i].name === 'Annotation') {
                annotation = this.analyzeAnnotation(context, program, children[i]);
            } else if (children[i].name === 'Semantic') {
                semantic = this.analyzeSemantic(children[i]);
            } else if (children[i].name === 'Initializer') {
                init = this.analyzeInitializer(context, program, children[i], type, sourceNode);

                if (!init) {
                    // TODO: make it warning
                    context.error(sourceNode, EErrors.InvalidVariableInitializing, { varName: id.name });
                }
            }
        }

        const varDecl = new VariableDeclInstruction({ sourceNode, scope, type, init, id, semantic, annotation, usageFlags });
        assert(scope.type != EScopeType.k_System);

        if (SystemScope.hasVariable(varDecl.name)) {
            context.error(sourceNode, EErrors.SystemVariableRedefinition, { varName: varDecl.name });
        }

        const isAdded = scope.addVariable(varDecl);
        if (!isAdded) {
            switch (scope.type) {
                case EScopeType.k_Global:
                case EScopeType.k_Default:
                    context.error(sourceNode, EErrors.VariableRedefinition, { varName: varDecl.name });
                    break;
                case EScopeType.k_Struct:
                    context.error(sourceNode, EErrors.InvalidNewFieldForStructName, { fieldName: varDecl.name });
                    break;
                case EScopeType.k_Annotation:
                    context.error(sourceNode, EErrors.InvalidNewAnnotationVar, { varName: varDecl.name });
                    break;
            }
        }

        return varDecl;
    }


    /**
     * AST example:
     *    AnnotationDecls
     *       + AnnotationDecls 
     *       + VariableDecl 
     */
    protected analyzeAnnotationDecls(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {
        const children = sourceNode.children;
        let decls = [];
        for (let i = children.length - 1; i >= 0; i--) {
            switch (children[i].name) {
                case 'AnnotationDecls':
                    decls.push(...this.analyzeAnnotationDecls(context, program, children[i]));
                    break;
                case 'VariableDecl':
                    decls.push(...this.analyzeVariableDecl(context, program, children[i]));
                    break;
            }
        }
        return decls;
    }

    /**
     * AST example:
     *    Annotation
     *         T_PUNCTUATOR_62 = '>'
     *         T_PUNCTUATOR_60 = '<'
     */
    protected analyzeAnnotation(context: Context, $program: ProgramScope, sourceNode: IParseNode): IAnnotationInstruction {
        // IP: hucky way to not add annotation variables to real scope
        const program = new ProgramScope(SystemScope.SCOPE); 
        const scope = program.currentScope;
        program.push(EScopeType.k_Annotation);
        const decls = [
            ...sourceNode.children.filter(node => node.name == 'AnnotationDecls').map(node => this.analyzeAnnotationDecls(context, program, node)).flat(),
            ...sourceNode.children.filter(node => node.name == 'VariableDecl').map(node => this.analyzeVariableDecl(context, program, node)).flat()
        ];
        program.pop();
        if (!decls || !decls.length) return null;
        return new AnnotationInstruction({ scope, sourceNode, decls });
    }


    /**
     * AST example:
     *    Semantic
     *         T_NON_TYPE_ID = 'SEMANTIC'
     *         T_PUNCTUATOR_58 = ':'
     */
    /**
     * AST example:
     *    Semantic
     *         T_PUNCTUATOR_41 = ')'
     *         T_NON_TYPE_ID = 'u2'
     *         T_PUNCTUATOR_40 = '('
     *         T_KW_REGISTER = 'register'
     *         T_PUNCTUATOR_58 = ':'
     */
    protected analyzeSemantic(sourceNode: IParseNode): string {
        return sourceNode.children.slice(0, -1).reverse().map(child => child.value).join('');
    }


    /**
     * AST example:
     *    Initializer
     *         T_UINT = '10'
     *         T_PUNCTUATOR_61 = '='
     *    Initializer
     *       + CastExpr 
     *         T_PUNCTUATOR_61 = '='
     *    Initializer
     *         T_PUNCTUATOR_125 = '}'
     *       + InitExpr 
     *         T_PUNCTUATOR_44 = ','
     *       + InitExpr 
     *         T_PUNCTUATOR_123 = '{'
     *         T_PUNCTUATOR_61 = '='
     */
    protected analyzeInitializer(context: Context, program: ProgramScope, sourceNode: IParseNode, expectedType: ITypeInstruction, exprSourceNode: IParseNode = null): IInitExprInstruction {
        const children = sourceNode.children;
        return this.analyzeInitExprChildren(context, program, sourceNode, children.slice(0, -1), expectedType, exprSourceNode);
    }



    protected analyzeExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const name = sourceNode.name;

        switch (name) {
            case 'ObjectExpr':
                return this.analyzeObjectExpr(context, program, sourceNode);
            case 'ComplexExpr':
                return this.analyzeComplexExpr(context, program, sourceNode);
            case 'PostfixExpr':
                return this.analyzePostfixExpr(context, program, sourceNode);
            case 'UnaryExpr':
                return this.analyzeUnaryExpr(context, program, sourceNode);
            case 'CastExpr':
                return this.analyzeCastExpr(context, program, sourceNode);
            case 'ConditionalExpr':
                return this.analyzeConditionalExpr(context, program, sourceNode);
            case 'MulExpr':
            case 'AddExpr':
                return this.analyzeArithmeticExpr(context, program, sourceNode);
            case 'RelationalExpr':
            case 'EqualityExpr':
                return this.analyzeRelationExpr(context, program, sourceNode);
            case 'LogicalAndExpr':
            case 'LogicalOrExpr':
                return this.analyzeLogicalExpr(context, program, sourceNode);
            case 'AssignmentExpr':
                return this.analyzeAssignmentExpr(context, program, sourceNode);
            case 'AndExpr':
            case 'ShiftExpr':
            case 'InclusiveOrExpr':
            case 'ExclusiveOrExpr':
                return this.analyzeBitwiseExpr(context, program, sourceNode);
            case 'T_NON_TYPE_ID':
                return this.analyzeIdExpr(context, program, sourceNode);
            case 'T_STRING':
            case 'T_UINT':
            case 'T_FLOAT':
            case 'T_KW_TRUE':
            case 'T_KW_FALSE':
                return this.analyzeSimpleExpr(context, program, sourceNode);
            default:
                context.error(sourceNode, EErrors.UnsupportedExpr, { exprName: name });
                break;
        }

        return null;
    }


    /**
     * AST example:
     *    ObjectExpr
     *       + StateBlock 
     *         T_KW_SAMPLER_STATE = 'sampler_state'
     *    ObjectExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_PUNCTUATOR_40 = '('
     *         T_NON_TYPE_ID = 'fs_skybox'
     *         T_KW_COMPILE = 'compile'
     */
    protected analyzeObjectExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        let name = sourceNode.children[sourceNode.children.length - 1].name;

        switch (name) {
            case 'T_KW_COMPILE':
                return this.analyzeCompileExpr(context, program, sourceNode);
            default:
        }
        return null;
    }



    /**
     * AST example:
     *    ObjectExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_PUNCTUATOR_40 = '('
     *         T_NON_TYPE_ID = 'main'
     *         T_KW_COMPILE = 'compile'
     */
    protected analyzeCompileExpr(context: Context, program: ProgramScope, sourceNode: IParseNode, validators?: ICompileValidator[]): CompileExprInstruction {
        const children = sourceNode.children;
        const shaderFuncName = children[children.length - 2].value;
        const scope = program.currentScope;

        let compileArgs: IExprInstruction[] = null;
        let retType: ITypeInstruction = null;
        let args: ITypeInstruction[] = null;

        if (children.length > 4) {
            compileArgs = [];
            for (let i = children.length - 4; i > 0; i--) {
                if (children[i].value !== ',') {
                    compileArgs.push(this.analyzeExpr(context, program, children[i]));
                }
            }
        }

        args = compileArgs ? compileArgs.map(asType) : null;

        let func: IFunctionDeclInstruction = null;

        if (validators) {
            for (let validator of validators) {
                args = compileArgs ? compileArgs.map(asType) : null;
                retType = null;

                args = validator.args || args;
                retType = validator.ret || retType;

                func = program.globalScope.findFunction(shaderFuncName, args);
                if (func) {
                    // skip function if validator is not suitable
                    if (validator.ret && !validator.ret.isEqual(func.def.returnType))
                    {
                        // skip this function
                        continue;
                    }
                    break;
                }
            }
        } else {
            func = program.globalScope.findFunction(shaderFuncName, args);
        }


        if (isNull(func)) {
            context.error(sourceNode, EErrors.InvalidCompileNotFunction, { funcName: shaderFuncName });
            return null;
        }

        if (retType) {
            // show error if we found some variant of function but return type mismath
            if (!func.def.returnType.isEqual(retType)) {
                context.error(sourceNode, EErrors.InvalidCompileFunctionNotValid, {
                    funcName: shaderFuncName,
                    funcType: retType.toCode(),
                    tooltip: `Return type mismatch: expected '${retType.toCode()}' a is a '${func.def.returnType.toCode()}' `
                });
                return null;
            }
        }

        let type = VariableTypeInstruction.wrap(<IVariableTypeInstruction>func.def.returnType, scope);

        return new CompileExprInstruction({ args: compileArgs, scope, type, operand: func, sourceNode });
    }


    // /**
    //  * AST example:
    //  *    ObjectExpr
    //  *       + StateBlock 
    //  *         T_KW_SAMPLER_STATE = 'sampler_state'
    //  */
    // protected analyzeSamplerStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    //     sourceNode = sourceNode.children[0];

    //     let scope = program.currentScope;
    //     let children = sourceNode.children;
    //     let operator: SamplerOperator = "sampler_state";
    //     let texture = null;
    //     let params = <ISamplerStateInstruction[]>[];

    //     for (let i = children.length - 2; i >= 1; i--) {
    //         let param = this.analyzeSamplerState(context, program, children[i]);
    //         if (!isNull(param)) {
    //             params.push(param);
    //         }
    //     }

    //     return new SamplerStateBlockInstruction({ sourceNode, scope, operator, params });
    // }


    // /**
    //  * AST example:
    //  *    State
    //  *         T_PUNCTUATOR_59 = ';'
    //  *         StateExpr
    //  *              T_PUNCTUATOR_62 = '>'
    //  *              T_NON_TYPE_ID = 'tex0'
    //  *              T_PUNCTUATOR_60 = '<'
    //  *         T_PUNCTUATOR_61 = '='
    //  *         T_NON_TYPE_ID = 'Texture'
    //  */
    // protected analyzeSamplerState(context: Context, program: ProgramScope, sourceNode: IParseNode): SamplerStateInstruction {

    //     const children = sourceNode.children;
    //     const scope = program.currentScope;

    //     if (children[children.length - 2].name === 'StateIndex') {
    //         context.error(sourceNode, EErrors.UnsupportedStateIndex);
    //         return null;
    //     }

    //     let stateExprNode = children[children.length - 3];
    //     let subStateExprNode = stateExprNode.children[stateExprNode.children.length - 1];
    //     let stateType = children[children.length - 1].value.toUpperCase();
    //     let stateValue = '';

    //     if (isNull(subStateExprNode.value)) {
    //         context.error(subStateExprNode, EErrors.InvalidSamplerTexture);
    //         return null;
    //     }

    //     switch (stateType) {
    //         case 'TEXTURE':
    //             if (stateExprNode.children.length !== 3 || subStateExprNode.value === '{') {
    //                 context.error(subStateExprNode, EErrors.InvalidSamplerTexture);
    //                 return null;
    //             }

    //             let texNameNode = stateExprNode.children[1];
    //             let texName = texNameNode.value;
    //             if (isNull(texName) || !scope.findVariable(texName)) {
    //                 context.error(stateExprNode.children[1], EErrors.InvalidSamplerTexture);
    //                 return null;
    //             }

    //             let texDecl = scope.findVariable(texName);
    //             let texId = new IdInstruction({ scope, sourceNode: texNameNode, name: texName });
    //             let tex = new IdExprInstruction({ scope, sourceNode: texNameNode, id: texId, decl: texDecl });

    //             return new SamplerStateInstruction({ scope, sourceNode, name: stateType, value: tex });
    //         case 'ADDRESSU': /* WRAP_S */
    //         case 'ADDRESSV': /* WRAP_T */
    //             stateValue = subStateExprNode.value.toUpperCase();
    //             switch (stateValue) {
    //                 case 'WRAP':
    //                 case 'CLAMP':
    //                 case 'MIRROR':
    //                     break;
    //                 default:
    //                     // TODO: move to errors
    //                     // console.warn('Webgl don`t support this wrapmode: ' + stateValue);
    //                     return null;
    //             }
    //             break;

    //         case 'MAGFILTER':
    //         case 'MINFILTER':
    //             stateValue = subStateExprNode.value.toUpperCase();
    //             switch (stateValue) {
    //                 case 'POINT':
    //                     stateValue = 'NEAREST';
    //                     break;
    //                 case 'POINT_MIPMAP_POINT':
    //                     stateValue = 'NEAREST_MIPMAP_NEAREST';
    //                     break;
    //                 case 'LINEAR_MIPMAP_POINT':
    //                     stateValue = 'LINEAR_MIPMAP_NEAREST';
    //                     break;
    //                 case 'POINT_MIPMAP_LINEAR':
    //                     stateValue = 'NEAREST_MIPMAP_LINEAR';
    //                     break;

    //                 case 'NEAREST':
    //                 case 'LINEAR':
    //                 case 'NEAREST_MIPMAP_NEAREST':
    //                 case 'LINEAR_MIPMAP_NEAREST':
    //                 case 'NEAREST_MIPMAP_LINEAR':
    //                 case 'LINEAR_MIPMAP_LINEAR':
    //                     break;
    //                 default:
    //                     // TODO: move to erros api
    //                     // console.warn('Webgl don`t support this texture filter: ' + stateValue);
    //                     return null;
    //             }
    //             break;

    //         default:
    //             // TODO: move to erros api
    //             console.warn('Don`t support this texture param: ' + stateType);
    //             return null;
    //     }

    //     return new SamplerStateInstruction({
    //         sourceNode,
    //         scope,
    //         name: stateType,
    //         value: new StringInstruction({ sourceNode: stateExprNode, scope, value: stateValue })
    //     });
    // }


    /**
     * AST example:
     *    ComplexExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_FLOAT = '2.'
     *         T_PUNCTUATOR_44 = ','
     *         T_FLOAT = '1.'
     *         T_PUNCTUATOR_40 = '('
     *         T_TYPE_ID = 'float4'
     */
    /**
     * AST example:
     *    ComplexExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_PUNCTUATOR_40 = '('
     *       + PostfixPointExpr 
     */
    protected analyzeComplexExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const firstNodeName = children[children.length - 1].name;

        switch (firstNodeName) {
            case 'PostfixPointExpr':
            case 'T_NON_TYPE_ID':
                return this.analyzeFunctionCallExpr(context, program, sourceNode);
            case 'BaseType':
            case 'T_TYPE_ID':
                return this.analyzeConstructorCallExpr(context, program, sourceNode);
            default:
                return this.analyzeSimpleComplexExpr(context, program, sourceNode);
        }
    }



    protected analyzeCallee(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        return this.analyzeExpr(context, program, children[children.length - 1]);
    }


    /**
     * AST example:
     *    ComplexExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_NON_TYPE_ID = 'b'
     *         T_PUNCTUATOR_44 = ','
     *         T_NON_TYPE_ID = 'a'
     *         T_PUNCTUATOR_40 = '('
     *         T_NON_TYPE_ID = 'foo'
     */
    /**
     * AST example:
     *    PostfixPointExpr
     *         T_NON_TYPE_ID = 'IncrementCounter'
     *         T_PUNCTUATOR_46 = '.'
     *       + PostfixExpr 
     */
    protected analyzeFunctionCallExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IFunctionCallInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const globalScope = program.globalScope;

        const firstNodeName = children[children.length - 1].name;

        const args: IExprInstruction[] = [];
        if (children.length > 3) {
            for (let i = children.length - 3; i > 0; i--) {
                if (children[i].value !== ',') {
                    const arg = this.analyzeExpr(context, program, children[i]);
                    args.push(arg);
                }
            }
        }

        let funcName: string = null;
        let func: IFunctionDeclInstruction = null;
        let callee: IExprInstruction = null;

        switch (firstNodeName) {
            // call as function
            case 'T_NON_TYPE_ID':
                {
                    // TODO: validate intrinsics like 'InterlockedAdd', check that dest is UAV address
                    funcName = children[children.length - 1].value;
                    const noStrictTypeWereProvided = args.every(arg => arg?.type != asRelaxedType(arg));
                    // don't relax all types because it's useless
                    // like: (0, 0, 0) => (float|int, float|int)
                    // relax only uint => int if not strict types were provided 
                    func = globalScope.findFunction(funcName, args.map(arg => arg?.type || null));
                    // still not found?
                    if (!func) {
                        // last resort for cases like: "sqrt(2)"
                        func = globalScope.findFunction(funcName, args.map(asRelaxedType));
                    }
                }
                break;
            // call as method
            case 'PostfixPointExpr':
                {
                    callee = this.analyzeCallee(context, program, children[children.length - 1]);
                    funcName = children[children.length - 1].children[0].value; // method name
                    func = callee.type.getMethod(funcName, args.map(asRelaxedType));
                }
                break;
        }


        if (isNull(func)) {
            context.error(sourceNode, EErrors.InvalidComplexNotFunction, { funcName, args: args.map(arg => type.signature(arg?.type)) });
            return null;
        }


        if (!isDef(func)) {
            context.error(sourceNode, EErrors.CannotChooseFunction, { funcName });
            return null;
        }

        if (args.includes(null)) {
            return null;
        }

        if (func.def.params.filter(p => !p.initExpr).length > args.length) {
            context.error(sourceNode, EErrors.UnsupportedExpr, { funcName });
            return null;
        }

        args.forEach((x, i) => {
            const param = func.def.params[i];
            const arg = args[i];
            if (!type.equals(param.type, arg.type)) {
                context.warn(arg.sourceNode, EWarnings.ImplicitTypeConversion, { info: `${arg.type.toCode()} => ${param.type.toCode()}` });
            }
        });

        if (func.instructionType !== EInstructionTypes.k_FunctionDecl &&
            func.instructionType !== EInstructionTypes.k_SystemFunctionDecl) {
            console.error("@undefined_behavior");
            return null;
        }



        const params = func.def.params;

        for (let i = 0; i < args.length; i++) {
            if (isNull(args[i])) {
                continue;
            }
            if (params[i].type.hasUsage('out')) {
                const decl = expression.unwind(args[i]);
                if (isNull(decl)) {
                    context.error(args[i].sourceNode, EErrors.InvalidExprIsNotLValue);
                }
                if (!args[i].type.writable) {
                    context.error(args[i].sourceNode, EErrors.InvalidTypeForWriting);
                }
            } else if (params[i].type.hasUsage('inout')) {
                const decl = expression.unwind(args[i]);
                if (isNull(decl)) {
                    context.error(args[i].sourceNode, EErrors.InvalidExprIsNotLValue);
                }
                if (!args[i].type.writable) {
                    context.error(args[i].sourceNode, EErrors.InvalidTypeForWriting);
                }

                if (!args[i].type.readable) {
                    context.error(args[i].sourceNode, EErrors.InvalidTypeForReading);
                }
            } else {
                if (!args[i].type.readable) {
                    context.error(args[i].sourceNode, EErrors.InvalidTypeForReading);
                }
            }
        }

        {
            const type = VariableTypeInstruction.wrap(func.def.returnType, scope); // TODO: remove wrap?
            return new FunctionCallInstruction({ scope, type, decl: func, args, sourceNode, callee });
        }
    }



    /**
     * AST example:
     *    ComplexExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_40 = '('
     *       + BaseType 
     */
    protected analyzeConstructorCallExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IConstructorCallInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const ctorType = this.analyzeType(context, program, children[children.length - 1]);

        if (isNull(ctorType)) {
            context.error(sourceNode, EErrors.InvalidComplexNotType);
            return null;
        }

        let args: IExprInstruction[] = null;
        if (children.length > 3) {
            let argumentExpr: IExprInstruction = null;

            args = [];

            for (let i = children.length - 3; i > 0; i--) {
                if (children[i].value !== ',') {
                    argumentExpr = this.analyzeExpr(context, program, children[i]);
                    args.push(argumentExpr);
                }
            }
        }

        // TODO: add correct implementation! 
        const exprType = findConstructor(ctorType, args);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidComplexNotConstructor, { typeName: String(ctorType) });
            return null;
        }

        if (!isNull(args)) {
            for (let i = 0; i < args.length; i++) {
                if (!args[i] || !args[i].type.readable) {
                    context.error(sourceNode, EErrors.InvalidTypeForReading);
                }
            }
        }

        return new ConstructorCallInstruction({ scope, sourceNode, ctor: exprType, args });
    }


    // TODO: add comment!
    protected analyzeSimpleComplexExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let expr = this.analyzeExpr(context, program, children[1]);
        if (isNull(expr)) {
            return null
        }

        return new ComplexExprInstruction({ scope, sourceNode, expr });
    }


    /**
     * AST example:
     *    PostfixExpr
     *         T_NON_TYPE_ID = 'val'
     *         T_PUNCTUATOR_46 = '.'
     *         T_NON_TYPE_ID = 'some'
     *    PostfixExpr
     *         T_PUNCTUATOR_93 = ']'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_91 = '['
     *         T_NON_TYPE_ID = 'some'
     *    PostfixExpr
     *         T_OP_INC = '++'
     *         T_NON_TYPE_ID = 'some'
     */
    protected analyzePostfixExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const symbol = children[children.length - 2].value;

        switch (symbol) {
            case '[':
                return this.analyzePostfixIndex(context, program, sourceNode);
            case '.':
                return this.analyzePostfixPoint(context, program, sourceNode);
            case '++':
            case '--':
                return this.analyzePostfixArithmetic(context, program, sourceNode);
        }

        return null;
    }


    /**
     * AST example:
     *    PostfixExpr
     *         T_PUNCTUATOR_93 = ']'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_91 = '['
     *         T_NON_TYPE_ID = 'some'
     */
    protected analyzePostfixIndex(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;

        const postfixExpr = this.analyzeExpr(context, program, children[children.length - 1]);
        if (isNull(postfixExpr)) {
            // TODO: emit error?
            return null;
        }

        const postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

        if (!postfixExprType.isArray()) {
            context.error(sourceNode, EErrors.InvalidPostfixNotArray, { typeName: String(postfixExprType) });
            return null;
        }

        const indexExpr = this.analyzeExpr(context, program, children[children.length - 3]);
        const indexExprType = indexExpr.type;

        if (!(indexExprType.isEqual(T_INT) || indexExprType.isEqual(T_UINT))) {
            context.error(sourceNode, EErrors.InvalidPostfixNotIntIndex, { typeName: String(indexExprType) });
            return null;
        }

        return new PostfixIndexInstruction({ scope, sourceNode, element: postfixExpr, index: indexExpr });
    }


    /**
     * 
     * @param elementType Type of the element. (**element.postfix**)
     * @param fieldName 
     */
    static createFieldDecl(elementType: IVariableTypeInstruction, fieldName: string): IVariableDeclInstruction {
        if (!elementType.hasField(fieldName)) {
            return null;
        }

        const decl =
            // FIXME: remove 'logical OR' operation, always use subType
            (elementType.subType || elementType).getField(fieldName); // arrayIndex

        const { type } = decl;

        // in case of typical postfix exp. like "element.postfix":
        //      elementType => type derived from the parameter or variable declaration or derived from another expr
        //      elementType.subType => original complex (structure) type
        // in case of something else, like ccall with postfix "float2(1.0, 2.0).yx":
        //      elementType => original system type

        const fieldType = new VariableTypeInstruction({ 
            scope: type.scope, 
            sourceNode: type.sourceNode, 
            type, 
            readable: elementType.readable, 
            writable: elementType.writable, 
            /*aligment,*/
            padding: type.padding 
        });


        const fieldId = new IdInstruction({ scope: decl.scope, name: decl.id.name, sourceNode: decl.id.sourceNode });

        const field = new VariableDeclInstruction({ 
            semantic: decl.semantic,
            scope: decl.scope, 
            type: fieldType, 
            sourceNode: decl.sourceNode, 
            id: fieldId,
            usageFlags: decl.usageFlags
        });

        
        return Instruction.$withParent(field, elementType);
    }


    /**
     * 
     * @param elementType Type of the element. (**element.postfix**)
     */
    protected analyzePostfixPointField(context: Context, program: ProgramScope, sourceNode: IParseNode, elementType: IVariableTypeInstruction): IIdExprInstruction {
        if (isNull(elementType)) {
            return null;
        }

        const scope = program.currentScope;
        const name = sourceNode.value;                             // fiedl name
        const decl = Analyzer.createFieldDecl(elementType, name);       // field decl
        // const decl = elementType.getField(name);
        
        if (isNull(decl)) {
            return null;
        }

        const id = new IdInstruction({ scope, sourceNode, name });
        return new IdExprInstruction({ scope, sourceNode, id, decl });;
    }

    /**
     * AST example:
     *    PostfixExpr
     *         T_NON_TYPE_ID = 'val'
     *         T_PUNCTUATOR_46 = '.'
     *         T_NON_TYPE_ID = 'some'
     */
    /** 
     * Expressions like: 
     *      **(element.postfix)** 
     */
    protected analyzePostfixPoint(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        const element = this.analyzeExpr(context, program, children[children.length - 1]);
        if (isNull(element)) {
            // TODO: emit error?
            return null;
        }

        const postfix = this.analyzePostfixPointField(context, program, children[children.length - 3], element.type);

        if (isNull(postfix)) {
            const fieldName = children[children.length - 3].value;
            context.error(sourceNode, EErrors.InvalidPostfixNotField, { typeName: String(element.type), fieldName });
            return null;
        }

        return new PostfixPointInstruction({ sourceNode, scope, element, postfix });
    }



    /**
     * AST example:
     *    PostfixExpr
     *         T_OP_INC = '++'
     *         T_NON_TYPE_ID = 'b'
     */
    protected analyzePostfixArithmetic(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const operator = <PostfixOperator>children[0].value;

        const postfixExpr = this.analyzeExpr(context, program, children[1]);
        const postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

        const exprType = Analyzer.checkOneOperandExprType(context, sourceNode, operator, postfixExprType);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidPostfixArithmetic, {
                operator: operator,
                typeName: String(postfixExprType)
            });
            return null;
        }

        return new PostfixArithmeticInstruction({ scope, sourceNode, operator, expr: postfixExpr });
    }


    /**
     * AST example:
     *    UnaryExpr
     *         T_NON_TYPE_ID = 'x'
     *         T_PUNCTUATOR_33 = '!'
     */
    protected analyzeUnaryExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

        const children = sourceNode.children;
        const operator = <IUnaryOperator>children[1].value;
        const scope = program.currentScope;

        let expr = this.analyzeExpr(context, program, children[0]);
        let exprType = Analyzer.checkOneOperandExprType(context, sourceNode, operator, expr.type);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidUnaryOperation, {
                operator: operator,
                tyename: String(expr.type)
            });
            return null;
        }

        let unaryExpr: IExprInstruction = null;

        // shortcut for replacment of unary expressions with literals
        if (operator === '-' || operator === '+') {
            if (instruction.isLiteral(expr)) {
                switch (expr.instructionType) {
                    case EInstructionTypes.k_IntExpr:
                        {
                            let lit = <IntInstruction>expr;
                            let { base, signed, heximal, exp } = lit;
                            signed = operator === '-' || lit.signed;
                            // TODO: emit warning in case of '-100u' expr.
                            base = operator === '-' ? -base : base;
                            unaryExpr = new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
                        }
                        break;
                    case EInstructionTypes.k_FloatExpr:
                        unaryExpr = new FloatInstruction({ scope, sourceNode, value: Number(`${operator}${(<ILiteralInstruction<number>>expr).value}`) });
                }
            }
        }

        if (!unaryExpr) {
            unaryExpr = new UnaryExprInstruction({ scope, sourceNode, expr, operator });
        }

        return unaryExpr;
    }



    /**
     * AST example:
     *    CastExpr
     *         T_NON_TYPE_ID = 'y'
     *         T_PUNCTUATOR_41 = ')'
     *       + ConstType 
     *         T_PUNCTUATOR_40 = '('
     */
    protected analyzeCastExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;

        const type = this.analyzeConstTypeDim(context, program, children[2]);

        if (!type.isBase()) {
            context.error(sourceNode, EErrors.InvalidCastTypeNotBase, { typeName: String(type) });
        }

        const sourceExpr = this.analyzeExpr(context, program, children[0]);

        if (isNull(sourceExpr)) {
            return null;
        }

        if (!(<IVariableTypeInstruction>sourceExpr.type).readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
        }

        return new CastExprInstruction({ scope, sourceNode, sourceExpr, type });
    }


    /**
     * AST example:
     *    ConditionalExpr
     *         T_KW_FALSE = 'false'
     *         T_PUNCTUATOR_58 = ':'
     *         T_KW_TRUE = 'true'
     *         T_PUNCTUATOR_63 = '?'
     *         T_NON_TYPE_ID = 'isOk'
     */
    protected analyzeConditionalExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;


        const conditionExpr = this.analyzeExpr(context, program, children[children.length - 1]);
        const leftExpr = this.analyzeExpr(context, program, children[children.length - 3]);
        const rightExpr = this.analyzeExpr(context, program, children[0]);

        if (isNull(conditionExpr)) {
            context.error(children[children.length - 1], EErrors.InvalidConditionType, { typeName: '[unknown]' });
            return null;
        }

        if (isNull(leftExpr)) {
            context.error(children[children.length - 3], EErrors.InvalidConditionType, { typeName: '[unknown]' });
            return null;
        }

        if (isNull(rightExpr)) {
            context.error(children[0], EErrors.InvalidConditionType, { typeName: '[unknown]' });
            return null;
        }

        const conditionType = <IVariableTypeInstruction>conditionExpr.type;
        const leftExprType = <IVariableTypeInstruction>leftExpr.type;
        const rightExprType = <IVariableTypeInstruction>rightExpr.type;

        const boolType = T_BOOL;

        if (!conditionType.isEqual(boolType)) {
            context.error(conditionExpr.sourceNode, EErrors.InvalidConditionType, { typeName: String(conditionType) });
            return null;
        }

        if (!leftExprType.isEqual(rightExprType)) {
            context.error(leftExprType.sourceNode, EErrors.InvalidConditonValueTypes, {
                leftTypeName: String(leftExprType),
                rightTypeName: String(rightExprType)
            });
            return null;
        }

        if (!conditionType.readable) {
            context.error(conditionExpr.sourceNode, EErrors.InvalidTypeForReading, { tooltip: `${conditionExpr.toCode()}` });
        }

        if (!leftExprType.readable) {
            context.error(leftExpr.sourceNode, EErrors.InvalidTypeForReading, { tooltip: `${leftExpr.toCode()}` });
        }

        if (!rightExprType.readable) {
            context.error(rightExpr.sourceNode, EErrors.InvalidTypeForReading, { tooltip: `${rightExpr.toCode()}` });
        }

        return new ConditionalExprInstruction({ scope, sourceNode, cond: conditionExpr, left: leftExpr, right: rightExpr });
    }


    /**
     * AST example:
     *    AddExpr
     *         T_NON_TYPE_ID = 'b'
     *         T_PUNCTUATOR_43 = '+'
     *         T_NON_TYPE_ID = 'a'
     */
    protected analyzeArithmeticExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope
        const operator = <IArithmeticOperator>sourceNode.children[1].value;

        const left = this.analyzeExpr(context, program, children[children.length - 1]);
        const right = this.analyzeExpr(context, program, children[0]);

        if (!left || !right) {
            context.error(sourceNode, EErrors.InvalidArithmeticOperation, {
                operator: operator,
                leftTypeName: '[unknown]',
                rightTypeName: '[unknown]'
            });
            return null;
        }

        const leftType = <IVariableTypeInstruction>left.type;
        const rightType = <IVariableTypeInstruction>right.type;

        const type = Analyzer.checkTwoOperandExprTypes(context, operator, leftType,
            rightType, left.sourceNode, right.sourceNode, sourceNode);

        if (isNull(type)) {
            context.error(sourceNode, EErrors.InvalidArithmeticOperation, {
                operator: operator,
                leftTypeName: String(leftType),
                rightTypeName: String(rightType)
            });
            return null;
        }

        return new ArithmeticExprInstruction({ scope, sourceNode, left, right, operator, type });
    }


    /**
     * AST example:
     *    RelationalExpr
     *         T_NON_TYPE_ID = 'b'
     *         T_PUNCTUATOR_60 = '<'
     *         T_NON_TYPE_ID = 'a'
     */
    protected analyzeRelationExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const operator = <RelationOperator>sourceNode.children[1].value;

        const left = this.analyzeExpr(context, program, children[children.length - 1]);
        const right = this.analyzeExpr(context, program, children[0]);

        const leftType = left && left.type;
        const rightType = right && right.type;

        const exprType = Analyzer.checkTwoOperandExprTypes(context, operator,
            leftType, rightType,
            left && left.sourceNode, right && right.sourceNode,
            sourceNode);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidRelationalOperation, {
                operator: operator,
                leftTypeName: leftType ? type.signature(leftType) : '[unknown]',
                rightTypeName: rightType ? type.signature(rightType) : '[unknown]'
            });
            return null;
        }

        if (!left || !right) {
            return null;
        }

        return new RelationalExprInstruction({ sourceNode, scope, left, right, operator });
    }


    /**
     * AST example:
     *    LogicalOrExpr
     *         T_NON_TYPE_ID = 'b'
     *         T_OP_OR = '||'
     *         T_NON_TYPE_ID = 'a'
     */
    protected analyzeLogicalExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const operator = <ILogicalOperator>sourceNode.children[1].value;

        const left = this.analyzeExpr(context, program, children[children.length - 1]);
        const right = this.analyzeExpr(context, program, children[0]);

        const leftType = <IVariableTypeInstruction>left.type;
        const rightType = <IVariableTypeInstruction>right.type;

        const boolType = T_BOOL;

        if (!leftType.isEqual(boolType)) {
            context.error(leftType.sourceNode, EErrors.InvalidLogicOperation, {
                operator: operator,
                typeName: String(leftType)
            });
            return null;
        }
        if (!rightType.isEqual(boolType)) {
            context.error(rightType.sourceNode, EErrors.InvalidLogicOperation, {
                operator: operator,
                typeName: String(rightType)
            });
            return null;
        }

        if (!leftType.readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
        }

        if (!rightType.readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
        }

        return new LogicalExprInstruction({ scope, sourceNode, left, right, operator });
    }


    /**
     * AST example:
     *    InclusiveOrExpr
     *       + ComplexExpr 
     *         T_PUNCTUATOR_124 = '|'
     *       + ComplexExpr 
     */
    protected analyzeBitwiseExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const operator = <IBitwiseOperator>sourceNode.children[1].value;

        const left = this.analyzeExpr(context, program, children[children.length - 1]);
        const right = this.analyzeExpr(context, program, children[0]);

        if (!left || !right) {
            return null;
        }

        const leftType = <IVariableTypeInstruction>left.type;
        const rightType = <IVariableTypeInstruction>right.type;

        const type = Analyzer.checkTwoOperandExprTypes(context, operator,
            leftType, rightType,
            left.sourceNode, right.sourceNode,
            sourceNode);

        if (isNull(type)) {
            context.error(sourceNode, EErrors.InvalidBitwiseOperation, {
                operator: operator,
                leftTypeName: String(leftType),
                rightTypeName: String(rightType)
            });
            return null;
        }

        return new BitwiseExprInstruction({ scope, sourceNode, left, right, type, operator });
    }


    /**
     * AST example:
     *    AssignmentExpr
     *         T_UINT = '10'
     *         T_OP_AE = '+='
     *         T_NON_TYPE_ID = 'x'
     */
    protected analyzeAssignmentExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const operator = <AssigmentOperator>children[1].value;

        const left = this.analyzeExpr(context, program, children[children.length - 1]);

        if (!expression.unwind(left)) {
            // Invalid left-hand side in assignment
            context.error(sourceNode, EErrors.InvalidLeftHandSideInAssignment, {
                operator: operator
            });
        }

        const right = this.analyzeExpr(context, program, children[0]);

        if (isNull(left) || isNull(right)) {
            return null;
        }

        const leftType = <IVariableTypeInstruction>left.type;
        const rightType = <IVariableTypeInstruction>right.type;

        let exprType = <ITypeInstruction>null;

        if (operator !== '=') {
            exprType = Analyzer.checkTwoOperandExprTypes(context, operator, leftType, rightType, left.sourceNode, right.sourceNode, sourceNode);
            if (isNull(exprType)) {
                context.error(sourceNode, EErrors.InvalidArithmeticAssigmentOperation, {
                    operator: operator,
                    leftTypeName: type.signature(leftType),
                    rightTypeName: type.signature(rightType)
                });
            }
        } else {
            exprType = rightType;
        }

        // FIXME: show corrent source nodes for left and right expression.
        exprType = Analyzer.checkTwoOperandExprTypes(context, '=', leftType, exprType, left.sourceNode, null, sourceNode);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidAssigmentOperation, {
                leftTypeName: type.signature(leftType),
                rightTypeName: type.signature(rightType)
            });
        }

        return new AssignmentExprInstruction({ scope, sourceNode, left, right, operator });
    }


    /**
     * AST example:
     *    T_NON_TYPE_ID = 'name'
     */
    protected analyzeIdExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const scope = program.currentScope;
        const name = sourceNode.value;


        // beginning-of-hack
        // hack to support pseudo-dynamic expression
        //

        const exprSubst = context.expressions[name];
        if (exprSubst)
        {
            return exprSubst(context, program, sourceNode);
        }

        // end-of-hack

        const decl = scope.findVariable(name);

        if (isNull(decl)) {
            context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
            return null;
        }

        const id = new IdInstruction({ scope, sourceNode, name });
        return new IdExprInstruction({ scope, sourceNode, id, decl });
    }


    protected analyzeSimpleExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const name = sourceNode.name;
        const value = sourceNode.value;
        const scope = program.currentScope;

        switch (name) {
            case 'T_UINT':
                {
                    const { base, signed, heximal, exp } = parseUintLiteral(value);

                    return new IntInstruction({ scope, sourceNode, base, exp, signed, heximal });
                }
            case 'T_FLOAT':
                return new FloatInstruction({ scope, sourceNode, value: Number(value) });
            case 'T_STRING':
                return new StringInstruction({ scope, sourceNode, value });
            case 'T_KW_TRUE':
                return new BoolInstruction({ scope, sourceNode, value: true });
            case 'T_KW_FALSE':
                return new BoolInstruction({ scope, sourceNode, value: false });
        }

        return null;
    }


    /**
     * AST example:
     *    ConstType
     *       + Type 
     */
    protected analyzeConstTypeDim(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {

        const children = sourceNode.children;

        if (children.length > 1) {
            context.error(sourceNode, EErrors.InvalidCastTypeUsage);
            return null;
        }

        const type = <IVariableTypeInstruction>(this.analyzeType(context, program, children[0]));

        return type;
    }


    /**
     * AST example:
     *    VariableDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + Variable 
     *       + UsageType 
     */
    protected analyzeVarStructDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {
        const children = sourceNode.children;

        let usageType = this.analyzeUsageStructDecl(context, program, children[children.length - 1]);
        let vars: IVariableDeclInstruction[] = [];

        for (let i = children.length - 2; i >= 1; i--) {
            if (children[i].name === 'Variable') {
                vars = vars.concat(this.analyzeVariable(context, program, children[i], usageType));
            }
        }

        return vars;
    }


    protected analyzeUsageStructDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let usages: IVariableUsage[] = [];
        let type: ITypeInstruction = null;

        for (let i = children.length - 1; i >= 0; i--) {
            if (children[i].name === 'StructDecl') {
                type = this.analyzeStructDecl(context, program, children[i]);
                const typeDecl = new TypeDeclInstruction({ scope, sourceNode: children[i], type });
                addTypeDecl(context, scope, typeDecl);
            } else if (children[i].name === 'Usage') {
                const usage = this.analyzeUsage(children[i]);
                usages.push(usage);
            }
        }

        assert(!isNull(type));
        return new VariableTypeInstruction({ scope, sourceNode, usages, type });
    }


    /**
     * AST example:
     *    StructDecl
     *         T_PUNCTUATOR_125 = '}'
     *       + VariableDecl 
     *       + VariableDecl 
     *       + VariableDecl 
     *         T_PUNCTUATOR_123 = '{'
     *         T_NON_TYPE_ID = 'S'
     *         T_KW_STRUCT = 'struct'
     *    Struct
     *         T_PUNCTUATOR_125 = '}'
     *       + VariableDecl 
     *         T_PUNCTUATOR_123 = '{'
     *         T_KW_STRUCT = 'struct'
     */
    protected analyzeStruct(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let name: string = null;
        if (children[children.length - 2].name === 'T_NON_TYPE_ID') {
            name = children[children.length - 2].value;
        }

        let fields: IVariableDeclInstruction[] = [];

        program.push(EScopeType.k_Struct);

        for (let i = children.length - 4; i >= 1; i--) {
            if (children[i].name === 'VariableDecl') {
                fields = fields.concat(this.analyzeVariableDecl(context, program, children[i]));
            }
        }

        program.pop();

        let aligment = 1;

        if (context.cbuffer) {
            aligment = T_FLOAT4.size;
        }

        return new ComplexTypeInstruction({ scope, sourceNode, fields, name, aligment });
    }

    /**
     * AST example:
     *    FunctionDecl
     *       + StmtBlock 
     *       + FunctionDef 
     */
    /**
     * AST example:
     *    FunctionDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + FunctionDef 
     */
    /**
     * AST example:
     *    FunctionDecl
     *       + StmtBlock 
     *       + Annotation 
     *       + FunctionDef 
     */
    protected analyzeFunctionDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IFunctionDeclInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;
        const globalScope = program.globalScope;
        const lastNodeValue = children[0].value;

        let annotation: IAnnotationInstruction = null;
        let implementation: IStmtBlockInstruction = null;

        program.push(EScopeType.k_Default);

        const attributes = [];
        while (children[children.length - 1 - attributes.length].name === 'Attribute') {
            attributes.push(this.analyzeAttribute(context, program, children[children.length - 1 - attributes.length]));
        }

        const definition = this.analyzeFunctionDef(context, program, children[children.length - 1 - attributes.length]);

        if (isNull(definition)) {
            // TODO: emit proper error
            context.error(sourceNode, EErrors.UnknownInstruction, {});
            program.pop();
            return null;
        }

        // looking for function with exact type signatures (that's why we cant use 'asRelaxedType' predicate here!)
        let func = globalScope.findFunction(definition.name, definition.params.map(asType));

        if (!isDef(func)) {
            context.error(sourceNode, EErrors.CannotChooseFunction, { funcName: definition.name });
            program.pop();
            return null;
        }

        if (!isNull(func) && func.impl) {
            context.error(sourceNode, EErrors.FunctionRedefinition, { funcName: definition.name });
            program.pop();
            return null;
        }

        if (!isNull(func)) {
            if (!func.def.returnType.isEqual(definition.returnType)) {
                context.error(sourceNode, EErrors.InvalidFuncDefenitionReturnType, { funcName: definition.name });
                program.pop();
                return null;
            }
        }

        assert(context.funcDef === null);

        // TODO: rewrite context ?
        context.funcDef = definition;

        if (children.length === 3) {
            annotation = this.analyzeAnnotation(context, program, children[1]);
        }

        if (lastNodeValue !== ';') {
            // TODO: do to increase scope depth inside stmt block!!
            implementation = this.analyzeStmtBlock(context, program, children[0]);
        }

        program.pop();

        let hasVoidType = definition.returnType.isEqual(T_VOID);

        // validate unreachable code.
        if (!isNull(implementation)) {
            let stmtList = implementation.stmtList;

            // stmtList = stmtList.slice().reverse();
            for (let i = stmtList.length - 1; i >= 0; --i) {
                if (stmtList[i].instructionType == EInstructionTypes.k_ReturnStmt) {
                    if (i != stmtList.length - 1) {
                        context.error(stmtList[i + 1].sourceNode, EErrors.UnreachableCode);
                    }
                    break;
                }
            }
        }

        assert(scope == globalScope);
        func = new FunctionDeclInstruction({ sourceNode, scope, definition, implementation, annotation, attributes });

        // NOTE: possible implicit replacement of function 
        //       without implementaion inside addFunction() call.
        if (!globalScope.addFunction(func)) {
            context.error(sourceNode, EErrors.FunctionRedifinition, { funcName: definition.name });
        }

        if (!hasVoidType && !context.haveCurrentFunctionReturnOccur && !isNull(implementation)) {
            context.error(sourceNode, EErrors.InvalidFunctionReturnStmtNotFound, { funcName: definition.name });
        }

        return func;
    }



    /**
     * AST example:
     *    FunctionDef
     *       + ParamList 
     *         T_NON_TYPE_ID = 'bar'
     *       + UsageType 
     */
    protected analyzeFunctionDef(context: Context, program: ProgramScope, sourceNode: IParseNode): FunctionDefInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        const nameNode = children[children.length - 2];
        const name = nameNode.value;

        const retTypeNode = children[children.length - 1];
        let returnType = this.analyzeUsageType(context, program, retTypeNode);

        // TODO: is it really needed?
        if (!returnType || returnType.isContainSampler()) {
            context.error(retTypeNode, EErrors.InvalidFunctionReturnType, { funcName: name });
            return null;
        }

        let id = new IdInstruction({ scope, name, sourceNode: nameNode });

        let semantic: string = null;
        if (children.length === 4) {
            semantic = this.analyzeSemantic(children[0]);
        }

        let paramList = this.analyzeParamList(context, program, children[children.length - 3]);
        return new FunctionDefInstruction({ scope, sourceNode, returnType, id, paramList, semantic });
    }

    /**
     * AST example:
     *    ParamList
     *         T_PUNCTUATOR_41 = ')'
     *       + ParameterDecl 
     *         T_PUNCTUATOR_44 = ','
     *       + ParameterDecl 
     *         T_PUNCTUATOR_40 = '('
     */
    protected analyzeParamList(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {

        const children = sourceNode.children;
        let paramList: IVariableDeclInstruction[] = [];

        for (let i = children.length - 2; i >= 1; i--) {
            if (children[i].name === 'ParameterDecl') {
                let param = this.analyzeParameterDecl(context, program, children[i]);
                paramList.push(param);
            }
        }

        return paramList;
    }


    /**
     * AST example:
     *    ParameterDecl
     *       + Variable 
     *       + ParamUsageType 
     */
    protected analyzeParameterDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction {
        const children = sourceNode.children;

        const type = this.analyzeParamUsageType(context, program, children[1]);

        if (isNull(type)) {
            return null;
        }

        const param = this.analyzeVariable(context, program, children[0], type);

        return param;
    }

    /**
     * AST example:
     *    ParamUsageType
     *       + Type 
     *       + ParamUsage 
     */
    protected analyzeParamUsageType(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let usages: IVariableUsage[] = [];
        let type: ITypeInstruction = null;

        for (let i = children.length - 1; i >= 0; i--) {
            if (children[i].name === 'Type') {
                type = this.analyzeType(context, program, children[i]);
                if (isNull(type)) {
                    return null;
                }
            }
            else if (children[i].name === 'ParamUsage') {
                usages.push(this.analyzeUsage(children[i]));
            }
        }

        return new VariableTypeInstruction({ scope, sourceNode, type, usages });
    }

    /**
     * AST example:
     *    StmtBlock
     *         T_PUNCTUATOR_125 = '}'
     *       + Stmt 
     *       + Stmt 
     *         T_PUNCTUATOR_123 = '{'
     */
    protected analyzeStmtBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtBlockInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;

        if (!children) {
            return null;
        }

        let stmtList: IStmtInstruction[] = [];
        for (let i = children.length - 2; i > 0; i--) {
            let stmt = this.analyzeStmt(context, program, children[i]);
            if (!isNull(stmt)) {
                stmtList.push(stmt);
            }
        }

        return new StmtBlockInstruction({ sourceNode, scope, stmtList });
    }


    protected analyzeStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
        const children = sourceNode.children;
        let nonAttrNode = children.length;
        let nonAttrNodeName: string;

        do {
            nonAttrNodeName = children[--nonAttrNode].name;
        } while (nonAttrNodeName === 'Attribute');

        switch (nonAttrNodeName) {
            case 'SimpleStmt':
                return this.analyzeSimpleStmt(context, program, children[0]);
            case 'UseDecl':
                this.analyzeUseDecl(context, program, children[0]);
                return null;
            case 'T_KW_WHILE':
                return this.analyzeWhileStmt(context, program, sourceNode);
            case 'T_KW_FOR':
                return this.analyzeForStmt(context, program, sourceNode);
            case 'T_KW_IF':
                return this.analyzeIfStmt(context, program, sourceNode);
        }
        return null;
    }


    protected analyzeSimpleStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

        const scope = program.currentScope;
        const children = sourceNode.children;
        const firstNodeName: string = children[children.length - 1].name;

        switch (firstNodeName) {
            case 'T_KW_RETURN':
                return this.analyzeReturnStmt(context, program, sourceNode);

            case 'T_KW_DO':
                return this.analyzeWhileStmt(context, program, sourceNode);

            case 'StmtBlock':
                {
                    program.push(EScopeType.k_Default);
                    let stmtBlock = this.analyzeStmtBlock(context, program, children[0]);
                    program.pop();
                    return stmtBlock;
                }
            case 'T_KW_DISCARD':
            case 'T_KW_BREAK':
            case 'T_KW_CONTINUE':
                return this.analyzeBreakStmt(context, program, sourceNode);

            case 'TypeDecl':
            case 'VariableDecl':
            case 'VarStructDecl':
                return this.analyzeDeclStmt(context, program, children[0]);

            default:
                if (children.length === 2) {
                    return this.analyzeExprStmt(context, program, sourceNode);
                }

                return new SemicolonStmtInstruction({ sourceNode, scope });
        }
    }

    /**
     * AST example:
     *    SimpleStmt
     *         T_PUNCTUATOR_59 = ';'
     *         T_NON_TYPE_ID = 'y'
     *         T_KW_RETURN = 'return'
     */
    protected analyzeReturnStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;

        assert(context.func);

        const funcReturnType = context.funcDef.returnType;
        context.haveCurrentFunctionReturnOccur = true;

        if (children.length === 2) {
            tryResolveProxyType(funcReturnType, T_VOID);
        }

        if (funcReturnType.isEqual(T_VOID) && children.length === 3) {
            context.error(sourceNode, EErrors.InvalidReturnStmtVoid);
            return null;
        }
        else if (!funcReturnType.isEqual(T_VOID) && children.length === 2) {
            context.error(sourceNode, EErrors.InvalidReturnStmtEmpty);
            return null;
        }

        let expr: IExprInstruction = null;
        if (children.length === 3) {
            expr = this.analyzeExpr(context, program, children[1]);

            if (isNull(expr)) {
                context.error(sourceNode, EErrors.InvalidReturnStmtTypesNotEqual);
                return null;
            }

            tryResolveProxyType(funcReturnType, expr.type); // auto foo() { return typedExpr; }
            tryResolveProxyType(expr.type, funcReturnType); // typedFunc foo() { return auto; }
            
            if (!expr.type.isEqual(funcReturnType)) {
                context.error(sourceNode, EErrors.InvalidReturnStmtTypesNotEqual);
                return null;
            }
        }

        return new ReturnStmtInstruction({ sourceNode, scope, expr });
    }

    /**
     * AST example:
     *    SimpleStmt
     *         T_PUNCTUATOR_59 = ';'
     *         T_KW_BREAK = 'break'
     */
    protected analyzeBreakStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;

        const operator: BreakOperator = <BreakOperator>children[1].value;

        if (operator === 'discard' && !isNull(context.funcDef)) {
            // context.currentFunction.vertex = (false);
        }

        return new BreakStmtInstruction({ sourceNode, scope, operator });
    }


    /**
     * AST example:
     *    VariableDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + Variable 
     *         T_PUNCTUATOR_44 = ','
     *       + Variable 
     *         T_PUNCTUATOR_44 = ','
     *       + Variable 
     *       + UsageType 
     */
    protected analyzeDeclStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;
        const nodeName = sourceNode.name;

        let declList: IDeclInstruction[] = [];

        switch (nodeName) {
            case 'TypeDecl':
                declList.push(this.analyzeTypeDecl(context, program, sourceNode));
                break;
            case 'VariableDecl':
                declList = declList.concat(this.analyzeVariableDecl(context, program, sourceNode));
                break;
            case 'VarStructDecl':
                declList = declList.concat(this.analyzeVarStructDecl(context, program, sourceNode));
                break;
        }

        return new DeclStmtInstruction({ sourceNode, scope, declList });
    }


    protected analyzeExprStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
        const scope = program.currentScope;
        const children = sourceNode.children;
        const expr = this.analyzeExpr(context, program, children[1]);
        return new ExprStmtInstruction({ sourceNode, scope, expr });
    }


    /**
     * AST example:
     *    Stmt
     *       + Stmt 
     *         T_PUNCTUATOR_41 = ')'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_40 = '('
     *         T_KW_WHILE = 'while'
     *    SimpleStmt
     *         T_PUNCTUATOR_59 = ';'
     *         T_PUNCTUATOR_41 = ')'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_40 = '('
     *         T_KW_WHILE = 'while'
     *       + Stmt 
     *         T_KW_DO = 'do'
     */
    protected analyzeWhileStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
        const scope = program.currentScope;
        const children = sourceNode.children;
        const isDoWhile = (children[children.length - 1].value === 'do');
        const isNonIfStmt = (sourceNode.name === 'NonIfStmt') ? true : false;
        const boolType = T_BOOL;


        let cond: IExprInstruction = null;
        let conditionType: IVariableTypeInstruction = null;
        let body: IStmtInstruction = null;
        let operator: IDoWhileOperator = "do";

        if (isDoWhile) {
            operator = "do";
            cond = this.analyzeExpr(context, program, children[2]);
            conditionType = <IVariableTypeInstruction>cond.type;

            if (!conditionType.isEqual(boolType)) {
                context.error(sourceNode, EErrors.InvalidDoWhileCondition, { typeName: String(conditionType) });
                return null;
            }

            body = this.analyzeStmt(context, program, children[0]);
        }
        else {
            operator = "while";
            cond = this.analyzeExpr(context, program, children[2]);
            conditionType = <IVariableTypeInstruction>cond.type;

            if (!conditionType.isEqual(boolType)) {
                context.error(sourceNode, EErrors.InvalidWhileCondition, { typeName: String(conditionType) });
                return null;
            }

            if (isNonIfStmt) {
                body = this.analyzeNonIfStmt(context, program, children[0]);
            }
            else {
                body = this.analyzeStmt(context, program, children[0]);
            }
        }

        return new WhileStmtInstruction({ sourceNode, scope, cond, body, operator });
    }

    /**
     * AST example:
     *    Attribute
     *         T_PUNCTUATOR_93 = ']'
     *         T_PUNCTUATOR_41 = ')'
     *         T_UINT = '3'
     *         T_PUNCTUATOR_44 = ','
     *         T_UINT = '2'
     *         T_PUNCTUATOR_44 = ','
     *         T_UINT = '1'
     *         T_PUNCTUATOR_40 = '('
     *         T_NON_TYPE_ID = 'loop'
     *         T_PUNCTUATOR_91 = '['
     */
    protected analyzeAttribute(context: Context, program: ProgramScope, sourceNode: IParseNode): IAttributeInstruction {
        const scope = program.currentScope;
        const children = sourceNode.children;
        const name = children[children.length - 2].value;

        let args: ILiteralInstruction<number | boolean>[] = null;

        if (children.length > 3) {
            let argumentExpr: ILiteralInstruction<boolean | number> = null;

            args = [];
            for (let i = children.length - 4; i > 1; i--) {
                if (children[i].value !== ',') {
                    argumentExpr = <ILiteralInstruction<number | boolean>>this.analyzeSimpleExpr(context, program, children[i]);

                    // TODO: emit diagnostics error
                    assert(
                        argumentExpr.instructionType === EInstructionTypes.k_BoolExpr ||
                        argumentExpr.instructionType === EInstructionTypes.k_FloatExpr ||
                        argumentExpr.instructionType === EInstructionTypes.k_IntExpr);

                    args.push(argumentExpr);
                }
            }
        }

        return new AttributeInstruction({ scope, sourceNode, name, args });
    }

    /**
     * AST example:
     *    Stmt
     *       + Stmt 
     *         T_KW_ELSE = 'else'
     *       + NonIfStmt 
     *         T_PUNCTUATOR_41 = ')'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_40 = '('
     *         T_KW_IF = 'if'
     *       + Attribute 
     *       + Attribute 
     */
    protected analyzeIfStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
        const scope = program.currentScope;
        const children = sourceNode.children;

        let attributes = [];
        while (children[children.length - 1 - attributes.length].name === 'Attribute') {
            attributes.push(this.analyzeAttribute(context, program, children[children.length - 1 - attributes.length]));
        }

        const isIfElse = (children.length - attributes.length === 7);

        const condNode = children[children.length - 3 - attributes.length];
        const cond = this.analyzeExpr(context, program, condNode);

        if (!cond || !type.equals(asRelaxedType(cond.type), T_BOOL)) {
            context.error(condNode, EErrors.InvalidIfCondition, { typeName: cond ? String(cond.type) : '[unknown]' });
        } else if (!type.equals(cond.type, T_BOOL)) {
            context.warn(condNode, EWarnings.ImplicitTypeConversion, { tooltip: `${cond.type.name} => bool` });
        }

        let conseq: IStmtInstruction = null;
        let contrary: IStmtInstruction = null;

        if (isIfElse) {
            conseq = this.analyzeNonIfStmt(context, program, children[2]);
            contrary = this.analyzeStmt(context, program, children[0]);
        }
        else {
            conseq = this.analyzeNonIfStmt(context, program, children[0]);
        }

        if (!cond) {
            return null;
        }

        return new IfStmtInstruction({ sourceNode, scope, cond, conseq, contrary, attributes });
    }


    /**
     * AST example:
     *    NonIfStmt
     *       + SimpleStmt 
     */
    protected analyzeNonIfStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

        const children = sourceNode.children;
        const firstNodeName = children[children.length - 1].name;

        switch (firstNodeName) {
            case 'SimpleStmt':
                return this.analyzeSimpleStmt(context, program, children[0]);
            case 'T_KW_WHILE':
                return this.analyzeWhileStmt(context, program, sourceNode);
            case 'T_KW_FOR':
                return this.analyzeForStmt(context, program, sourceNode);
        }
        return null;
    }


    protected analyzeForStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
        const scope = program.currentScope;
        const children = sourceNode.children;
        const isNonIfStmt = (sourceNode.name === 'NonIfStmt');

        let body: IStmtInstruction = null;
        let init: ITypedInstruction = null;
        let cond: IExprInstruction = null;
        let step: IExprInstruction = null;

        let attributes = [];
        while (children[children.length - 1 - attributes.length].name === 'Attribute') {
            attributes.push(this.analyzeAttribute(context, program, children[children.length - 1 - attributes.length]));
        }

        if (children[1].name === 'ERROR') {
            return null;
        }

        program.push();

        const initSourceNode = children[children.length - 3 - attributes.length];
        const condSourceNode = children[children.length - 4 - attributes.length];

        init = this.analyzeForInit(context, program, initSourceNode);
        cond = this.analyzeForCond(context, program, condSourceNode);
        step = null;

        const isEmptyInit = initSourceNode.children[0].name == 'T_PUNCTUATOR_59';
        if (isNull(init) && !isEmptyInit) {
            context.error(initSourceNode, EErrors.InvalidForInitEmptyIterator);
        } else if (init.instructionType !== EInstructionTypes.k_VariableDecl) {
            // EAnalyzerErrors.InvalidForInitExpr
        }

        if (isNull(cond)) {
            context.error(condSourceNode, EErrors.InvalidForConditionEmpty);
        } else if (cond.instructionType !== EInstructionTypes.k_RelationalExpr) {
            // EAnalyzerErrors.InvalidForConditionRelation
        }

        if (children.length === 7 + attributes.length) {
            step = this.analyzeForStep(context, program, children[2]);
            if (isNull(step)) {
                context.error(children[2], EErrors.InvalidForStepEmpty);
            }
        }

        if (isNonIfStmt) {
            body = this.analyzeNonIfStmt(context, program, children[0]);
        }
        else {
            body = this.analyzeStmt(context, program, children[0]);
        }

        //     if (this._step.instructionType === EInstructionTypes.k_UnaryExpr ||
        //         this._step.instructionType === EInstructionTypes.k_AssignmentExpr ||
        //         this._step.instructionType === EInstructionTypes.k_PostfixArithmeticExpr) {

        //         // todo: rewrite this check!!
        //         // var sOperator: string = this._step.operator;
        //         // if (sOperator !== "++" && sOperator !== "--" &&
        //         //     sOperator !== "+=" && sOperator !== "-=") {
        //         //     this._setError(EAnalyzerErrors.BAD_FOR_STEP_OPERATOR, { operator: sOperator });
        //         //     return false;
        //         // }
        //     }
        //     else {
        //         this._setError(EAnalyzerErrors.InvalidForStepExpr);
        //         return false;
        //     }

        program.pop();

        return new ForStmtInstruction({ sourceNode, scope, init, cond, step, body });
    }


    /**
     * AST example:
     *    ForInit
     *         T_PUNCTUATOR_59 = ';'
     *       + AssignmentExpr 
     *    ForInit
     *       + VariableDecl 
     *    ForInit
     *         T_PUNCTUATOR_59 = ';'
     *       + Expr 
     */
    protected analyzeForInit(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypedInstruction {

        const children = sourceNode.children;
        const firstNodeName = children[children.length - 1].name;

        switch (firstNodeName) {
            case 'VariableDecl':
                // TODO: fixme!! 
                // add support for expressions like "a = 1, b = 2, c = 3"
                return this.analyzeVariableDecl(context, program, children[0])[0] || null;
            case 'Expr':
            case 'AssignmentExpr':
                return this.analyzeExpr(context, program, children[1]);
        }

        // ForInit : ';'
        return null;
    }


    /**
     * AST example:
     *    ForCond
     *         T_PUNCTUATOR_59 = ';'
     *       + RelationalExpr 
     */
    protected analyzeForCond(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;

        if (children.length === 1) {
            return null;
        }

        return this.analyzeExpr(context, program, children[1]);
    }


    /**
     * AST example:
     *    ForStep
     *       + UnaryExpr 
     */
    protected analyzeForStep(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        if (children.length == 0) {
            return null;
        }
        const step = this.analyzeExpr(context, program, children[0]);
        return step;
    }



    protected analyzePresetProperty(context: Context, program: ProgramScope, sourceNode: IParseNode): IPresetPropertyInstruction {

        const children = sourceNode.children;
        const nameNode = children[children.length - 1];
        const propName = nameNode.value;
        const propExprNode = children[children.length - 3];
        const exprNode = propExprNode.children[propExprNode.children.length - 1];
        const scope = program.currentScope;

        if (isNull(exprNode.value) || isNull(propName)) {
            console.warn('Pass state is incorrect.'); // TODO: move to warnings
            return null;
        }

        const decl = scope.findVariable(propName);
        if (isNull(decl)) {
            context.warn(sourceNode, EWarnings.PresetPropertyHasNotBeenFound);
            return null;
        }

        const type = decl.type;

        /**
         * AST example:
         *    PassStateExpr
         *         T_PUNCTUATOR_125 = '}'
         *         T_UINT = '1'
         *         T_PUNCTUATOR_44 = ','
         *         T_KW_TRUE = 'true'
         *         T_PUNCTUATOR_123 = '{'
         */
            const args: IExprInstruction[] =[];
            if (exprNode.value === '{' && propExprNode.children.length > 3) {
                for (let i = propExprNode.children.length - 2; i >= 1; i -= 2) {
                    const expr = this.analyzeExpr(context, program, propExprNode.children[i]);
                    // todo: use more strict check same as for InitExpr analyze
                    if (!expr.type.isEqual(type.arrayElementType)) {
                        context.warn(propExprNode.children[i], EWarnings.ImplicitTypeConversion, 
                            { tooltip: `${expr.type.name} => ${type.arrayElementType.name}` });
                    }
                    args.push(expr);
                }
            } else {
                if (exprNode.value === '{') {
                    args.push(this.analyzeExpr(context, program, propExprNode.children[1]));
                } else {
                    args.push(this.analyzeExpr(context, program, exprNode));
                }
            }
            
            const id = new IdInstruction({ name: propName, scope, sourceNode: nameNode });
            return new PresetProperty({ scope, sourceNode, id, args });
        }
 
 
    protected analyzePresetStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IPresetPropertyInstruction[] {
        const children = sourceNode.children;
        let props = []
        for (let i = children.length - 2; i >= 1; i--) {
            props.push(this.analyzePresetProperty(context, program, children[i]));
        }
        return props;
    }

    /**
     * AST example:
     *    PresetDecl
     *       + PassStateBlock 
     *         T_NON_TYPE_ID = 'X'
     *         T_KW_PRESET = 'preset'
     */
    protected analyzePresetDecl(context: Context, program: ProgramScope, sourceNode: IParseNode) {

        const children = sourceNode.children;
        const scope = program.currentScope;

        let id: IIdInstruction = null;
        for (let i = 0; i < children.length; ++i) {
            if (children[i].name === "T_NON_TYPE_ID") {
                let name = children[i].value;
                id = new IdInstruction({ sourceNode: children[i], scope, name });
            }
        }

        const props = this.analyzePresetStateBlock(context, program, children[0]);

        const preset = new PresetInstruction({
            scope,
            sourceNode,
            id,
            props
        });

        return preset;
    }

   

    protected analyzeTechniqueDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITechniqueInstruction {
        const children = sourceNode.children;
        const name = this.analyzeComplexName(children[children.length - 2]);
        // Specifies whether name should be interpreted as globalNamespace.name or just a name;
        const isComplexName = children[children.length - 2].children.length !== 1;
        const scope = program.currentScope;

        let annotation: IAnnotationInstruction = null;
        let semantic: string = null;
        let passList: IPassInstruction[] = null;
        let presets: IPresetInstruction[] = null;
        let techniqueType: ETechniqueType = ETechniqueType.k_BasicFx;

        for (let i = children.length - 3; i >= 0; i--) {
            if (children[i].name === 'Annotation') {
                annotation = this.analyzeAnnotation(context, program, children[i]);
            } else if (children[i].name === 'Semantic') {
                semantic = this.analyzeSemantic(children[i]);
            } else {
                [passList, presets] = this.analyzeTechnique(context, program, children[i]);
            }
        }

        const technique = new TechniqueInstruction({ sourceNode, name, techniqueType, semantic, annotation, passList, scope, presets });
        Analyzer.addTechnique(context, program, technique);
        return technique;
    }

    /**
     * AST example:
     *    TechniqueBody
     *         T_PUNCTUATOR_125 = '}'
     *       + PassDecl 
     *       + PassDecl 
     *         T_PUNCTUATOR_123 = '{'
     */
    protected analyzeTechnique(context: Context, program: ProgramScope, sourceNode: IParseNode): [IPassInstruction[], IPresetInstruction[]] {
        const children = sourceNode.children;
        let passList: IPassInstruction[] = [];
        let presetList: IPresetInstruction[] = [];

        for (let i = children.length - 2; i >= 1; i--) {
            // IP: hack to support preset extension
            if (children[i].children[0].name === 'PresetDecl') {
                let preset = this.analyzePresetDecl(context, program, children[i].children[0]);
                assert(!isNull(preset));
                presetList.push(preset);
                continue;
            }

            let pass = this.analyzePassDecl(context, program, children[i]);
            assert(!isNull(pass));
            passList.push(pass);
        }

        return [ passList, presetList ];
    }


    /**
     * AST example:
     *    PassDecl
     *       + PassStateBlock 
     *       + Annotation 
     *         T_NON_TYPE_ID = 'name'
     *         T_KW_PASS = 'pass'
     */
    protected analyzePassDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IPassInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;
        const entry = this.analyzePassStateBlockForShaders(context, program, children[0]);
        const renderStates = this.analyzePassStateBlock(context, program, children[0]);

        let id: IIdInstruction = null;
        for (let i = 0; i < children.length; ++i) {
            if (children[i].name === "T_NON_TYPE_ID") {
                let name = children[i].value;
                id = new IdInstruction({ scope, name });
            }
        }

        const pass = new PassInstruction({
            scope,
            sourceNode,
            renderStates,
            id,
            pixelShader: entry.pixel,
            vertexShader: entry.vertex
        });
        //TODO: add annotation and id

        return pass;
    }

    /**
     * AST example:
     *    PassState
     *         T_PUNCTUATOR_59 = ';'
     *       + PassStateExpr 
     *         T_PUNCTUATOR_61 = '='
     *         T_NON_TYPE_ID = 'VertexShader'
     */
    protected analyzePassStateBlockForShaders(context: Context, program: ProgramScope,
        sourceNode: IParseNode): { vertex: IFunctionDeclInstruction; pixel: IFunctionDeclInstruction; } {

        const children = sourceNode.children;

        let pixel: IFunctionDeclInstruction = null;
        let vertex: IFunctionDeclInstruction = null;

        const supportedTypeNames = ['vertexshader', 'pixelshader'];

        for (let i = children.length - 2; i >= 1; i--) {
            let func: IFunctionDeclInstruction = null;

            const childrenIth = children[i].children;
            const shaderTypeName = childrenIth[childrenIth.length - 1].value.toLowerCase();

            if (supportedTypeNames.indexOf(shaderTypeName) === -1) {
                continue;
            }

            func = this.analyzePassStateForShader(context, program, children[i], shaderTypeName);

            if (!isNull(func)) {
                switch (shaderTypeName) {
                    case 'vertexshader':
                        assert(vertex == null);
                        vertex = func;
                        break;
                    case 'pixelshader':
                        assert(pixel == null);
                        pixel = func;
                        break;
                    default:
                        // TODO: make error!
                        console.error('function is not suitable as shader entry point');
                }
            }
        }

        return { vertex, pixel };
    }


    protected analyzePassStateForShader(context: Context, program: ProgramScope,
        sourceNode: IParseNode, shaderType: string): IFunctionDeclInstruction {

        assert(shaderType === 'vertexshader' || shaderType === 'pixelshader');

        const children = sourceNode.children;

        const stateExprNode = children[children.length - 3];
        const exprNode = stateExprNode.children[stateExprNode.children.length - 1];

        const compileExpr = <CompileExprInstruction>this.analyzeExpr(context, program, exprNode);

        if (!compileExpr) {
            return null;
        }

        const shaderFunc = compileExpr.function;

        if (shaderType === 'vertexshader') {
            if (!checkForVertexUsage(shaderFunc.def)) {
                context.error(sourceNode, EErrors.FunctionIsNotCompatibleWithVertexShader, { funcDef: String(shaderFunc) });
            }
        }
        else {
            if (!checkForPixelUsage(shaderFunc.def)) {
                context.error(sourceNode, EErrors.FunctionIsNotCompatibleWithPixelShader, { funcDef: String(shaderFunc) });
            }
        }

        return shaderFunc;
    }


    /**
     * AST example:
     *    PassStateBlock
     *         T_PUNCTUATOR_125 = '}'
     *       + PassState 
     *       + PassState 
     *       + PassState 
     *         T_PUNCTUATOR_123 = '{'
     */
    protected analyzePassStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IMap<ERenderStateValues> {
        const children = sourceNode.children;
        let states: IMap<ERenderStateValues> = {}
        for (let i = children.length - 2; i >= 1; i--) {
            states = { ...states, ...this.analyzePassState(context, program, children[i]) };
        }
        return states;
    }


    /**
     * AST example:
     *    PassState
     *         T_PUNCTUATOR_59 = ';'
     *       + PassStateExpr 
     *         T_PUNCTUATOR_61 = '='
     *         T_NON_TYPE_ID = 'ZWRITE'
     */
    protected analyzePassState(context: Context, program: ProgramScope, sourceNode: IParseNode): IMap<ERenderStateValues> {

        const children = sourceNode.children;

        const stateType = children[children.length - 1].value.toUpperCase();
        const stateName = ERenderStates[stateType];

        if (!isNumber(stateName)) {
            return {};
        }

        const stateExprNode = children[children.length - 3];
        const exprNode = stateExprNode.children[stateExprNode.children.length - 1];

        if (isNull(exprNode.value)) {
            console.warn('Pass state is incorrect.'); // TODO: move to warnings
            return {};
        }

        let renderStates: IMap<ERenderStateValues> = {};
        if (exprNode.value === '{' && stateExprNode.children.length > 3) {
            const values: ERenderStateValues[] = new Array(Math.ceil((stateExprNode.children.length - 2) / 2));
            for (let i = stateExprNode.children.length - 2, j = 0; i >= 1; i -= 2, j++) {
                values[j] = getRenderStateValue(stateName, stateExprNode.children[i].value.toUpperCase());
            }

            switch (stateName) {
                case ERenderStates.BLENDFUNC:
                    if (values.length !== 2) {
                        console.warn('Pass state are incorrect.');
                        return {};
                    }
                    renderStates[ERenderStates.SRCBLENDCOLOR] = values[0];
                    renderStates[ERenderStates.SRCBLENDALPHA] = values[0];
                    renderStates[ERenderStates.DESTBLENDCOLOR] = values[1];
                    renderStates[ERenderStates.DESTBLENDALPHA] = values[1];
                    break;

                case ERenderStates.BLENDFUNCSEPARATE:
                    if (values.length !== 4) {
                        console.warn('Pass state are incorrect.');
                        return {};
                    }
                    renderStates[ERenderStates.SRCBLENDCOLOR] = values[0];
                    renderStates[ERenderStates.SRCBLENDALPHA] = values[2];
                    renderStates[ERenderStates.DESTBLENDCOLOR] = values[1];
                    renderStates[ERenderStates.DESTBLENDALPHA] = values[3];
                    break;

                case ERenderStates.BLENDEQUATIONSEPARATE:
                    if (values.length !== 2) {
                        console.warn('Pass state are incorrect.');
                        return {};
                    }
                    renderStates[ERenderStates.BLENDEQUATIONCOLOR] = values[0];
                    renderStates[ERenderStates.BLENDEQUATIONALPHA] = values[1];
                    break;

                default:
                    console.warn('Pass state is incorrect.');
                    return {};
            }
        }
        else {
            let value: string = '';
            if (exprNode.value === '{') {
                value = stateExprNode.children[1].value.toUpperCase();
            }
            else {
                value = exprNode.value.toUpperCase();
            }

            const stateValue = getRenderStateValue(stateName, value);

            if (stateValue !== ERenderStateValues.UNDEF) {
                switch (stateName) {
                    case ERenderStates.SRCBLEND:
                        renderStates[ERenderStates.SRCBLENDCOLOR] = stateValue;
                        renderStates[ERenderStates.SRCBLENDALPHA] = stateValue;
                        break;
                    case ERenderStates.DESTBLEND:
                        renderStates[ERenderStates.DESTBLENDCOLOR] = stateValue;
                        renderStates[ERenderStates.DESTBLENDALPHA] = stateValue;
                        break;
                    case ERenderStates.BLENDEQUATION:
                        renderStates[ERenderStates.BLENDEQUATIONCOLOR] = stateValue;
                        renderStates[ERenderStates.BLENDEQUATIONALPHA] = stateValue;
                        break;
                    default:
                        renderStates[stateName] = stateValue;
                        break;
                }
            }
        }
        return renderStates;
    }

    /**
     * AST example:
     *    ImportDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + ComplexNameOpt 
     *         T_KW_IMPORT = 'import'
     */
    // TODO: restore functionality! 
    protected analyzeImportDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): null {
        const children = sourceNode.children;
        const componentName = this.analyzeComplexName(children[children.length - 2]);

        // if (!isNull(technique)) {
        //     //We can import techniques from the same file, but on this stage they don`t have component yet.
        //     //So we need special mehanism to add them on more belated stage
        //     // let sShortedComponentName: string = componentName;
        //     if (!isNull(context.moduleName)) {
        //         // sShortedComponentName = componentName.replace(_sProvideNameSpace + ".", "");
        //     }

        //     throw null;
        //     // let pTechniqueFromSameEffect: ITechniqueInstruction = _pTechniqueMap[componentName] || _pTechniqueMap[sShortedComponentName];
        //     // if (isDefAndNotNull(pTechniqueFromSameEffect)) {
        //     //     technique._addTechniqueFromSameEffect(pTechniqueFromSameEffect, iShift);
        //     //     return;
        //     // }
        // }

        const sourceTechnique: ITechniqueInstruction = null;//fx.techniques[componentName];
        if (!sourceTechnique) {
            context.error(sourceNode, EErrors.ImportedComponentNotExists, { componentName: componentName });
            return null;
        }

        return null;
    }


    /**
     * AST example:
     *    StructDecl
     *         T_PUNCTUATOR_125 = '}'
     *       + VariableDecl 
     *         T_PUNCTUATOR_123 = '{'
     *         T_NON_TYPE_ID = 'S'
     *         T_KW_STRUCT = 'struct'
     */
    protected analyzeStructDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const name = children[children.length - 2].value;

        program.push(EScopeType.k_Struct);

        let fields: IVariableDeclInstruction[] = [];
        for (let i = children.length - 4; i >= 1; i--) {
            if (children[i].name === 'VariableDecl') {
                fields = fields.concat(this.analyzeVariableDecl(context, program, children[i]));
            }
        }

        program.pop();

        return new ComplexTypeInstruction({ scope, sourceNode, name, fields });
    }


    /**
     * AST example:
     *    TypeDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + VariableDim 
     *       + ConstType 
     *         T_KW_TYPEDEF = 'typedef'
     */
    protected analyzeTypedefDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeDeclInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        // TODO: rework to support complex typ defenitions like 
        //  typedef const float4 TYPE_T;
        //          ^^^^^^
        // IP: at the moment type defenitions are not supported

        const vdimNode = children[1];
        const alias = vdimNode.children[0].value;
        const type = this.analyzeConstTypeDim(context, program, children[2]);
        // this.analyzeConstTypeDim() <= doesn't support 'const float' like expressions with modifiers

        // const type = new TypeAlias()
        // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        // add support for typealiases

        const typedef = new TypedefInstruction({ scope, sourceNode, type, alias });
        addTypeAlias(context, scope, typedef);
        
        return typedef;
    }


    /**
     * AST example:
     *    TypeDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + StructDecl 
     */
    /**
     * AST example:
     *    TypeDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + VariableDim 
     *       + ConstType 
     *         T_KW_TYPEDEF = 'typedef'
     */
    protected analyzeTypeDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeDeclInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let type: ITypeInstruction = null;
        if (children.length === 2) {
            type = this.analyzeStructDecl(context, program, children[1]);
        }
        else if (children.length === 4) {
           return this.analyzeTypedefDecl(context, program, sourceNode);
        }
        else {
            context.error(sourceNode, EErrors.UnsupportedTypeDecl);
        }


        const typeDecl = new TypeDeclInstruction({ scope, sourceNode, type });
        addTypeDecl(context, scope, typeDecl);
        return typeDecl;
    }


    protected analyzeUnknDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IInstruction[] {
        switch (sourceNode.name) {
            case 'TechniqueDecl':
                return [this.analyzeTechniqueDecl(context, program, sourceNode)];
            case 'UseDecl':
                this.analyzeUseDecl(context, program, sourceNode); // << always 'use strict' by default!
                return null;
            case 'ImportDecl':
                return [this.analyzeImportDecl(context, program, sourceNode)];
            case 'ProvideDecl':
                return [this.analyzeProvideDecl(context, program, sourceNode)];
            case 'TypeDecl':
                return [this.analyzeTypeDecl(context, program, sourceNode)];
            case 'VariableDecl':
                return this.analyzeVariableDecl(context, program, sourceNode);
            case 'VarStructDecl':
                return this.analyzeVarStructDecl(context, program, sourceNode);
            case 'FunctionDecl':
                assert(program.currentScope == program.globalScope);
                let fdecl = null;
                context.beginFunc();
                fdecl = this.analyzeFunctionDecl(context, program, sourceNode);
                context.endFunc();
                return [fdecl];
            case 'CbufferDecl':
                return [this.analyzeCbufferDecl(context, program, sourceNode)];
            case 'SamplerStateDecl':
                return [this.analyzeSamplerStateDecl(context, program, sourceNode)];
            case 'T_PUNCTUATOR_59':
                context.warn(sourceNode, EWarnings.EmptySemicolon);
                return null;
            default:
                context.error(sourceNode, EErrors.UnknownInstruction, { name });
        }

        return null;
    }


    protected analyzeGlobals(context: Context, program: ProgramScope, slastDocument: ISLASTDocument): IInstruction[] {
        if (isNull(slastDocument) || isNull(slastDocument.root)) {
            return null;
        }

        const children = slastDocument.root.children;
        let globals: IInstruction[] = [];

        if (isNull(children)) {
            return [];
        }

        for (let i = children.length - 1; i >= 0; i--) {
            globals.push(...(this.analyzeUnknDecl(context, program, children[i]) || []));
        }

        return globals.filter(decl => !!decl);
    }


    protected createContext(uri: IFile, expressions?: IMap<IExprSubstCallback>): Context {
        return new Context(uri, expressions);
    }

    // create new scope
    protected createProgram(document: ISLDocument = null): ProgramScope {
        let parent = <IScope>SystemScope.SCOPE;
        if (!isNull(document)) {
            parent = document.root.scope;
        }
        return new ProgramScope(parent);
    }

    // extends existing scoope
    protected createProgramEx(document: ISLDocument = null): ProgramScope {
        if (isNull(document)) {
            return this.createProgram();
        }
        return new ProgramScopeEx(document.root.scope);
    }

    /**
     * Post-analysis validation.
     */
    protected validate(context: Context, program: ProgramScope, root: IInstructionCollector) {
        checkFunctionsForRecursion(context, program);
        program.validate();
    }

    /**
     * Create a new standalone document.
     * @param slastDocument 
     * @param document Context source. The scope of the parent document will be used when creating a new one.
     * @returns 
     */
    parse(slastDocument: ISLASTDocument, document?: ISLDocument): ISLDocument {
        const uri = slastDocument.uri;
        const program = this.createProgram(document);
        const context = this.createContext(uri);

        let instructions: IInstruction[] = null;
        try {
            instructions = this.analyzeGlobals(context, program, slastDocument);
        } catch (e) {
            // critical errors were occured
            // throw e;
            console.error(e);
        }

        const root = new InstructionCollector({ scope: program.globalScope, instructions });
        this.validate(context, program, root);

        const diagnosticReport = Diagnostics.mergeReports([slastDocument.diagnosticReport, context.diagnostics.resolve()]);
        return { root, diagnosticReport, uri };
    }

    /**
     * Extend existing document. (Base document stay unchanged (!))
     * @param slastAddition Extension. (Can be null if just copy of base document is needed.)
     * @param slBase Original document to be extneded.
     * @param options 
     * @returns 
     * 
     * The idea is to create new documents which references to existings scope and extends 
     * existings instruction list, but leave parent document unchanged. 
     */
    extend(
        slastAddition: ISLASTDocument, 
        slBase: ISLDocument,
        expressions?: IMap<IExprSubstCallback>
        ): ISLDocument {
        let uri = slBase.uri;

        // new program (scope chain) holds links to known variales, types etc of parent document
        let program = this.createProgramEx(slBase);
        // context is absolutely new (!)
        let context = this.createContext(uri, expressions);
        let instructions = slBase.root.instructions;
        let diagnosticReport = slBase.diagnosticReport;

        if (slastAddition)
        {
            uri = slastAddition.uri;
            try {
                // new list holds links to existings instructions (!)
                instructions = instructions.concat(this.analyzeGlobals(context, program, slastAddition));
            } catch (e) {
                // critical errors were occured
                // throw e;
                console.error(e);
            }

            diagnosticReport = Diagnostics.mergeReports([diagnosticReport, slastAddition.diagnosticReport, context.diagnostics.resolve()]);
        }
        
        const root = new InstructionCollector({ scope: program.globalScope, instructions });
        this.validate(context, program, root);
        return { root, diagnosticReport, uri };
    }


    // function addFunctionDecl(context: Context, program: ProgramScope, sourceNode: IParseNode, func: IFunctionDeclInstruction): void {
    //     if (isSystemFunction(func)) {
    //         context.error(sourceNode, EErrors.SystemFunctionRedefinition, { funcName: func.name });
    //     }

    //     let isFunctionAdded: boolean = program.addFunction(func);

    //     if (!isFunctionAdded) {
    //         context.error(sourceNode, EErrors.FunctionRedifinition, { funcName: func.name });
    //     }
    // }


    protected static addTechnique(context: Context, program: ProgramScope, technique: ITechniqueInstruction): void {
        let name: string = technique.name;

        if (!isNull(program.globalScope.findTechnique(name))) {
            context.error(technique.sourceNode, EErrors.TechniqueNameRedefinition, { techName: name });
            return;
        }

        program.globalScope.addTechnique(technique);
    }



    /**
    * Check the possibility of using the operator between the two types.
    * Returns the type obtained as a result of application of the operator, or, if it is impossible to apply, null.
     *
     * @operator {string} One of the operators: + - * / % += -= *= /= %= = < > <= >= == != =
     * @leftType {ITypeInstruction} Type of the left side of the expression.
     * @rightType {ITypeInstruction} Type of the right side of the expression.
     */
    static checkTwoOperandExprTypes(
        context: Context,
        operator: string,
        leftType: ITypeInstruction,
        rightType: ITypeInstruction,
        leftSourceNode: IParseNode = null,
        rightSourceNode: IParseNode = null,
        exprSourceNode: IParseNode = null, 
        { isInitializing = false } = {}): ITypeInstruction {

        if (!leftType || !rightType) {
            return null;
        }

        leftSourceNode = leftSourceNode || leftType.sourceNode;
        rightSourceNode = rightSourceNode || rightType.sourceNode;

        const isComplex = leftType.isComplex() || rightType.isComplex();
        const isArray = leftType.isNotBaseArray() || rightType.isNotBaseArray();
        // const isSampler = isSamplerType(leftType) || isSamplerType(rightType);

        
        const constBoolType = (len: number) => {
            if (len >= 1 && len <= 4) {
                let ba = [ T_BOOL, T_BOOL2, T_BOOL3, T_BOOL4 ];
                return VariableTypeInstruction.wrapAsConst(ba[len - 1], SystemScope.SCOPE);
            }
            console.error('unsupported code branch');
            return null;
        }

        if (isArray/* || isSampler*/) {
            // TODO: allow expressions like: arr1 = arr2; ??
            return null;
        }

        if (Analyzer.isAssignmentOperator(operator)) {
            if (!leftType.writable && !isInitializing) {
                context.error(leftSourceNode, EErrors.InvalidTypeForWriting);
            }

            if (!rightType.readable) {                
                context.error(rightSourceNode, EErrors.InvalidTypeForReading);
            }

            if (operator !== '=' && !leftType.readable) {
                // temp solution for cases like:
                // void f(out int x) 
                // {
                //      x = 10;
                //      x |= 1; // << allow to write here
                // }
                context.error(exprSourceNode, EErrors.InvalidTypeForReading, { tooltip: `lvalue is not readable` });
            }
        }
        else {
            if (!leftType.readable) {
                context.error(leftSourceNode, EErrors.InvalidTypeForReading);
            }

            if (!rightType.readable) {
                context.error(rightSourceNode, EErrors.InvalidTypeForReading);
            }
        }

        if (isComplex) {
            if (operator === '=' && leftType.isEqual(rightType)) {
                return <IVariableTypeInstruction>leftType;
            }
            // samplers and arrays can't be compared directly
            else if (Analyzer.isEqualityOperator(operator) && !leftType.isContainArray() && !leftType.isContainSampler()) {
                return constBoolType(1);
            }

            // TODO: emit error (unsupported operation on complex values)
            return null;
        }

        // FIXME: use operands' scope instead of system scope?
        let leftBaseType = VariableTypeInstruction.wrap(<SystemTypeInstruction>leftType.baseType, SystemScope.SCOPE);
        let rightBaseType = VariableTypeInstruction.wrap(<SystemTypeInstruction>rightType.baseType, SystemScope.SCOPE);


        if (Analyzer.isBitwiseOperator(operator)) {
            if (!SystemScope.isIntBasedType(leftType) && 
                !SystemScope.isUintBasedType(leftType)) {
                if (!SystemScope.isBoolBasedType(leftType)) {
                    // todo: use correct error
                    context.error(leftSourceNode, EErrors.InvalidCastUnknownType, { tooltip: `${leftType.name} => int` });
                } else {
                    context.warn(leftSourceNode, EWarnings.ImplicitTypeConversion, { tooltip: 'bool => int' });
                }
                leftBaseType = VariableTypeInstruction.wrap(T_INT, SystemScope.SCOPE);
            }

            if (!SystemScope.isIntBasedType(rightType) && 
                !SystemScope.isUintBasedType(rightType)) {
                if (!SystemScope.isBoolBasedType(rightType)) {
                    // todo: use correct error
                    context.error(rightSourceNode, EErrors.InvalidCastUnknownType, { tooltip: `${rightType.name} => int` });
                } else {
                    context.warn(rightSourceNode, EWarnings.ImplicitTypeConversion, { tooltip: 'bool => int' });
                }
                rightBaseType = VariableTypeInstruction.wrap(T_INT, SystemScope.SCOPE);
            }

            switch (operator) {
                case '&':
                case '|':
                case '^':
                    if (!leftBaseType.isEqual(rightType)) {
                        // TODO: emit warning (bitwise between int and uint)
                    }
            }

            return leftBaseType;
        }

        // hack to allow int/uint comparisson
        if (type.equals(leftType, asRelaxedType(rightType))) {
            if (!type.equals(leftType, rightType)) {
                context.warn(exprSourceNode, EWarnings.ImplicitTypeConversion, { tooltip: `${leftType.name} [${operator}] ${rightType.name}` });
            }

            if (Analyzer.isArithmeticalOperator(operator)) {
                if (!isMatrixType(leftType) || (operator !== '/' && operator !== '/=')) {
                    return leftBaseType;
                }

                // TODO: emit error (cannot perfome devision with matrices)
                return null;
            }
            else if (Analyzer.isRelationalOperator(operator)) {
                if (isScalarType(leftType) || isVectorType(leftType)) {
                    return constBoolType(leftType.length);
                }

                // TODO: allow vectors? for ex: vec3 < vec3 => bool3
                // TODO: emit error (cannot perfome comparison with non-scalar)
                return null;
            }
            else if (Analyzer.isEqualityOperator(operator)) {
                return constBoolType(leftType.length);
            }
            else if (operator === '=') {
                return leftBaseType;
            }

            // TODO: emit error (unknonw operation)
            return null;
        }

        // op: "+", "-", "*", "/"
        //     "+=", "-=", "*=", "/=", "%="
        if (Analyzer.isArithmeticalOperator(operator)) {

            // op: "+", "-", "*", "/", "%"

            const length =
                isScalarType(leftType) ? rightType.length :
                    isScalarType(rightType) ? leftType.length :
                        Math.min(leftType.length, rightType.length);

            const baseType = determMostPreciseBaseType(leftType, rightType);
            const resultType = SystemScope.findType(`${baseType.name}${length === 1 ? '' : length}`);

            if (!resultType) {
                assert(false, `cannot determ result type for "${leftType.toCode()} ${operator} ${rightType.toCode()}"`);
                return null;
            }


            // op: "+=", "-=", "*=", "/=", "%="
            if (Analyzer.isAssignmentOperator(operator)) {
                if (!leftType.isEqual(resultType)) {
                    // TODO: add support for imlicit conversions
                    // TODO: emit error (operator cannot be used with a given lvalue)
                    context.error(exprSourceNode, EErrors.OperatorCannotBeUsedWithGivenLValue, {});
                    return null;
                }
            }


            if (resultType.length < leftType.length || resultType.length < rightType.length) {
                context.warn(exprSourceNode, EWarnings.ImplicitTypeTruncation, {
                    tooltip: `${leftType.toCode()} ${operator} ${rightType.toCode()} => ${resultType.toCode()}`
                });
            }

            if (!determBaseType(leftType).isEqual(determBaseType(rightType))) {
                // do not emit errors for expr like: float2 * float, int2 + int etc..
                context.warn(exprSourceNode, EWarnings.ImplicitTypeConversion, {
                    tooltip: `${leftType.toCode()} ${operator} ${rightType.toCode()} => ${resultType.toCode()}`
                });
            }

            /**
             * Special case for matrices
             */
            if (operator === '*' || operator === '*=') {
                if (isMatrixType(leftType) && isVectorType(rightType)) {
                    if (leftType.length === rightType.length) {
                        return rightBaseType;
                    }
                    return null;
                }
                else if (isMatrixType(rightType) && isVectorType(leftType)) {
                    if (leftType.length === rightType.length) {
                        return leftBaseType;
                    }
                    return null;
                }
            }

            return <IVariableTypeInstruction>resultType;
        }

        if (operator === '=') {
            if (isScalarType(rightType)) {
                if (determTypePrecision(leftType) > determTypePrecision(rightType)) {
                    context.warn(exprSourceNode, EWarnings.ImplicitTypeConversion, {
                        tooltip: `${leftType.toCode()} ${operator} ${rightType.toCode()} => ${leftType.toCode()}`
                    });
                    return leftType;
                }

                if (isIntegerType(leftType) && isIntegerType(rightType)) {
                    context.warn(exprSourceNode, EWarnings.ImplicitTypeConversion, {
                        tooltip: `${leftType.toCode()} ${operator} ${rightType.toCode()} => ${leftType.toCode()}`
                    });
                    return leftType;
                }
            }
        }

        return null;
    }


    /**
     * Check the ability to use the operator to the data type.
     * Returns the type obtained as a result of application of the operator, or, if it is impossible to apply, null.
     *
     * @operator {string} One of the operators: + - ! ++ --
     * @leftType {IVariableTypeInstruction} Operand type
     */
    protected static checkOneOperandExprType(context: Context, sourceNode: IParseNode, operator: string,
        type: IVariableTypeInstruction): IVariableTypeInstruction {

        const isComplex = type.isComplex();
        const isArray = type.isNotBaseArray();
        // const isSampler = isSamplerType(type);

        if (isComplex || isArray/* || isSampler*/) {
            return null;
        }

        if (!type.readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
        }


        if (operator === '++' || operator === '--') {
            if (!type.writable) {
                context.error(sourceNode, EErrors.InvalidTypeForWriting);
            }

            return type;
        }

        if (operator === '!') {
            const boolType = <IVariableTypeInstruction>T_BOOL;
            // validate(boolType, EInstructionTypes.k_VariableDecl);

            if (type.isEqual(boolType)) {
                return boolType;
            }
            else {
                return null;
            }
        }
        else {
            if (isBoolBasedType(type)) {
                return null;
            }
            else {
                return (<SystemTypeInstruction>type.baseType) as any; // << TODO: fixme!!!! remove "any"!
            }
        }

        return null;
    }


    protected static isAssignmentOperator(operator: string): boolean {
        return operator === '+=' || operator === '-=' ||
            operator === '*=' || operator === '/=' ||
            operator === '%=' || operator === '=' || 
            operator === '|=' || operator === '&=' || 
            operator === '>>=' || operator === '<<=' || operator === '^=';
    }

    protected static isBitwiseOperator(operator: string): boolean {
        return operator === '>>' || operator === '<<' ||
            operator === '|' || operator === '&' || operator === '^' || 
            operator === '|=' || operator === '&=' ||
            operator === '>>=' || operator === '<<=' || operator === '^=';
    }

    protected static isArithmeticalOperator(operator: string): boolean {
        return operator === '+' || operator === '+=' ||
            operator === '-' || operator === '-=' ||
            operator === '*' || operator === '*=' ||
            operator === '/' || operator === '/=' ||
            operator === '%' || operator === '%=';
    }


    protected static isRelationalOperator(operator: string): boolean {
        return operator === '>' || operator === '>=' ||
            operator === '<' || operator === '<=';
    }


    protected static isEqualityOperator(operator: string): boolean {
        return operator === '==' || operator === '!=';
    }
}


