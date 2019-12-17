import { assert, isDef, isDefAndNotNull, isNull, mwalk } from '@lib/common';
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { ECheckStage, EInstructionTypes, EScopeType, ETechniqueType, IAnnotationInstruction, IAttributeInstruction, IConstructorCallInstruction, IDeclInstruction, IDoWhileOperator, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IIdInstruction, IInitExprInstruction, IInstruction, IInstructionError, ILiteralInstruction, ILogicalOperator, IPassInstruction, IProvideInstruction, ISamplerStateInstruction, IScope, IStmtBlockInstruction, IStmtInstruction, ITechniqueInstruction, ITypeDeclInstruction, ITypedInstruction, ITypeInstruction, IUnaryOperator, IVariableDeclInstruction, IVariableTypeInstruction, IVariableUsage } from '@lib/idl/IInstruction';
import { IMap } from '@lib/idl/IMap';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IParseNode, IRange } from "@lib/idl/parser/IParser";
import { Diagnostics } from '@lib/util/Diagnostics';

import { AnalyzerDiagnostics } from '../AnalyzerDiagnostics';
import { visitor } from '../Visitors';
import { ArithmeticExprInstruction, ArithmeticOperator } from './instructions/ArithmeticExprInstruction';
import { AssigmentOperator, AssignmentExprInstruction } from "./instructions/AssignmentExprInstruction";
import { AttributeInstruction } from './instructions/AttributeInstruction';
import { BoolInstruction } from './instructions/BoolInstruction';
import { BreakOperator, BreakStmtInstruction } from './instructions/BreakStmtInstruction';
import { CastExprInstruction } from './instructions/CastExprInstruction';
import { CompileExprInstruction } from './instructions/CompileExprInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ComplexTypeInstruction } from './instructions/ComplexTypeInstruction';
import { ConditionalExprInstruction } from './instructions/ConditionalExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { DeclStmtInstruction } from './instructions/DeclStmtInstruction';
import { ExprInstruction } from './instructions/ExprInstruction';
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
import { ProvideInstruction } from "./instructions/ProvideInstruction";
import { RelationalExprInstruction, RelationOperator } from './instructions/RelationalExprInstruction';
import { ReturnStmtInstruction } from './instructions/ReturnStmtInstruction';
import { SamplerOperator, SamplerStateBlockInstruction } from './instructions/SamplerStateBlockInstruction';
import { SamplerStateInstruction } from "./instructions/SamplerStateInstruction";
import { SemicolonStmtInstruction } from './instructions/SemicolonStmtInstruction';
import { StmtBlockInstruction } from './instructions/StmtBlockInstruction';
import { StringInstruction } from './instructions/StringInstruction';
import { SystemTypeInstruction } from './instructions/SystemTypeInstruction';
import { TechniqueInstruction } from './instructions/TechniqueInstruction';
import { TypeDeclInstruction } from './instructions/TypeDeclInstruction';
import { UnaryExprInstruction } from './instructions/UnaryExprInstruction';
import { EVariableUsageFlags, VariableDeclInstruction } from './instructions/VariableDeclInstruction';
import { VariableTypeInstruction } from './instructions/VariableTypeInstruction';
import { WhileStmtInstruction } from './instructions/WhileStmtInstruction';
import { ProgramScope } from './ProgramScope';
import * as SystemScope from './SystemScope';
import { T_BOOL, T_INT, T_UINT, T_VOID } from './SystemScope';

type IErrorInfo = IMap<any>;
type IWarningInfo = IMap<any>;


function validate(instr: IInstruction, expectedType: EInstructionTypes) {
    assert(instr.instructionType === expectedType);
}

// TODO: refactor it
function findConstructor(type: ITypeInstruction, args: IExprInstruction[]): IVariableTypeInstruction {
    return new VariableTypeInstruction({ type, scope: null });
}


function _errorFromInstruction(context: Context, sourceNode: IParseNode, pError: IInstructionError): void {
    context.error(sourceNode, pError.code, isNull(pError.info) ? {} : pError.info);
}


function checkInstruction<INSTR_T extends IInstruction>(context: Context, inst: INSTR_T, stage: ECheckStage): INSTR_T {
    if (!inst._check(stage)) {
        _errorFromInstruction(context, inst.sourceNode, inst._getLastError());
        return null;
    }
    return inst;
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



export interface ICompileValidator {
    // validate with custom arguments ignoring statements inside compile expression.
    args?: ITypeInstruction[];
    ret?: ITypeInstruction;
}



export class Context {
    readonly uri: string | null;
    readonly diagnostics: AnalyzerDiagnostics;

    /** driven from provide declaration */
    moduleName: string | null;

    // funct states
    func: boolean;                              // Are we inside a function analysis?
    funcDef: IFunctionDefInstruction | null;    // Current function definition.
    haveCurrentFunctionReturnOccur: boolean;    // TODO: replace with array of return statements.

    renderStates: IMap<ERenderStateValues>;

    constructor(uri: string) {
        this.diagnostics = new AnalyzerDiagnostics;
        this.uri = uri;
        this.moduleName = null;
        this.haveCurrentFunctionReturnOccur = false;
    }


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
     */
    protected analyzeInitExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IInitExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let args: IExprInstruction[] = [];

        if (children.length === 1) {
            args.push(this.analyzeExpr(context, program, children[0]));
        }
        else {
            for (let i = 0; i < children.length; i++) {
                if (children[i].name === 'InitExpr') {
                    args.push(this.analyzeInitExpr(context, program, children[i]));
                }
            }
        }

        // TODO: determ type!!
        const initExpr: IInitExprInstruction = new InitExprInstruction({ scope, sourceNode, args, type: null });
        return initExpr;
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

        let varType = new VariableTypeInstruction({ scope, sourceNode, type, usages });
        return checkInstruction(context, varType, ECheckStage.CODE_TARGET_SUPPORT);
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
                        const SYSTEM_TYPES = ['RWBuffer', 'RWStructuredBuffer', 'AppendStructuredBuffer'];
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
                            type = template.produceType(args);
                            if (isNull(type)) {
                                context.error(sourceNode, EErrors.CannotProduceType, { typeName });
                                return null;
                            }
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
        const supportedUsages = ['uniform', 'const', 'in', 'out', 'inout'];
        assert(supportedUsages.indexOf(sourceNode.value) !== -1);
        return <IVariableUsage>sourceNode.value;
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
        } else {
            // All variables found inside function definition are arguments.
            if (!context.funcDef) {
                usageFlags |= EVariableUsageFlags.k_Argument;
            }
            usageFlags |= EVariableUsageFlags.k_Local;
        }


        let id: IIdInstruction = null;
        let arrayIndex: IExprInstruction = null;
        let type: IVariableTypeInstruction = null;

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
                annotation = this.analyzeAnnotation(children[i]);
            } else if (children[i].name === 'Semantic') {
                semantic = this.analyzeSemantic(children[i]);
            } else if (children[i].name === 'Initializer') {
                let args = this.analyzeInitializerArguments(context, program, children[i]);
                init = new InitExprInstruction({ scope, sourceNode: children[i], args, type });

                let isValidInit = false;
                try {
                    isValidInit = init.optimizeForVariableType(type);
                } catch (e) { };

                if (!isValidInit) {
                    // TODO: make it warning
                    context.error(sourceNode, EErrors.InvalidVariableInitializing, { varName: id.name });
                    init = null;
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

        return checkInstruction(context, varDecl, ECheckStage.CODE_TARGET_SUPPORT);
    }


    /**
     * AST example:
     *    Annotation
     *         T_PUNCTUATOR_62 = '>'
     *         T_PUNCTUATOR_60 = '<'
     */
    protected analyzeAnnotation(sourceNode: IParseNode): IAnnotationInstruction {
        // todo
        return null;
    }


    /**
     * AST example:
     *    Semantic
     *         T_NON_TYPE_ID = 'SEMANTIC'
     *         T_PUNCTUATOR_58 = ':'
     */
    protected analyzeSemantic(sourceNode: IParseNode): string {
        let semantic = sourceNode.children[0].value;
        return semantic;
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
    protected analyzeInitializerArguments(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction[] {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let args: IExprInstruction[] = [];

        if (children.length === 2) {
            args.push(this.analyzeExpr(context, program, children[0]));
        }
        else {
            for (let i = children.length - 3; i >= 1; i--) {
                if (children[i].name === 'InitExpr') {
                    args.push(this.analyzeInitExpr(context, program, children[i]));
                }
            }
        }

        return args;
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
            case 'AndExpr':
            case 'OrExpr':
                return this.analyzeLogicalExpr(context, program, sourceNode);
            case 'AssignmentExpr':
                return this.analyzeAssignmentExpr(context, program, sourceNode);
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
            case 'T_KW_SAMPLER_STATE':
                return this.analyzeSamplerStateBlock(context, program, sourceNode);
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

        args = compileArgs ? compileArgs.map(arg => arg.type) : null;

        let func: IFunctionDeclInstruction = null;

        if (validators) {
            for (let validator of validators) {
                args = compileArgs ? compileArgs.map(arg => arg.type) : null;
                retType = null;

                args = validator.args || args;
                retType = validator.ret || retType;

                func = program.globalScope.findFunction(shaderFuncName, args);
                if (func) {
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

        let expr = new CompileExprInstruction({ args: compileArgs, scope, type, operand: func, sourceNode });
        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
    }


    /**
     * AST example:
     *    ObjectExpr
     *       + StateBlock 
     *         T_KW_SAMPLER_STATE = 'sampler_state'
     */
    protected analyzeSamplerStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        sourceNode = sourceNode.children[0];

        let scope = program.currentScope;
        let children = sourceNode.children;
        let operator: SamplerOperator = "sampler_state";
        let texture = null;
        let params = <ISamplerStateInstruction[]>[];

        for (let i = children.length - 2; i >= 1; i--) {
            let param = this.analyzeSamplerState(context, program, children[i]);
            if (!isNull(param)) {
                params.push(param);
            }
        }

        let expr = new SamplerStateBlockInstruction({ sourceNode, scope, operator, params });
        checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

        return expr;
    }


    /**
     * AST example:
     *    State
     *         T_PUNCTUATOR_59 = ';'
     *         StateExpr
     *              T_PUNCTUATOR_62 = '>'
     *              T_NON_TYPE_ID = 'tex0'
     *              T_PUNCTUATOR_60 = '<'
     *         T_PUNCTUATOR_61 = '='
     *         T_NON_TYPE_ID = 'Texture'
     */
    protected analyzeSamplerState(context: Context, program: ProgramScope, sourceNode: IParseNode): SamplerStateInstruction {

        const children = sourceNode.children;
        const scope = program.currentScope;

        if (children[children.length - 2].name === 'StateIndex') {
            context.error(sourceNode, EErrors.UnsupportedStateIndex);
            return null;
        }

        let stateExprNode = children[children.length - 3];
        let subStateExprNode = stateExprNode.children[stateExprNode.children.length - 1];
        let stateType = children[children.length - 1].value.toUpperCase();
        let stateValue = '';

        if (isNull(subStateExprNode.value)) {
            context.error(subStateExprNode, EErrors.InvalidSamplerTexture);
            return null;
        }

        switch (stateType) {
            case 'TEXTURE':
                if (stateExprNode.children.length !== 3 || subStateExprNode.value === '{') {
                    context.error(subStateExprNode, EErrors.InvalidSamplerTexture);
                    return null;
                }

                let texNameNode = stateExprNode.children[1];
                let texName = texNameNode.value;
                if (isNull(texName) || !scope.findVariable(texName)) {
                    context.error(stateExprNode.children[1], EErrors.InvalidSamplerTexture);
                    return null;
                }

                let texDecl = scope.findVariable(texName);
                let texId = new IdInstruction({ scope, sourceNode: texNameNode, name: texName });
                let tex = new IdExprInstruction({ scope, sourceNode: texNameNode, id: texId, decl: texDecl });

                return new SamplerStateInstruction({ scope, sourceNode, name: stateType, value: tex });
            case 'ADDRESSU': /* WRAP_S */
            case 'ADDRESSV': /* WRAP_T */
                stateValue = subStateExprNode.value.toUpperCase();
                switch (stateValue) {
                    case 'WRAP':
                    case 'CLAMP':
                    case 'MIRROR':
                        break;
                    default:
                        // TODO: move to errors
                        // console.warn('Webgl don`t support this wrapmode: ' + stateValue);
                        return null;
                }
                break;

            case 'MAGFILTER':
            case 'MINFILTER':
                stateValue = subStateExprNode.value.toUpperCase();
                switch (stateValue) {
                    case 'POINT':
                        stateValue = 'NEAREST';
                        break;
                    case 'POINT_MIPMAP_POINT':
                        stateValue = 'NEAREST_MIPMAP_NEAREST';
                        break;
                    case 'LINEAR_MIPMAP_POINT':
                        stateValue = 'LINEAR_MIPMAP_NEAREST';
                        break;
                    case 'POINT_MIPMAP_LINEAR':
                        stateValue = 'NEAREST_MIPMAP_LINEAR';
                        break;

                    case 'NEAREST':
                    case 'LINEAR':
                    case 'NEAREST_MIPMAP_NEAREST':
                    case 'LINEAR_MIPMAP_NEAREST':
                    case 'NEAREST_MIPMAP_LINEAR':
                    case 'LINEAR_MIPMAP_LINEAR':
                        break;
                    default:
                        // TODO: move to erros api
                        // console.warn('Webgl don`t support this texture filter: ' + stateValue);
                        return null;
                }
                break;

            default:
                // TODO: move to erros api
                console.warn('Don`t support this texture param: ' + stateType);
                return null;
        }

        return new SamplerStateInstruction({
            sourceNode,
            scope,
            name: stateType,
            value: new StringInstruction({ sourceNode: stateExprNode, scope, value: stateValue })
        });
    }


    /**
     * AST example:
     *    ComplexExpr
     *         T_PUNCTUATOR_41 = ')'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_44 = ','
     *         T_UINT = '1'
     *         T_PUNCTUATOR_40 = '('
     *         T_TYPE_ID = 'float4'
     */
    protected analyzeComplexExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const firstNodeName = children[children.length - 1].name;

        switch (firstNodeName) {
            case 'T_NON_TYPE_ID':
                return this.analyzeFunctionCallExpr(context, program, sourceNode);
            case 'BaseType':
            case 'T_TYPE_ID':
                return this.analyzeConstructorCallExpr(context, program, sourceNode);
            default:
                return this.analyzeSimpleComplexExpr(context, program, sourceNode);
        }
    }


    protected analyzeFunctionCallExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IFunctionCallInstruction {
        const children = sourceNode.children;
        const funcName = children[children.length - 1].value;
        const scope = program.currentScope;
        const globalScope = program.globalScope;

        let expr: IFunctionCallInstruction = null;

        // let currentAnalyzedFunction = context.currentFunction;

        let args: IExprInstruction[] = null;
        if (children.length > 3) {
            let argumentExpr: IExprInstruction;
            args = [];
            for (let i = children.length - 3; i > 0; i--) {
                if (children[i].value !== ',') {
                    argumentExpr = this.analyzeExpr(context, program, children[i]);
                    args.push(argumentExpr);
                }
            }
        }

        let func = globalScope.findFunction(funcName, args ? args.map(arg => arg ? arg.type : null) : null);

        if (isNull(func)) {
            context.error(sourceNode, EErrors.InvalidComplexNotFunction, { funcName: funcName });
            return null;
        }

        if (!isDef(func)) {
            context.error(sourceNode, EErrors.CannotChooseFunction, { funcName: funcName });
            return null;
        }


        // if (!isNull(currentAnalyzedFunction)) {
        //     if (func.functionType != EFunctionType.k_Pixel) {
        //         assert(currentAnalyzedFunction.functionType != EFunctionType.k_Vertex);
        //         currentAnalyzedFunction.$overwriteType(EFunctionType.k_Function);
        //     }

        //     if (func.functionType != EFunctionType.k_Vertex) {
        //         currentAnalyzedFunction.$overwriteType(EFunctionType.k_Vertex);
        //     }
        // }

        if (func.instructionType === EInstructionTypes.k_FunctionDecl ||
            func.instructionType === EInstructionTypes.k_SystemFunctionDecl) {
            if (!isNull(args)) {
                const funcArguments = func.def.params;

                for (let i = 0; i < args.length; i++) {
                    if (isNull(args[i])) {
                        continue;
                    }
                    if (funcArguments[i].type.hasUsage('out')) {
                        const decl = ExprInstruction.UnwindExpr(args[i]);
                        if (isNull(decl)) {
                            context.error(args[i].sourceNode, EErrors.InvalidExprIsNotLValue);
                            return null;
                        }
                        if (!args[i].type.writable) {
                            context.error(args[i].sourceNode, EErrors.InvalidTypeForWriting);
                            return null;
                        }
                    } else if (funcArguments[i].type.hasUsage('inout')) {
                        const decl = ExprInstruction.UnwindExpr(args[i]);
                        if (isNull(decl)) {
                            context.error(args[i].sourceNode, EErrors.InvalidExprIsNotLValue);
                            return null;
                        }
                        if (!args[i].type.writable) {
                            context.error(args[i].sourceNode, EErrors.InvalidTypeForWriting);
                            return null;
                        }

                        if (!args[i].type.readable) {
                            context.error(args[i].sourceNode, EErrors.InvalidTypeForReading);
                            return null;
                        }
                    } else {
                        if (!args[i].type.readable) {
                            context.error(args[i].sourceNode, EErrors.InvalidTypeForReading);
                            return null;
                        }
                    }
                }

                // for (let i = args.length; i < funcArguments.length; i++) {
                //     funcCallExpr.push(funcArguments[i].initializeExpr, false);
                // }

            }


            const type = VariableTypeInstruction.wrap(func.def.returnType, scope);
            let funcCallExpr = new FunctionCallInstruction({ scope, type, decl: func, args, sourceNode });

            // if (!isNull(currentAnalyzedFunction)) {
            //     currentAnalyzedFunction.addUsedFunction(func);
            // }

            expr = funcCallExpr;
        }
        else {
            console.error("@undefined_behavior");
        }

        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
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
                if (!args[i].type.readable) {
                    context.error(sourceNode, EErrors.InvalidTypeForReading);
                    return null;
                }
            }
        }

        const expr = new ConstructorCallInstruction({ scope, sourceNode, ctor: exprType, args });
        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);;
    }


    // TODO: add comment!
    protected analyzeSimpleComplexExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let expr = this.analyzeExpr(context, program, children[1]);
        if (isNull(expr)) {
            return null
        }
        // let type = <IVariableTypeInstruction>expr.type;

        let complexExpr = new ComplexExprInstruction({ scope, sourceNode, expr });
        return checkInstruction(context, complexExpr, ECheckStage.CODE_TARGET_SUPPORT);
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

        const expr = new PostfixIndexInstruction({ scope, sourceNode, element: postfixExpr, index: indexExpr });
        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
    }


    /**
     * 
     * @param elementType Type of the element. (**element.postfix**)
     * @param fieldName 
     */
    protected createFieldDecl(elementType: IVariableTypeInstruction, fieldName: string): IVariableDeclInstruction {
        if (!elementType.hasField(fieldName)) {
            return null;
        }

        // in case of typical postfix exp. like "element.postfix":
        //      elementType => type defrived from the parameter or variable declaration or derived from another expr
        //      elementType.subType => original complex (structure) type
        // in case of something else, like ccall with postfix "float2(1.0, 2.0).yx":
        //      elementType => original system type

        const scope = elementType.scope;
        const { id, type, type: { padding, length }, semantic } =
            // FIXME: remove 'logical OR' operation, always use subType
            (elementType.subType || elementType).getField(fieldName); // arrayIndex

        //// note: here is no sourceNode for field.
        // note: sourceNode for field is being used from the original complex structure.

        // let arrayIndex: IExprInstruction = null;
        // if (type.isNotBaseArray()) {
        //     // using of length instead of arrayIndex because of lack of api functionality :/
        //     assert(length != Instruction.UNDEFINE_LENGTH, "undefined behaviour found");
        //     arrayIndex = new IntInstruction({ scope, value: String(length) });
        // }

        const fieldType = new VariableTypeInstruction({ type, scope, padding, sourceNode: type.sourceNode/*, arrayIndex*/ });
        const fieldId = new IdInstruction({ scope, name: id.name, sourceNode: id.sourceNode });
        const field = new VariableDeclInstruction({ scope, id: fieldId, type: fieldType, semantic, sourceNode: fieldId.sourceNode });

        return Instruction.$withParent(field, elementType);
    }


    /**
     * 
     * @param type Type of the element. (**element.postfix**)
     */
    protected analyzePosifixPointField(context: Context, program: ProgramScope, sourceNode: IParseNode, type: IVariableTypeInstruction): IIdExprInstruction {
        if (isNull(type)) {
            return null;
        }

        const scope = program.currentScope;
        const name = sourceNode.value;              // fiedl name
        const decl = this.createFieldDecl(type, name);   // field decl

        if (isNull(decl)) {
            return null;
        }

        const id = new IdInstruction({ scope, sourceNode, name });
        const expr = new IdExprInstruction({ sourceNode, scope, id, decl });
        return expr;
    }

    /**
     * AST example:
     *    PostfixExpr
     *         T_NON_TYPE_ID = 'val'
     *         T_PUNCTUATOR_46 = '.'
     *         T_NON_TYPE_ID = 'some'
     */
    protected analyzePostfixPoint(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        const postfixExpr = this.analyzeExpr(context, program, children[children.length - 1]);
        if (isNull(postfixExpr)) {
            // TODO: emit error?
            return null;
        }

        const postfixExprType = postfixExpr.type;
        const fieldName = children[children.length - 3].value;

        const fieldNameExpr = this.analyzePosifixPointField(context, program, children[children.length - 3], postfixExprType);

        if (isNull(fieldNameExpr)) {
            context.error(sourceNode, EErrors.InvalidPostfixNotField, { typeName: String(postfixExprType), fieldName });
            return null;
        }

        const expr = new PostfixPointInstruction({ sourceNode, scope, element: postfixExpr, postfix: fieldNameExpr });
        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
    }


    protected analyzePostfixArithmetic(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;
        const operator: PostfixOperator = <PostfixOperator>children[0].value;

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

        let expr: PostfixArithmeticInstruction = new PostfixArithmeticInstruction({ scope, sourceNode, operator, expr: postfixExpr });
        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
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

        let unaryExpr = new UnaryExprInstruction({ scope, sourceNode, expr, operator });
        return checkInstruction(context, unaryExpr, ECheckStage.CODE_TARGET_SUPPORT);
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
        const sourceExpr = this.analyzeExpr(context, program, children[0]);

        if (isNull(sourceExpr)) {
            return null;
        }

        if (!(<IVariableTypeInstruction>sourceExpr.type).readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        const expr = new CastExprInstruction({ scope, sourceNode, sourceExpr, type });
        return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);;
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

        if (isNull(conditionExpr) || isNull(leftExpr) || isNull(rightExpr)) {
            context.error(conditionExpr ? conditionExpr.sourceNode : sourceNode, EErrors.InvalidConditionType, { typeName: '[unknown]' });
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
            context.error(conditionType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        if (!leftExprType.readable) {
            context.error(leftExprType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        if (!rightExprType.readable) {
            context.error(rightExprType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        const condExpr = new ConditionalExprInstruction({ scope, sourceNode, cond: conditionExpr, left: leftExpr, right: rightExpr });
        return checkInstruction(context, condExpr, ECheckStage.CODE_TARGET_SUPPORT);;
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
        const operator = <ArithmeticOperator>sourceNode.children[1].value;

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

        const type = Analyzer.checkTwoOperandExprTypes(context, operator, leftType, rightType, left.sourceNode, right.sourceNode);

        if (isNull(type)) {
            context.error(sourceNode, EErrors.InvalidArithmeticOperation, {
                operator: operator,
                leftTypeName: String(leftType),
                rightTypeName: String(rightType)
            });
            return null;
        }

        const arithmeticExpr = new ArithmeticExprInstruction({ scope, sourceNode, left, right, operator, type });
        return checkInstruction(context, arithmeticExpr, ECheckStage.CODE_TARGET_SUPPORT);
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

        const leftType = left ? left.type : null;
        const rightType = right ? right.type : null;

        const exprType = Analyzer.checkTwoOperandExprTypes(context, operator,
            leftType, rightType,
            left ? left.sourceNode : null,
            right ? right.sourceNode : null);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidRelationalOperation, {
                operator: operator,
                leftTypeName: leftType ? leftType.hash : '[unknown]',
                rightTypeName: rightType ? rightType.hash : '[unknown]'
            });
            return null;
        }

        if (!left || !right) {
            return null;
        }

        const relationExpr = new RelationalExprInstruction({ sourceNode, scope, left, right, operator });
        return checkInstruction(context, relationExpr, ECheckStage.CODE_TARGET_SUPPORT);
    }


    /**
     * AST example:
     *    OrExpr
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
            return null;
        }

        if (!rightType.readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        let logicalExpr = new LogicalExprInstruction({ scope, sourceNode, left, right, operator });
        return checkInstruction(context, logicalExpr, ECheckStage.CODE_TARGET_SUPPORT);
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

        if (!ExprInstruction.UnwindExpr(left)) {
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

        let exprType: IVariableTypeInstruction = null;

        if (operator !== '=') {
            exprType = Analyzer.checkTwoOperandExprTypes(context, operator, leftType, rightType, left.sourceNode, right.sourceNode);
            if (isNull(exprType)) {
                context.error(sourceNode, EErrors.InvalidArithmeticAssigmentOperation, {
                    operator: operator,
                    leftTypeName: leftType.hash,
                    rightTypeName: rightType.hash
                });
            }
        } else {
            exprType = rightType;
        }

        // FIXME: show corrent source nodes for left and right expression.
        exprType = Analyzer.checkTwoOperandExprTypes(context, '=', leftType, exprType);

        if (isNull(exprType)) {
            context.error(sourceNode, EErrors.InvalidAssigmentOperation, {
                leftTypeName: leftType.hash,
                rightTypeName: rightType.hash
            });
        }

        let assigmentExpr = new AssignmentExprInstruction({ scope, sourceNode, left, right, operator });
        return checkInstruction(context, assigmentExpr, ECheckStage.CODE_TARGET_SUPPORT);
    }


    /**
     * AST example:
     *    T_NON_TYPE_ID = 'name'
     */
    protected analyzeIdExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const scope = program.currentScope;

        let name = sourceNode.value;
        let decl = scope.findVariable(name);

        if (isNull(decl)) {
            context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
            return null;
        }

        let id = new IdInstruction({ scope, sourceNode, name });
        let varId = new IdExprInstruction({ scope, sourceNode, id, decl });
        return checkInstruction(context, varId, ECheckStage.CODE_TARGET_SUPPORT);
    }


    protected analyzeSimpleExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
        const name = sourceNode.name;
        const value = sourceNode.value;
        const scope = program.currentScope;

        switch (name) {
            case 'T_UINT':
                return new IntInstruction({ scope, sourceNode, value });
            case 'T_FLOAT':
                return new FloatInstruction({ scope, sourceNode, value });
            case 'T_STRING':
                return new StringInstruction({ scope, sourceNode, value });
            case 'T_KW_TRUE':
                return new BoolInstruction({ scope, sourceNode, value: "true" });
            case 'T_KW_FALSE':
                return new BoolInstruction({ scope, sourceNode, value: "false" });
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

        if (!type.isBase()) {
            context.error(sourceNode, EErrors.InvalidCastTypeNotBase, { typeName: String(type) });
        }

        return checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);
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
        let varType = new VariableTypeInstruction({ scope, sourceNode, usages, type });
        return checkInstruction(context, varType, ECheckStage.CODE_TARGET_SUPPORT);
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

        let i: number = 0;
        for (i = children.length - 4; i >= 1; i--) {
            if (children[i].name === 'VariableDecl') {
                fields = fields.concat(this.analyzeVariableDecl(context, program, children[i]));
            }
        }

        program.pop();

        const struct = new ComplexTypeInstruction({ scope, sourceNode, fields, name });
        return checkInstruction(context, struct, ECheckStage.CODE_TARGET_SUPPORT);
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



        let func = globalScope.findFunction(definition.name, definition.params.map(param => param ? param.type : null));

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
            annotation = this.analyzeAnnotation(children[1]);
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
        if (returnType.isContainSampler()) {
            context.error(retTypeNode, EErrors.InvalidFunctionReturnType, { funcName: name });
            return null;
        }

        let id = new IdInstruction({ scope, name, sourceNode: nameNode });

        let semantic: string = null;
        if (children.length === 4) {
            semantic = this.analyzeSemantic(children[0]);
        }

        let paramList = this.analyzeParamList(context, program, children[children.length - 3]);
        let funcDef = new FunctionDefInstruction({ scope, sourceNode, returnType, id, paramList, semantic })

        checkInstruction(context, funcDef, ECheckStage.CODE_TARGET_SUPPORT);

        return funcDef;
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

        let paramType = new VariableTypeInstruction({ scope, sourceNode, type, usages });
        checkInstruction(context, paramType, ECheckStage.CODE_TARGET_SUPPORT);

        return paramType;
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

        let stmtList: IStmtInstruction[] = [];
        for (let i = children.length - 2; i > 0; i--) {
            let stmt = this.analyzeStmt(context, program, children[i]);
            if (!isNull(stmt)) {
                stmtList.push(stmt);
            }
        }

        const stmtBlock = new StmtBlockInstruction({ sourceNode, scope, stmtList });
        checkInstruction(context, stmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

        return stmtBlock;
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

            if (!funcReturnType.isEqual(expr.type)) {
                context.error(sourceNode, EErrors.InvalidReturnStmtTypesNotEqual);
                return null;
            }
        }

        const returnStmtInstruction = new ReturnStmtInstruction({ sourceNode, scope, expr });
        checkInstruction(context, returnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return returnStmtInstruction;
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

        const breakStmtInstruction = new BreakStmtInstruction({ sourceNode, scope, operator });
        checkInstruction(context, breakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return breakStmtInstruction;
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

        const declStmtInstruction = new DeclStmtInstruction({ sourceNode, scope, declList });
        checkInstruction(context, declStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return declStmtInstruction;
    }


    protected analyzeExprStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
        const scope = program.currentScope;
        const children = sourceNode.children;
        const expr = this.analyzeExpr(context, program, children[1]);

        const exprStmt = new ExprStmtInstruction({ sourceNode, scope, expr });
        checkInstruction(context, exprStmt, ECheckStage.CODE_TARGET_SUPPORT);

        return exprStmt;
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

        const whileStmt = new WhileStmtInstruction({ sourceNode, scope, cond, body, operator });
        checkInstruction(context, whileStmt, ECheckStage.CODE_TARGET_SUPPORT);

        return whileStmt;
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

        const cond = this.analyzeExpr(context, program, children[children.length - 3 - attributes.length]);

        if (!cond || !cond.type.isEqual(T_BOOL)) {
            context.error(sourceNode, EErrors.InvalidIfCondition, { typeName: cond ? String(cond.type) : '[unknown]' });
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

        const ifStmt = new IfStmtInstruction({ sourceNode, scope, cond, conseq, contrary, attributes });
        checkInstruction(context, ifStmt, ECheckStage.CODE_TARGET_SUPPORT);

        return ifStmt;
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


        if (children[1].name === 'ERROR') {
            return null;
        }

        program.push();

        init = this.analyzeForInit(context, program, children[children.length - 3]);
        cond = this.analyzeForCond(context, program, children[children.length - 4]);
        step = null;

        if (children.length === 7) {
            step = this.analyzeForStep(context, program, children[2]);
        }

        if (isNonIfStmt) {
            body = this.analyzeNonIfStmt(context, program, children[0]);
        }
        else {
            body = this.analyzeStmt(context, program, children[0]);
        }

        program.pop();

        const pForStmtInstruction = new ForStmtInstruction({ sourceNode, scope, init, cond, step, body });
        checkInstruction(context, pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

        return pForStmtInstruction;
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
                // TODO: fixme!! 
                // add support for expressions like "a = 1, b = 2, c = 3"
                return this.analyzeExpr(context, program, children[0]);
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


    protected analyzeTechniqueDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITechniqueInstruction {
        const children = sourceNode.children;
        const name = this.analyzeComplexName(children[children.length - 2]);
        // Specifies whether name should be interpreted as globalNamespace.name or just a name;
        const isComplexName = children[children.length - 2].children.length !== 1;
        const scope = program.currentScope;

        let annotation: IAnnotationInstruction = null;
        let semantic: string = null;
        let passList: IPassInstruction[] = null;
        let techniqueType: ETechniqueType = ETechniqueType.k_BasicFx;

        for (let i = children.length - 3; i >= 0; i--) {
            if (children[i].name === 'Annotation') {
                annotation = this.analyzeAnnotation(children[i]);
            } else if (children[i].name === 'Semantic') {
                semantic = this.analyzeSemantic(children[i]);
            } else {
                passList = this.analyzeTechnique(context, program, children[i]);
            }
        }

        const technique = new TechniqueInstruction({ sourceNode, name, techniqueType, semantic, annotation, passList, scope });
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
    protected analyzeTechnique(context: Context, program: ProgramScope, sourceNode: IParseNode): IPassInstruction[] {
        const children = sourceNode.children;
        let passList: IPassInstruction[] = [];
        for (let i = children.length - 2; i >= 1; i--) {
            let pass = this.analyzePassDecl(context, program, children[i]);
            assert(!isNull(pass));
            passList.push(pass);
        }
        return passList;
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
        const shaderFunc = compileExpr.function;

        if (shaderType === 'vertexshader') {
            if (!FunctionDefInstruction.checkForVertexUsage(shaderFunc.def)) {
                context.error(sourceNode, EErrors.FunctionIsNotCompatibleWithVertexShader, { funcDef: String(shaderFunc) });
            }
        }
        else {
            if (!FunctionDefInstruction.checkForPixelUsage(shaderFunc.def)) {
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
        const stateName = ERenderStates[stateType] || null;

        if (isNull(stateName)) {
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

        const struct = new ComplexTypeInstruction({ scope, sourceNode, name, fields });
        return checkInstruction(context, struct, ECheckStage.CODE_TARGET_SUPPORT);
    }


    /**
     * AST example:
     *    TypeDecl
     *         T_PUNCTUATOR_59 = ';'
     *       + StructDecl 
     */
    protected analyzeTypeDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeDeclInstruction {
        const children = sourceNode.children;
        const scope = program.currentScope;

        let type: ITypeInstruction = null;
        if (children.length === 2) {
            type = this.analyzeStructDecl(context, program, children[1]);
        }
        else {
            context.error(sourceNode, EErrors.UnsupportedTypeDecl);
        }


        let typeDecl = new TypeDeclInstruction({ scope, sourceNode, type });
        addTypeDecl(context, scope, typeDecl);
        return checkInstruction(context, typeDecl, ECheckStage.CODE_TARGET_SUPPORT);
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


    protected createContext(uri: string): Context {
        return new Context(uri);
    }

    protected createProgram(): ProgramScope {
        return new ProgramScope(SystemScope.SCOPE);
    }


    async parse(slastDocument: ISLASTDocument): Promise<ISLDocument> {
        const uri = slastDocument.uri;
        console.time(`analyze(${uri})`);

        const program = this.createProgram();
        const context = this.createContext(uri);

        let instructions: IInstruction[] = null;
        try {
            instructions = this.analyzeGlobals(context, program, slastDocument);
            checkFunctionsForRecursion(context, program);
            program.validate();
        } catch (e) {
            // critical errors were occured
            // throw e;
            console.error(e);
        }

        console.timeEnd(`analyze(${uri})`);

        assert(program.currentScope == program.globalScope);

        const scope = program.globalScope;
        const root = new InstructionCollector({ scope, instructions });
        const diagnosticReport = Diagnostics.mergeReports([slastDocument.diagnosticReport, context.diagnostics.resolve()]);

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
     * @leftType {IVariableTypeInstruction} Type of the left side of the expression.
     * @rightType {IVariableTypeInstruction} Type of the right side of the expression.
     */
    protected static checkTwoOperandExprTypes(
        context: Context,
        operator: string,
        leftType: IVariableTypeInstruction,
        rightType: IVariableTypeInstruction,
        leftSourceNode: IParseNode = leftType.sourceNode,
        rightSourceNode: IParseNode = rightType.sourceNode): IVariableTypeInstruction {

        if (!leftType || !rightType) {
            return null;
        }

        const isComplex = leftType.isComplex() || rightType.isComplex();
        const isArray = leftType.isNotBaseArray() || rightType.isNotBaseArray();
        const isSampler = SystemScope.isSamplerType(leftType) || SystemScope.isSamplerType(rightType);

        const boolType = <IVariableTypeInstruction>T_BOOL;
        // const constBoolType = VariableTypeInstruction.wrapAsConst(T_BOOL, SystemScope.SCOPE);

        if (isArray || isSampler) {
            return null;
        }

        if (operator === '%' || operator === '%=') {
            return null;
        }

        if (Analyzer.isAssignmentOperator(operator)) {
            if (!leftType.writable) {
                context.error(leftSourceNode, EErrors.InvalidTypeForWriting);
                return null;
            }

            if (!rightType.readable) {
                context.error(rightSourceNode, EErrors.InvalidTypeForReading);
                return null;
            }

            if (operator !== '=' && !leftType.readable) {
                context.error(leftSourceNode, EErrors.InvalidTypeForReading);
            }
        }
        else {
            if (!leftType.readable) {
                context.error(leftSourceNode, EErrors.InvalidTypeForReading);
                return null;
            }

            if (!rightType.readable) {
                context.error(rightSourceNode, EErrors.InvalidTypeForReading);
                return null;
            }
        }

        if (isComplex) {
            if (operator === '=' && leftType.isEqual(rightType)) {
                return <IVariableTypeInstruction>leftType;
            }
            // samplers and arrays can't be compared directly
            else if (Analyzer.isEqualOperator(operator) && !leftType.isContainArray() && !leftType.isContainSampler()) {
                return boolType;
            }
            else {
                return null;
            }
        }

        // FIXME: use operands' scope instead of system scope?
        const leftBaseType = VariableTypeInstruction.wrap(<SystemTypeInstruction>leftType.baseType, SystemScope.SCOPE);
        const rightBaseType = VariableTypeInstruction.wrap(<SystemTypeInstruction>rightType.baseType, SystemScope.SCOPE);


        if (leftType.isConst() && Analyzer.isAssignmentOperator(operator)) {
            // TODO: emit proper error
            return null;
        }

        if (leftType.isEqual(rightType)) {
            if (Analyzer.isArithmeticalOperator(operator)) {
                if (!SystemScope.isMatrixType(leftType) || (operator !== '/' && operator !== '/=')) {
                    return leftBaseType;
                }
                else {
                    return null;
                }
            }
            else if (Analyzer.isRelationalOperator(operator)) {
                if (SystemScope.isScalarType(leftType)) {
                    return boolType;
                }
                else {
                    return null;
                }
            }
            else if (Analyzer.isEqualOperator(operator)) {
                return boolType;
            }
            else if (operator === '=') {
                return leftBaseType;
            }
            else {
                return null;
            }

        }

        if (Analyzer.isArithmeticalOperator(operator)) {
            if (SystemScope.isBoolBasedType(leftType) || SystemScope.isBoolBasedType(rightType) ||
                SystemScope.isFloatBasedType(leftType) !== SystemScope.isFloatBasedType(rightType) ||
                SystemScope.isIntBasedType(leftType) !== SystemScope.isIntBasedType(rightType)) {
                return null;
            }

            if (SystemScope.isScalarType(leftType)) {
                return rightBaseType;
            }

            if (SystemScope.isScalarType(rightType)) {
                return leftBaseType;
            }

            if (operator === '*' || operator === '*=') {
                if (SystemScope.isMatrixType(leftType) && SystemScope.isVectorType(rightType) &&
                    leftType.length === rightType.length) {
                    return rightBaseType;
                }
                else if (SystemScope.isMatrixType(rightType) && SystemScope.isVectorType(leftType) &&
                    leftType.length === rightType.length) {
                    return leftBaseType;
                }
                else {
                    return null;
                }
            }
        }

        if (operator === '=') {
            // TODO: move conversion logic inside TypeInstruction.
            if ((leftType.isEqual(T_INT) && rightType.isEqual(T_UINT)) || 
                (leftType.isEqual(T_UINT) && rightType.isEqual(T_INT))) {
                    return leftType;
                }
        }

        return null;
    }


    /**
     * Проверят возможность использования оператора к типу данных.
     * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
     *
     * @operator {string} Один из операторов: + - ! ++ --
     * @leftType {IVariableTypeInstruction} Тип операнда
     */
    protected static checkOneOperandExprType(context: Context, sourceNode: IParseNode, operator: string,
        type: IVariableTypeInstruction): IVariableTypeInstruction {

        const isComplex = type.isComplex();
        const isArray = type.isNotBaseArray();
        const isSampler = SystemScope.isSamplerType(type);

        if (isComplex || isArray || isSampler) {
            return null;
        }

        if (!type.readable) {
            context.error(sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }


        if (operator === '++' || operator === '--') {
            if (!type.writable) {
                context.error(sourceNode, EErrors.InvalidTypeForWriting);
                return null;
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
            if (SystemScope.isBoolBasedType(type)) {
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
            operator === '%=' || operator === '=';
    }


    protected static isArithmeticalOperator(operator: string): boolean {
        return operator === '+' || operator === '+=' ||
            operator === '-' || operator === '-=' ||
            operator === '*' || operator === '*=' ||
            operator === '/' || operator === '/=';
    }


    protected static isRelationalOperator(operator: string): boolean {
        return operator === '>' || operator === '>=' ||
            operator === '<' || operator === '<=';
    }


    protected static isEqualOperator(operator: string): boolean {
        return operator === '==' || operator === '!=';
    }
}


