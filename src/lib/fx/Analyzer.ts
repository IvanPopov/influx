import { IPosition, IRange } from "../idl/parser/IParser";
import { IDiagnosticReport } from "../util/Diagnostics";
import { AssigmentOperator } from "./instructions/AssignmentExprInstruction";
import { IProvideInstructionSettings, ProvideInstruction } from "./instructions/ProvideInstruction";
import { ISamplerStateInstructionSettings, SamplerStateInstruction } from "./instructions/SamplerStateInstruction";
import { IParseNode, IParseTree } from '../idl/parser/IParser';
import {
    IInstruction, IFunctionDeclInstruction, IPassInstruction, ISimpleInstruction,
    IVariableDeclInstruction, ITechniqueInstruction, ITypedInstruction,
    IVariableTypeInstruction, IIdInstruction, ITypeInstruction, ITypeDeclInstruction,
    IInstructionError, IExprInstruction, EFunctionType, EInstructionTypes, ECheckStage,
    IAnnotationInstruction, IInitExprInstruction, IIdExprInstruction, IStmtInstruction,
    IDeclInstruction, ILiteralInstruction, ISamplerStateInstruction, IInstructionCollector, IProvideInstruction, EScopeType, IFunctionCallInstruction, IConstructorCallInstruction, IScope, IStmtBlockInstruction, IFunctionDefInstruction
} from '../idl/IInstruction';
import { IMap } from '../idl/IMap';
import { time } from '../time';
import { isDef, isDefAndNotNull, assert } from '../common';
import { isNull } from 'util';
import { SystemTypeInstruction } from './instructions/SystemTypeInstruction';
import { ComplexTypeInstruction } from './instructions/ComplexTypeInstruction';
import { SystemFunctionInstruction } from './instructions/SystemFunctionInstruction';
import { VariableDeclInstruction } from './instructions/VariableDeclInstruction';
import { IdInstruction } from './instructions/IdInstruction';
import { VariableTypeInstruction } from './instructions/VariableTypeInstruction';
import { InstructionCollector } from './instructions/InstructionCollector';
import { FunctionDefInstruction } from './instructions/FunctionDefInstruction';
import { InitExprInstruction } from './instructions/InitExprInstruction';
import { CompileExprInstruction } from './instructions/CompileExprInstruction';
import { SamplerStateBlockInstruction, SamplerOperator } from './instructions/SamplerStateBlockInstruction';
import { FunctionCallInstruction } from './instructions/FunctionCallInstruction';
import { IdExprInstruction } from './instructions/IdExprInstruction';
import { FunctionDeclInstruction } from './instructions/FunctionDeclInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { PostfixIndexInstruction } from './instructions/PostfixIndexInstruction';
import { PostfixArithmeticInstruction, PostfixOperator } from './instructions/PostfixArithmeticInstruction';
import { UnaryExprInstruction, UnaryOperator } from './instructions/UnaryExprInstruction';
import { ConditionalExprInstruction } from './instructions/ConditionalExprInstruction';
import { ArithmeticExprInstruction, ArithmeticOperator } from './instructions/ArithmeticExprInstruction';
import { CastExprInstruction } from './instructions/CastExprInstruction'
import { LogicalExprInstruction, LogicalOperator } from './instructions/LogicalExprInstruction'
import { StmtBlockInstruction } from './instructions/StmtBlockInstruction';
import { ReturnStmtInstruction } from './instructions/ReturnStmtInstruction';
import { SemicolonStmtInstruction } from './instructions/SemicolonStmtInstruction';
import { ExprStmtInstruction } from './instructions/ExprStmtInstruction';
import { ForStmtInstruction } from './instructions/ForStmtInstruction';
import { PassInstruction } from './instructions/PassInstruction';
import { ERenderStates } from '../idl/ERenderStates';
import { ERenderStateValues } from '../idl/ERenderStateValues';
import { TechniqueInstruction } from './instructions/TechniqueInstruction';
import { IfStmtInstruction } from './instructions/IfStmtInstruction';
import { AssignmentExprInstruction } from './instructions/AssignmentExprInstruction';
import { SimpleInstruction } from './instructions/SimpleInstruction';
import { TypeDeclInstruction } from './instructions/TypeDeclInstruction'
import { RelationalExprInstruction, RelationOperator } from './instructions/RelationalExprInstruction';
import { BoolInstruction } from './instructions/BoolInstruction';
import { StringInstruction } from './instructions/StringInstruction';
import { FloatInstruction } from './instructions/FloatInstruction';
import { IntInstruction } from './instructions/IntInstruction';
import { DeclStmtInstruction } from './instructions/DeclStmtInstruction';
import { BreakStmtInstruction, BreakOperator } from './instructions/BreakStmtInstruction';
import { WhileStmtInstruction, DoWhileOperator } from './instructions/WhileStmtInstruction';
import { ProgramScope, Scope } from './ProgramScope';
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';
import { EAnalyzerErrors as EErrors, EAnalyzerWarnings as EWarnings } from '../idl/EAnalyzerErrors';

import * as SystemScope from './SystemScope';
import { Diagnostics } from "../util/Diagnostics";


function validate(instr: IInstruction, expectedType: EInstructionTypes) {
    assert(instr.instructionType === expectedType);
}

function resolveNodeSourceLocation(sourceNode: IParseNode): IRange {
    if (!isDefAndNotNull(sourceNode)) {
        return null;
    }

    if (isDef(sourceNode.loc)) {
        return sourceNode.loc;
    }

    return resolveNodeSourceLocation(sourceNode.children[sourceNode.children.length - 1]);
}


function findConstructor(type: ITypeInstruction, args: IExprInstruction[]): IVariableTypeInstruction {
    return new VariableTypeInstruction({ type, scope: null });
}

interface IAnalyzerDiagDesc {
    file: string;
    loc: IRange;
    info: any; // todo: fixme
}

type IErrorInfo = IMap<any>; 
type IWarningInfo = IMap<any>;




export class AnalyzerDiagnostics extends Diagnostics<IAnalyzerDiagDesc> {
    constructor() {
        super("Analyzer Diagnostics", 'A');
    }

    protected resolveFilename(code: number, desc: IAnalyzerDiagDesc): string {
        return desc.file;
    }

    protected resolveRange(code: number, desc: IAnalyzerDiagDesc): IRange {
        return desc.loc;
    }

    protected diagnosticMessages() {
        // todo: fill all errors.
        return {
            [EErrors.InvalidReturnStmtEmpty]: 'Invalid return statement. Expression with \'*type*\' type expected.', // todo: specify type
            [EErrors.InvalidReturnStmtVoid]: 'Invalid return statement. Expression with \'void\' type expected.',
            [EErrors.FunctionRedefinition]: 'Function redefinition. Function with name \'{info.funcName}\' already declared.', // todo: add location where function declared before
            [EErrors.InvalidFuncDefenitionReturnType]: 'Invalid function defenition return type. Function with the same name \'{info.funcName}\' but another type already declared.', // todo: specify prev type and location
            [EErrors.InvalidFunctionReturnStmtNotFound]: 'Return statement expected.' // todo: specify func name and return type details.
        };
    }

    protected resolveDescription(code: number, desc: IAnalyzerDiagDesc): string {
        let descList = this.diagnosticMessages();
        if (isDefAndNotNull(descList[code])) {
            return super.resolveDescription(code, desc);
        }
        return `error: ${EErrors[code]} (${JSON.stringify(desc)})`;
    }
}


const diag = new AnalyzerDiagnostics;


function _error(context: Context, sourceNode: IParseNode, code: number, info: IErrorInfo = {}): void {
    let file = context ? context.filename : null;
    let loc = resolveNodeSourceLocation(sourceNode);

    diag.error(code, { file, loc, info });
}

function _warning(context: Context, sourceNode: IParseNode, code: number, info: IErrorInfo = {}): void {
    let file = context ? context.filename : null;
    let loc = resolveNodeSourceLocation(sourceNode);

    diag.error(code, { file, loc, info });
}

function analyzeUseDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): void {
    program.currentScope.strictMode = true;
}


function analyzeComplexName(sourceNode: IParseNode): string {
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
function analyzeProvideDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IProvideInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    if (children.length === 3) {
        let moduleName = analyzeComplexName(children[1]);;
        if (!isNull(context.moduleName)) {
            console.warn(`Context module overriding detected '${context.moduleName}' => '${module}'`);
        }
        context.moduleName = moduleName;
        assert(children[2].name === 'T_KW_PROVIDE');
        return new ProvideInstruction({ sourceNode, moduleName, scope });
    }

    _error(context, sourceNode, EErrors.UnsupportedProvideAs);
    return null;
}


/**
 * AST example:
 *    InitExpr
 *         T_UINT = '0'
 */
function analyzeInitExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IInitExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let args: IExprInstruction[] = [];

    if (children.length === 1) {
        args.push(analyzeExpr(context, program, children[0]));
    }
    else {
        for (let i = 0; i < children.length; i++) {
            if (children[i].name === 'InitExpr') {
                args.push(analyzeInitExpr(context, program, children[i]));
            }
        }
    }

    // todo: determ type!!
    const initExpr: IInitExprInstruction = new InitExprInstruction({ scope, sourceNode, args, type: null });
    return initExpr;
}



function _errorFromInstruction(context: Context, sourceNode: IParseNode, pError: IInstructionError): void {
    _error(context, sourceNode, pError.code, isNull(pError.info) ? {} : pError.info);
}


function checkInstruction<INSTR_T extends IInstruction>(context: Context, inst: INSTR_T, stage: ECheckStage): INSTR_T {
    if (!inst._check(stage)) {
        _errorFromInstruction(context, inst.sourceNode, inst._getLastError());
        return null;
    }
    return inst;
}



function addTypeDecl(context: Context, scope: IScope, typeDecl: ITypeDeclInstruction): void {
    if (SystemScope.findType(typeDecl.name)) {
        _error(context, typeDecl.sourceNode, EErrors.SystemTypeRedefinition, { typeName: typeDecl.name });
    }

    let isAdded = scope.addType(typeDecl.type);
    if (!isAdded) {
        _error(context, typeDecl.sourceNode, EErrors.TypeRedefinition, { typeName: typeDecl.name });
    }
}


// function addFunctionDecl(context: Context, program: ProgramScope, sourceNode: IParseNode, func: IFunctionDeclInstruction): void {
//     if (isSystemFunction(func)) {
//         _error(context, sourceNode, EErrors.SystemFunctionRedefinition, { funcName: func.name });
//     }

//     let isFunctionAdded: boolean = program.addFunction(func);

//     if (!isFunctionAdded) {
//         _error(context, sourceNode, EErrors.FunctionRedifinition, { funcName: func.name });
//     }
// }


function addTechnique(context: Context, program: ProgramScope, technique: ITechniqueInstruction): void {
    let name: string = technique.name;

    if (program.globalScope.hasTechnique(name)) {
        _error(context, technique.sourceNode, EErrors.TechniqueNameRedefinition, { techName: name });
        return;
    }

    program.globalScope.addTechnique(technique);
}


// function checkFunctionsForRecursion(context: Context): void {
//     let funcList: IFunctionDeclInstruction[] = context.functionWithImplementationList;
//     let isNewAdd: boolean = true;
//     let isNewDelete: boolean = true;

//     while (isNewAdd || isNewDelete) {
//         isNewAdd = false;
//         isNewDelete = false;

//         mainFor:
//         for (let i = 0; i < funcList.length; i++) {
//             let testedFunction: IFunctionDeclInstruction = funcList[i];
//             let usedFunctionList: IFunctionDeclInstruction[] = testedFunction.usedFunctionList;

//             if (!testedFunction.isUsed()) {
//                 //logger.warn("Unused function '" + testedFunction.stringDef + "'.");
//                 continue mainFor;
//             }
//             if (testedFunction.isBlackListFunction()) {
//                 continue mainFor;
//             }

//             if (isNull(usedFunctionList)) {
//                 continue mainFor;
//             }

//             for (let j: number = 0; j < usedFunctionList.length; j++) {
//                 let addedUsedFunctionList: IFunctionDeclInstruction[] = usedFunctionList[j].usedFunctionList;

//                 if (isNull(addedUsedFunctionList)) {
//                     continue;
//                 }

//                 for (let k: number = 0; k < addedUsedFunctionList.length; k++) {
//                     let addedFunction: IFunctionDeclInstruction = addedUsedFunctionList[k];
//                     let sourceNode = addedFunction.sourceNode;

//                     if (testedFunction === addedFunction) {
//                         testedFunction.addToBlackList();
//                         isNewDelete = true;
//                         _error(context, sourceNode, EErrors.InvalidFunctionUsageRecursion, { funcDef: testedFunction.stringDef });
//                         continue mainFor;
//                     }

//                     if (addedFunction.isBlackListFunction() ||
//                         !addedFunction.canUsedAsFunction()) {
//                         testedFunction.addToBlackList();
//                         _error(context, sourceNode, EErrors.InvalidFunctionUsageBlackList, { funcDef: testedFunction.stringDef });
//                         isNewDelete = true;
//                         continue mainFor;
//                     }

//                     if (testedFunction.addUsedFunction(addedFunction)) {
//                         isNewAdd = true;
//                     }
//                 }
//             }
//         }
//     }
// }


// function checkFunctionForCorrectUsage(context: Context): void {
//     let funcList: IFunctionDeclInstruction[] = context.functionWithImplementationList;
//     let isNewUsageSet: boolean = true;
//     let isNewDelete: boolean = true;

//     while (isNewUsageSet || isNewDelete) {
//         isNewUsageSet = false;
//         isNewDelete = false;

//         mainFor:
//         for (let i = 0; i < funcList.length; i++) {
//             let testedFunction: IFunctionDeclInstruction = funcList[i];
//             let usedFunctionList: IFunctionDeclInstruction[] = testedFunction.usedFunctionList;

//             if (!testedFunction.isUsed()) {
//                 //logger.warn("Unused function '" + testedFunction.stringDef + "'.");
//                 continue mainFor;
//             }
//             if (testedFunction.isBlackListFunction()) {
//                 continue mainFor;
//             }

//             if (!testedFunction.checkVertexUsage()) {
//                 _error(context, testedFunction.sourceNode, EErrors.InvalidFunctionUsageVertex, { funcDef: testedFunction.stringDef });
//                 testedFunction.addToBlackList();
//                 isNewDelete = true;
//                 continue mainFor;
//             }

//             if (!testedFunction.checkPixelUsage()) {
//                 _error(context, testedFunction.sourceNode, EErrors.InvalidFunctionUsagePixel, { funcDef: testedFunction.stringDef });
//                 testedFunction.addToBlackList();
//                 isNewDelete = true;
//                 continue mainFor;
//             }

//             if (isNull(usedFunctionList)) {
//                 continue mainFor;
//             }

//             for (let j: number = 0; j < usedFunctionList.length; j++) {
//                 let usedFunction: IFunctionDeclInstruction = usedFunctionList[j];

//                 if (testedFunction.isUsedInVertex()) {
//                     if (!usedFunction.vertex) {
//                         _error(context, usedFunction.sourceNode, EErrors.InvalidFunctionUsageVertex, { funcDef: testedFunction.stringDef });
//                         testedFunction.addToBlackList();
//                         isNewDelete = true;
//                         continue mainFor;
//                     }

//                     if (!usedFunction.isUsedInVertex()) {
//                         usedFunction.markUsedInVertex();
//                         isNewUsageSet = true;
//                     }

//                 }

//                 if (testedFunction.isUsedInPixel()) {
//                     if (!usedFunction.pixel) {
//                         _error(context, usedFunction.sourceNode, EErrors.InvalidFunctionUsagePixel, { funcDef: testedFunction.stringDef });
//                         testedFunction.addToBlackList();
//                         isNewDelete = true;
//                         continue mainFor;
//                     }

//                     if (!usedFunction.isUsedInPixel()) {
//                         usedFunction.markUsedInPixel();
//                         isNewUsageSet = true;
//                     }
//                 }
//             }
//         }
//     }
// }


// function generateInfoAboutUsedData(context: Context): void {
//     let funcList: IFunctionDeclInstruction[] = context.functionWithImplementationList;

//     for (let i = 0; i < funcList.length; i++) {
//         funcList[i].generateInfoAboutUsedData();
//     }
// }


// function generateShadersFromFunctions(context: Context): void {
//     let funcList: IFunctionDeclInstruction[] = context.functionWithImplementationList;

//     for (let i = 0; i < funcList.length; i++) {

//         if (funcList[i].isUsedAsVertex()) {
//             funcList[i].convertToVertexShader();
//         }
//         if (funcList[i].isUsedAsPixel()) {
//             funcList[i].convertToPixelShader();
//         }

//         if (funcList[i]._isErrorOccured()) {
//             _errorFromInstruction(context, funcList[i].sourceNode, funcList[i]._getLastError());
//             funcList[i]._clearError();
//         }
//     }
// }





function getRenderState(state: string): ERenderStates {
    let type: ERenderStates = null;

    switch (state) {
        case 'BLENDENABLE':
            type = ERenderStates.BLENDENABLE;
            break;
        case 'CULLFACEENABLE':
            type = ERenderStates.CULLFACEENABLE;
            break;
        case 'ZENABLE':
            type = ERenderStates.ZENABLE;
            break;
        case 'ZWRITEENABLE':
            type = ERenderStates.ZWRITEENABLE;
            break;
        case 'DITHERENABLE':
            type = ERenderStates.DITHERENABLE;
            break;
        case 'SCISSORTESTENABLE':
            type = ERenderStates.SCISSORTESTENABLE;
            break;
        case 'STENCILTESTENABLE':
            type = ERenderStates.STENCILTESTENABLE;
            break;
        case 'POLYGONOFFSETFILLENABLE':
            type = ERenderStates.POLYGONOFFSETFILLENABLE;
            break;
        case 'CULLFACE':
            type = ERenderStates.CULLFACE;
            break;
        case 'FRONTFACE':
            type = ERenderStates.FRONTFACE;
            break;

        case 'SRCBLENDCOLOR':
            type = ERenderStates.SRCBLENDCOLOR;
            break;
        case 'DESTBLENDCOLOR':
            type = ERenderStates.DESTBLENDCOLOR;
            break;
        case 'SRCBLENDALPHA':
            type = ERenderStates.SRCBLENDALPHA;
            break;
        case 'DESTBLENDALPHA':
            type = ERenderStates.DESTBLENDALPHA;
            break;

        case 'BLENDEQUATIONCOLOR':
            type = ERenderStates.BLENDEQUATIONCOLOR;
            break;
        case 'BLENDEQUATIONALPHA':
            type = ERenderStates.BLENDEQUATIONALPHA;
            break;

        case 'SRCBLEND':
            type = ERenderStates.SRCBLEND;
            break;
        case 'DESTBLEND':
            type = ERenderStates.DESTBLEND;
            break;
        case 'BLENDFUNC':
            type = ERenderStates.BLENDFUNC;
            break;
        case 'BLENDFUNCSEPARATE':
            type = ERenderStates.BLENDFUNCSEPARATE;
            break;

        case 'BLENDEQUATION':
            type = ERenderStates.BLENDEQUATION;
            break;
        case 'BLENDEQUATIONSEPARATE':
            type = ERenderStates.BLENDEQUATIONSEPARATE;
            break;

        case 'ZFUNC':
            type = ERenderStates.ZFUNC;
            break;
        case 'ALPHABLENDENABLE':
            type = ERenderStates.ALPHABLENDENABLE;
            break;
        case 'ALPHATESTENABLE':
            type = ERenderStates.ALPHATESTENABLE;
            break;

        default:
            _warning(null, null, EWarnings.UnsupportedRenderStateTypeUsed, { state });
            break;
    }

    return type;
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
    }

    return eValue;
}






/**
 * Проверят возможность использования оператора между двумя типами.
 * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
 *
 * @operator {string} Один из операторов: + - * / % += -= *= /= %= = < > <= >= == != =
 * @leftType {IVariableTypeInstruction} Тип левой части выражения
 * @rightType {IVariableTypeInstruction} Тип правой части выражения
 */
function checkTwoOperandExprTypes(
    context: Context,
    operator: string,
    leftType: IVariableTypeInstruction,
    rightType: IVariableTypeInstruction): IVariableTypeInstruction {

    const isComplex = leftType.isComplex() || rightType.isComplex();
    const isArray = leftType.isNotBaseArray() || rightType.isNotBaseArray();
    const isSampler = SystemScope.isSamplerType(leftType) || SystemScope.isSamplerType(rightType);
    const boolType = <IVariableTypeInstruction>SystemScope.T_BOOL;

    if (isArray || isSampler) {
        return null;
    }

    if (operator === '%' || operator === '%=') {
        return null;
    }

    if (isAssignmentOperator(operator)) {
        if (!leftType.writable) {
            _error(context, leftType.sourceNode, EErrors.InvalidTypeForWriting);
            return null;
        }

        if (!rightType.readable) {
            _error(context, rightType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        if (operator !== '=' && !leftType.readable) {
            _error(context, leftType.sourceNode, EErrors.InvalidTypeForReading);
        }
    }
    else {
        if (!leftType.readable) {
            _error(context, leftType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        if (!rightType.readable) {
            _error(context, rightType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }
    }

    if (isComplex) {
        if (operator === '=' && leftType.isEqual(rightType)) {
            return <IVariableTypeInstruction>leftType;
        }
        else if (isEqualOperator(operator) && !leftType.isContainArray() && !leftType.isContainSampler()) {
            return boolType;
        }
        else {
            return null;
        }
    }

    const leftBaseType = VariableTypeInstruction.wrap(<SystemTypeInstruction>leftType.baseType, SystemScope.SCOPE);
    const rightBaseType = VariableTypeInstruction.wrap(<SystemTypeInstruction>rightType.baseType, SystemScope.SCOPE);


    if (leftType.isConst() && isAssignmentOperator(operator)) {
        return null;
    }

    if (leftType.isEqual(rightType)) {
        if (isArithmeticalOperator(operator)) {
            if (!SystemScope.isMatrixType(leftType) || (operator !== '/' && operator !== '/=')) {
                return leftBaseType;
            }
            else {
                return null;
            }
        }
        else if (isRelationalOperator(operator)) {
            if (SystemScope.isScalarType(leftType)) {
                return boolType;
            }
            else {
                return null;
            }
        }
        else if (isEqualOperator(operator)) {
            return boolType;
        }
        else if (operator === '=') {
            return leftBaseType;
        }
        else {
            return null;
        }

    }

    if (isArithmeticalOperator(operator)) {
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

    return null;
}


/**
 * Проверят возможность использования оператора к типу данных.
 * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
 *
 * @operator {string} Один из операторов: + - ! ++ --
 * @leftType {IVariableTypeInstruction} Тип операнда
 */
function checkOneOperandExprType(context: Context, sourceNode: IParseNode, operator: string,
    type: IVariableTypeInstruction): IVariableTypeInstruction {

    const isComplex = type.isComplex();
    const isArray = type.isNotBaseArray();
    const isSampler = SystemScope.isSamplerType(type);

    if (isComplex || isArray || isSampler) {
        return null;
    }

    if (!type.readable) {
        _error(context, sourceNode, EErrors.InvalidTypeForReading);
        return null;
    }


    if (operator === '++' || operator === '--') {
        if (!type.writable) {
            _error(context, sourceNode, EErrors.InvalidTypeForWriting);
            return null;
        }

        return type;
    }

    if (operator === '!') {
        const boolType = <IVariableTypeInstruction>SystemScope.T_BOOL;
        validate(boolType, EInstructionTypes.k_VariableDeclInstruction);

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
            return (<SystemTypeInstruction>type.baseType) as any; // << todo: fixme!!!! remove "any"!
        }
    }

    return null;
}


function isAssignmentOperator(operator: string): boolean {
    return operator === '+=' || operator === '-=' ||
        operator === '*=' || operator === '/=' ||
        operator === '%=' || operator === '=';
}


function isArithmeticalOperator(operator: string): boolean {
    return operator === '+' || operator === '+=' ||
        operator === '-' || operator === '-=' ||
        operator === '*' || operator === '*=' ||
        operator === '/' || operator === '/=';
}


function isRelationalOperator(operator: string): boolean {
    return operator === '>' || operator === '>=' ||
        operator === '<' || operator === '<=';
}


function isEqualOperator(operator: string): boolean {
    return operator === '==' || operator === '!=';
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
function analyzeVariableDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let generalType = analyzeUsageType(context, program, children[children.length - 1]);
    let vars: IVariableDeclInstruction[] = [];

    for (let i = children.length - 2; i >= 1; i--) {
        if (children[i].name === 'Variable') {
            vars.push(analyzeVariable(context, program, children[i], generalType));
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
function analyzeUsageType(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let type: ITypeInstruction = null;
    let usages: string[] = [];

    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'Type') {
            type = analyzeType(context, program, children[i]);
        }
        else if (children[i].name === 'Usage') {
            usages.push(analyzeUsage(children[i]));
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
function analyzeType(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let type: ITypeInstruction = null;

    switch (sourceNode.name) {
        case 'T_TYPE_ID':
            type = scope.findType(sourceNode.value);

            if (isNull(type)) {
                _error(context, sourceNode, EErrors.InvalidTypeNameNotType, { typeName: sourceNode.value });
            }
            break;
        case 'Struct':
            type = analyzeStruct(context, program, sourceNode);
            break;

        case 'T_KW_VOID':
            type = SystemScope.T_VOID;
            break;

        case 'ScalarType':
        case 'ObjectType':
            type = scope.findType(children[children.length - 1].value);

            if (isNull(type)) {
                _error(context, sourceNode, EErrors.InvalidTypeNameNotType, { typeName: children[children.length - 1].value });
            }

            break;

        case 'VectorType':
        case 'MatrixType':
            _error(context, sourceNode, EErrors.InvalidTypeVectorMatrix);
            break;

        case 'BaseType':
        case 'Type':
            return analyzeType(context, program, children[0]);
    }

    return type;
}


function analyzeUsage(sourceNode: IParseNode): string {
    sourceNode = sourceNode.children[0];
    return sourceNode.value;
}


function analyzeVariable(context: Context, program: ProgramScope, sourceNode: IParseNode, generalType: IVariableTypeInstruction): IVariableDeclInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let annotation: IAnnotationInstruction = null;
    let semantics: string = '';
    let init: IInitExprInstruction = null;

    let id = analyzeVariableId(context, program, children[children.length - 1]);
    let arrayIndex = analyzeVariableIndex(context, program, children[children.length - 1]);
    let type = new VariableTypeInstruction({ scope, sourceNode, type: generalType, arrayIndex });

    for (let i = children.length - 2; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else if (children[i].name === 'Initializer') {
            init = analyzeInitializer(context, program, children[i]);
            if (!init.optimizeForVariableType(type)) {
                _error(context, sourceNode, EErrors.InvalidVariableInitializing, { varName: id.name });
                return null;
            }
        }
    }

    const varDecl = new VariableDeclInstruction({ sourceNode, scope, type, init, id, semantics, annotation });
    assert(scope.type != EScopeType.k_System);

    if (SystemScope.hasVariable(varDecl.name)) {
        _error(context, sourceNode, EErrors.SystemVariableRedefinition, { varName: varDecl.name });
    }

    const isAdded = scope.addVariable(varDecl);
    if (!isAdded) {
        switch (scope.type) {
            case EScopeType.k_Default:
                _error(context, sourceNode, EErrors.VariableRedefinition, { varName: varDecl.name });
                break;
            case EScopeType.k_Struct:
                _error(context, sourceNode, EErrors.InvalidNewFieldForStructName, { fieldName: varDecl.name });
                break;
            case EScopeType.k_Annotation:
                _error(context, sourceNode, EErrors.InvalidNewAnnotationVar, { varName: varDecl.name });
                break;
        }
    }

    return checkInstruction(context, varDecl, ECheckStage.CODE_TARGET_SUPPORT);
}


/**
 * AST example:
 *    VariableDim
 *         T_PUNCTUATOR_93 = ']'
 *         T_NON_TYPE_ID = 'N'
 *         T_PUNCTUATOR_91 = '['
 *       + VariableDim 
 *    VariableDim
 *         T_NON_TYPE_ID = 'x'
 *         ^^^^^^^^^^^^^^^^^^
 */
function analyzeVariableId(context: Context, program: ProgramScope, sourceNode: IParseNode): IIdInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    if (children.length === 1) {
        const name = children[0].value;
        return new IdInstruction({ scope, sourceNode, name });
    }

    return null;
}


/**
 * AST example:
 *    VariableDim
 *         T_PUNCTUATOR_93 = ']'
 *         T_NON_TYPE_ID = 'N'
 *         T_PUNCTUATOR_91 = '['
 *       + VariableDim 
 */
function analyzeVariableIndex(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    if (children.length === 1) {
        return null;
    }

    return analyzeExpr(context, program, children[children.length - 3]);
}


/**
 * AST example:
 *    Annotation
 *         T_PUNCTUATOR_62 = '>'
 *         T_PUNCTUATOR_60 = '<'
 */
function analyzeAnnotation(sourceNode: IParseNode): IAnnotationInstruction {
    // todo
    return null;
}


/**
 * AST example:
 *    Semantic
 *         T_NON_TYPE_ID = 'SEMANTICS'
 *         T_PUNCTUATOR_58 = ':'
 */
function analyzeSemantic(sourceNode: IParseNode): string {
    let semantics: string = sourceNode.children[0].value;
    return semantics;
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
function analyzeInitializer(context: Context, program: ProgramScope, sourceNode: IParseNode): IInitExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let args: IExprInstruction[] = [];

    if (children.length === 2) {
        args.push(analyzeExpr(context, program, children[0]));
    }
    else {
        for (let i = children.length - 3; i >= 1; i--) {
            if (children[i].name === 'InitExpr') {
                args.push(analyzeInitExpr(context, program, children[i]));
            }
        }
    }

    // todo: determ type!
    let initExpr = new InitExprInstruction({ scope, sourceNode, args, type: null });
    return initExpr;
}



function analyzeExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const name = sourceNode.name;

    switch (name) {
        case 'ObjectExpr':
            return analyzeObjectExpr(context, program, sourceNode);
        case 'ComplexExpr':
            return analyzeComplexExpr(context, program, sourceNode);
        case 'PostfixExpr':
            return analyzePostfixExpr(context, program, sourceNode);
        case 'UnaryExpr':
            return analyzeUnaryExpr(context, program, sourceNode);
        case 'CastExpr':
            return analyzeCastExpr(context, program, sourceNode);
        case 'ConditionalExpr':
            return analyzeConditionalExpr(context, program, sourceNode);
        case 'MulExpr':
        case 'AddExpr':
            return analyzeArithmeticExpr(context, program, sourceNode);
        case 'RelationalExpr':
        case 'EqualityExpr':
            return analyzeRelationExpr(context, program, sourceNode);
        case 'AndExpr':
        case 'OrExpr':
            return analyzeLogicalExpr(context, program, sourceNode);
        case 'AssignmentExpr':
            return analyzeAssignmentExpr(context, program, sourceNode);
        case 'T_NON_TYPE_ID':
            return analyzeIdExpr(context, program, sourceNode);
        case 'T_STRING':
        case 'T_UINT':
        case 'T_FLOAT':
        case 'T_KW_TRUE':
        case 'T_KW_FALSE':
            return analyzeSimpleExpr(context, program, sourceNode);
        default:
            _error(context, sourceNode, EErrors.UnsupportedExpr, { exprName: name });
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
function analyzeObjectExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    let name = sourceNode.children[sourceNode.children.length - 1].name;

    switch (name) {
        case 'T_KW_COMPILE':
            return analyzeCompileExpr(context, program, sourceNode);
        case 'T_KW_SAMPLER_STATE':
            return analyzeSamplerStateBlock(context, program, sourceNode);
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
function analyzeCompileExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): CompileExprInstruction {
    const children = sourceNode.children;
    const shaderFuncName = children[children.length - 2].value;
    const scope = program.currentScope;

    let args: IExprInstruction[] = null;

    if (children.length > 4) {
        args = [];
        for (let i = children.length - 3; i > 0; i--) {
            if (children[i].value !== ',') {
                let argumentExpr = analyzeExpr(context, program, children[i]);
                args.push(argumentExpr);
            }
        }
    }

    let shaderFunc = program.globalScope.findShaderFunction(shaderFuncName, args);

    if (isNull(shaderFunc)) {
        _error(context, sourceNode, EErrors.InvalidCompileNotFunction, { funcName: shaderFuncName });
        return null;
    }

    let type = VariableTypeInstruction.wrap(<IVariableTypeInstruction>shaderFunc.definition.returnType, scope);

    let expr = new CompileExprInstruction({ args, scope, type, operand: shaderFunc });
    return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
}


/**
 * AST example:
 *    ObjectExpr
 *       + StateBlock 
 *         T_KW_SAMPLER_STATE = 'sampler_state'
 */
function analyzeSamplerStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    sourceNode = sourceNode.children[0];

    let scope = program.currentScope;
    let children = sourceNode.children;
    let operator: SamplerOperator = "sampler_state";
    let texture = null;
    let params = <ISamplerStateInstruction[]>[];

    for (let i = children.length - 2; i >= 1; i--) {
        let param = analyzeSamplerState(context, program, children[i]);
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
function analyzeSamplerState(context: Context, program: ProgramScope, sourceNode: IParseNode): SamplerStateInstruction {

    let children = sourceNode.children;

    if (children[children.length - 2].name === 'StateIndex') {
        _error(context, sourceNode, EErrors.UnsupportedStateIndex);
        return null;
    }

    let stateExprNode = children[children.length - 3];
    let subStateExprNode = stateExprNode.children[stateExprNode.children.length - 1];
    let stateType = children[children.length - 1].value.toUpperCase();
    let stateValue = '';
    let scope = program.currentScope;

    if (isNull(subStateExprNode.value)) {
        _error(context, subStateExprNode, EErrors.InvalidSamplerTexture);
        return null;
    }

    switch (stateType) {
        case 'TEXTURE':
            if (stateExprNode.children.length !== 3 || subStateExprNode.value === '{') {
                _error(context, subStateExprNode, EErrors.InvalidSamplerTexture);
                return null;
            }

            let texNameNode = stateExprNode.children[1];
            let texName = texNameNode.value;
            if (isNull(texName) || !program.findVariable(texName)) {
                _error(context, stateExprNode.children[1], EErrors.InvalidSamplerTexture);
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
                    // todo: move to errors
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
                    // todo: move to erros api
                    // console.warn('Webgl don`t support this texture filter: ' + stateValue);
                    return null;
            }
            break;

        default:
            // todo: move to erros api
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
function analyzeComplexExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const firstNodeName = children[children.length - 1].name;

    switch (firstNodeName) {
        case 'T_NON_TYPE_ID':
            return analyzeFunctionCallExpr(context, program, sourceNode);
        case 'BaseType':
        case 'T_TYPE_ID':
            return analyzeConstructorCallExpr(context, program, sourceNode);
        default:
            return analyzeSimpleComplexExpr(context, program, sourceNode);
    }
}


function analyzeFunctionCallExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IFunctionCallInstruction {
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
                argumentExpr = analyzeExpr(context, program, children[i]);
                args.push(argumentExpr);
            }
        }
    }

    let func = globalScope.findFunction(funcName, args);

    if (isNull(func)) {
        _error(context, sourceNode, EErrors.InvalidComplexNotFunction, { funcName: funcName });
        return null;
    }

    if (!isDef(func)) {
        _error(context, sourceNode, EErrors.CannotChooseFunction, { funcName: funcName });
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

    if (func.instructionType === EInstructionTypes.k_FunctionDeclInstruction || 
        func.instructionType === EInstructionTypes.k_SystemFunctionDeclInstruction) {
        if (!isNull(args)) {
            const funcArguments = func.definition.paramList;

            for (let i = 0; i < args.length; i++) {
                if (funcArguments[i].type.hasUsage('out')) {
                    if (!args[i].type.writable) {
                        _error(context, sourceNode, EErrors.InvalidTypeForWriting);
                        return null;
                    }
                } else if (funcArguments[i].type.hasUsage('inout')) {
                    if (!args[i].type.writable) {
                        _error(context, sourceNode, EErrors.InvalidTypeForWriting);
                        return null;
                    }

                    if (!args[i].type.readable) {
                        _error(context, sourceNode, EErrors.InvalidTypeForReading);
                        return null;
                    }
                } else {
                    if (!args[i].type.readable) {
                        _error(context, sourceNode, EErrors.InvalidTypeForReading);
                        return null;
                    }
                }
            }

            // for (let i = args.length; i < funcArguments.length; i++) {
            //     funcCallExpr.push(funcArguments[i].initializeExpr, false);
            // }

        }


        const type = VariableTypeInstruction.wrap(func.definition.returnType, scope);
        let funcCallExpr = new FunctionCallInstruction({ scope, type, decl: func, args });

        // if (!isNull(currentAnalyzedFunction)) {
        //     currentAnalyzedFunction.addUsedFunction(func);
        // }

        func.$overwriteType(EFunctionType.k_Function);
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
function analyzeConstructorCallExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IConstructorCallInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    const ctorType = analyzeType(context, program, children[children.length - 1]);

    if (isNull(ctorType)) {
        _error(context, sourceNode, EErrors.InvalidComplexNotType);
        return null;
    }

    let args: IExprInstruction[] = null;
    if (children.length > 3) {
        let argumentExpr: IExprInstruction = null;

        args = [];

        for (let i = children.length - 3; i > 0; i--) {
            if (children[i].value !== ',') {
                argumentExpr = analyzeExpr(context, program, children[i]);
                args.push(argumentExpr);
            }
        }
    }

    // todo: add correct implementation! 
    const exprType = findConstructor(ctorType, args);

    if (isNull(exprType)) {
        _error(context, sourceNode, EErrors.InvalidComplexNotConstructor, { typeName: ctorType.toString() });
        return null;
    }

    if (!isNull(args)) {
        for (let i = 0; i < args.length; i++) {
            if (!args[i].type.readable) {
                _error(context, sourceNode, EErrors.InvalidTypeForReading);
                return null;
            }
        }
    }

    const expr = new ConstructorCallInstruction({ scope, sourceNode, ctor: exprType, args });
    return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);;
}


// todo: add comment!
function analyzeSimpleComplexExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let expr = analyzeExpr(context, program, children[1]);
    let type = <IVariableTypeInstruction>expr.type;

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
function analyzePostfixExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const symbol = children[children.length - 2].value;

    switch (symbol) {
        case '[':
            return analyzePostfixIndex(context, program, sourceNode);
        case '.':
            return analyzePostfixPoint(context, program, sourceNode);
        case '++':
        case '--':
            return analyzePostfixArithmetic(context, program, sourceNode);
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
function analyzePostfixIndex(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;

    const postfixExpr = analyzeExpr(context, program, children[children.length - 1]);
    const postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

    if (!postfixExprType.isArray()) {
        _error(context, sourceNode, EErrors.InvalidPostfixNotArray, { typeName: postfixExprType.toString() });
        return null;
    }

    const indexExpr = analyzeExpr(context, program, children[children.length - 3]);
    const indexExprType = <IVariableTypeInstruction>indexExpr.type;

    if (!indexExprType.isEqual(SystemScope.T_INT)) {
        _error(context, sourceNode, EErrors.InvalidPostfixNotIntIndex, { typeName: indexExprType.toString() });
        return null;
    }

    const expr = new PostfixIndexInstruction({ scope, sourceNode, element: postfixExpr, index: indexExpr });
    return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
}


/**
 * AST example:
 *    PostfixExpr
 *         T_NON_TYPE_ID = 'val'
 *         T_PUNCTUATOR_46 = '.'
 *         T_NON_TYPE_ID = 'some'
 */
function analyzePostfixPoint(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    const postfixExpr = analyzeExpr(context, program, children[children.length - 1]);
    const postfixExprType = <IVariableTypeInstruction>postfixExpr.type;
    const fieldName = children[children.length - 3].value;
    const fieldNameExpr = VariableTypeInstruction.fieldToExpr(postfixExprType, fieldName);

    if (isNull(fieldNameExpr)) {
        _error(context, sourceNode, EErrors.InvalidPostfixNotField, {
            typeName: postfixExprType.toString(),
            fieldName
        });
        return null;
    }

    const expr = new PostfixPointInstruction({ sourceNode, scope, element: postfixExpr, postfix: fieldNameExpr });
    return checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
}


function analyzePostfixArithmetic(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    const operator: PostfixOperator = <PostfixOperator>children[0].value;

    const postfixExpr = analyzeExpr(context, program, children[1]);
    const postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

    const exprType = checkOneOperandExprType(context, sourceNode, operator, postfixExprType);

    if (isNull(exprType)) {
        _error(context, sourceNode, EErrors.InvalidPostfixArithmetic, {
            operator: operator,
            typeName: postfixExprType.toString()
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
function analyzeUnaryExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

    const children = sourceNode.children;
    const operator = <UnaryOperator>children[1].value;
    const scope = program.currentScope;

    let expr = analyzeExpr(context, program, children[0]);
    let exprType = checkOneOperandExprType(context, sourceNode, operator, expr.type);

    if (isNull(exprType)) {
        _error(context, sourceNode, EErrors.InvalidUnaryOperation, {
            operator: operator,
            tyename: expr.type.toString()
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
function analyzeCastExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;

    const type = analyzeConstTypeDim(context, program, children[2]);
    const sourceExpr = analyzeExpr(context, program, children[0]);

    if (!(<IVariableTypeInstruction>sourceExpr.type).readable) {
        _error(context, sourceNode, EErrors.InvalidTypeForReading);
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
function analyzeConditionalExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;


    const conditionExpr = analyzeExpr(context, program, children[children.length - 1]);
    const leftExpr = analyzeExpr(context, program, children[children.length - 3]);
    const rightExpr = analyzeExpr(context, program, children[0]);

    const conditionType = <IVariableTypeInstruction>conditionExpr.type;
    const leftExprType = <IVariableTypeInstruction>leftExpr.type;
    const rightExprType = <IVariableTypeInstruction>rightExpr.type;

    const boolType = SystemScope.T_BOOL;

    if (!conditionType.isEqual(boolType)) {
        _error(context, conditionExpr.sourceNode, EErrors.InvalidConditionType, { typeName: conditionType.toString() });
        return null;
    }

    if (!leftExprType.isEqual(rightExprType)) {
        _error(context, leftExprType.sourceNode, EErrors.InvalidConditonValueTypes, {
            leftTypeName: leftExprType.toString(),
            rightTypeName: rightExprType.toString()
        });
        return null;
    }

    if (!conditionType.readable) {
        _error(context, conditionType.sourceNode, EErrors.InvalidTypeForReading);
        return null;
    }

    if (!leftExprType.readable) {
        _error(context, leftExprType.sourceNode, EErrors.InvalidTypeForReading);
        return null;
    }

    if (!rightExprType.readable) {
        _error(context, rightExprType.sourceNode, EErrors.InvalidTypeForReading);
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
function analyzeArithmeticExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope
    const operator = <ArithmeticOperator>sourceNode.children[1].value;

    const left = analyzeExpr(context, program, children[children.length - 1]);
    const right = analyzeExpr(context, program, children[0]);

    const leftType = <IVariableTypeInstruction>left.type;
    const rightType = <IVariableTypeInstruction>right.type;

    const type = checkTwoOperandExprTypes(context, operator, leftType, rightType);

    if (isNull(type)) {
        _error(context, sourceNode, EErrors.InvalidArithmeticOperation, {
            operator: operator,
            leftTypeName: leftType.toString(),
            rightTypeName: rightType.toString()
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
function analyzeRelationExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    const operator = <RelationOperator>sourceNode.children[1].value;

    const left = analyzeExpr(context, program, children[children.length - 1]);
    const right = analyzeExpr(context, program, children[0]);

    const leftType = <IVariableTypeInstruction>left.type;
    const rightType = <IVariableTypeInstruction>right.type;

    const exprType = checkTwoOperandExprTypes(context, operator, leftType, rightType);

    if (isNull(exprType)) {
        _error(context, sourceNode, EErrors.InvalidRelationalOperation, {
            operator: operator,
            leftTypeName: leftType.hash,
            rightTypeName: rightType.hash
        });
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
function analyzeLogicalExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    const operator = <LogicalOperator>sourceNode.children[1].value;

    const left = analyzeExpr(context, program, children[children.length - 1]);
    const right = analyzeExpr(context, program, children[0]);

    const leftType = <IVariableTypeInstruction>left.type;
    const rightType = <IVariableTypeInstruction>right.type;

    const boolType = SystemScope.T_BOOL;

    if (!leftType.isEqual(boolType)) {
        _error(context, leftType.sourceNode, EErrors.InvalidLogicOperation, {
            operator: operator,
            typeName: leftType.toString()
        });
        return null;
    }
    if (!rightType.isEqual(boolType)) {
        _error(context, rightType.sourceNode, EErrors.InvalidLogicOperation, {
            operator: operator,
            typeName: rightType.toString()
        });
        return null;
    }

    if (!leftType.readable) {
        _error(context, sourceNode, EErrors.InvalidTypeForReading);
        return null;
    }

    if (!rightType.readable) {
        _error(context, sourceNode, EErrors.InvalidTypeForReading);
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
function analyzeAssignmentExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    const operator = <AssigmentOperator>children[1].value;

    const left = analyzeExpr(context, program, children[children.length - 1]);
    const right = analyzeExpr(context, program, children[0]);

    const leftType = <IVariableTypeInstruction>left.type;
    const rightType = <IVariableTypeInstruction>right.type;

    let exprType: IVariableTypeInstruction = null;

    if (operator !== '=') {
        exprType = checkTwoOperandExprTypes(context, operator, leftType, rightType);
        if (isNull(exprType)) {
            _error(context, sourceNode, EErrors.InvalidArithmeticAssigmentOperation, {
                operator: operator,
                leftTypeName: leftType.hash,
                rightTypeName: rightType.hash
            });
        }
    } else {
        exprType = rightType;
    }

    exprType = checkTwoOperandExprTypes(context, '=', leftType, exprType);

    if (isNull(exprType)) {
        _error(context, sourceNode, EErrors.InvalidAssigmentOperation, {
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
function analyzeIdExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const scope = program.currentScope;

    let name = sourceNode.value;
    let variable = scope.findVariable(name);

    if (isNull(variable)) {
        _error(context, sourceNode, EErrors.UnknownVarName, { varName: name });
        return null;
    }

    if (!isNull(context.currentFunction)) {
        // todo: rewrite this!
        if (!variable.checkPixelUsage()) {
            // context.currentFunction.$overwriteType(EFunctionType.k_Function);
        }

        if (!variable.checkVertexUsage()) {
            // context.currentFunction.$overwriteType(EFunctionType.k_Function);
        }
    }

    let varId = new IdExprInstruction({ scope, sourceNode, id: variable.id, decl: variable });
    return checkInstruction(context, varId, ECheckStage.CODE_TARGET_SUPPORT);
}


function analyzeSimpleExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
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
function analyzeConstTypeDim(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {

    const children = sourceNode.children;

    if (children.length > 1) {
        _error(context, sourceNode, EErrors.InvalidCastTypeUsage);
        return null;
    }

    const type = <IVariableTypeInstruction>(analyzeType(context, program, children[0]));

    if (!type.isBase()) {
        _error(context, sourceNode, EErrors.InvalidCastTypeNotBase, { typeName: type.toString() });
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
function analyzeVarStructDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {
    const children = sourceNode.children;

    let usageType = analyzeUsageStructDecl(context, program, children[children.length - 1]);
    let vars: IVariableDeclInstruction[] = [];

    for (let i = children.length - 2; i >= 1; i--) {
        if (children[i].name === 'Variable') {
            vars = vars.concat(analyzeVariable(context, program, children[i], usageType));
        }
    }

    return vars;
}


function analyzeUsageStructDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let usages: string[] = [];
    let type: ITypeInstruction = null;

    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'StructDecl') {
            type = analyzeStructDecl(context, program, children[i]);
            const typeDecl = new TypeDeclInstruction({ scope, sourceNode: children[i], type });
            addTypeDecl(context, scope, typeDecl);
        } else if (children[i].name === 'Usage') {
            const usage = analyzeUsage(children[i]);
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
function analyzeStruct(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
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
            fields = fields.concat(analyzeVariableDecl(context, program, children[i]));
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
function analyzeFunctionDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IFunctionDeclInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;
    const globalScope = program.globalScope;
    const lastNodeValue = children[0].value;

    console.assert(scope == globalScope);

    let annotation: IAnnotationInstruction = null;
    let implementation: IStmtBlockInstruction = null;

    program.push(EScopeType.k_Default);

    let definition = analyzeFunctionDef(context, program, children[children.length - 1]);
    let func = globalScope.findFunction(definition.name, definition.paramList);

    if (!isDef(func)) {
        _error(context, sourceNode, EErrors.CannotChooseFunction, { funcName: definition.name });
        program.pop();
        return null;
    }

    if (!isNull(func) && func.implementation) {
        _error(context, sourceNode, EErrors.FunctionRedefinition, { funcName: definition.name });
        program.pop();
        return null;
    }

    if (!isNull(func)) {
        if (!func.definition.returnType.isEqual(definition.returnType)) {
            _error(context, sourceNode, EErrors.InvalidFuncDefenitionReturnType, { funcName: definition.name });
            program.pop();
            return null;
        }
    }

    console.assert(context.currentFunction === null);

    // todo: rewrite context ?
    context.currentFunction = definition;
    context.haveCurrentFunctionReturnOccur = false;

    if (children.length === 3) {
        annotation = analyzeAnnotation(children[1]);
    }

    if (lastNodeValue !== ';') {
        implementation = analyzeStmtBlock(context, program, children[0]);
    }

    program.pop();

    let hasVoidType = definition.returnType.isEqual(SystemScope.T_VOID);

    // validate unreachable code.
    if (!isNull(implementation)) {
        let stmtList = implementation.stmtList;

        // stmtList = stmtList.slice().reverse();
        for (let i = stmtList.length - 1; i >= 0; --i) {
            if (stmtList[i].instructionType == EInstructionTypes.k_ReturnStmtInstruction) {
                if (i != stmtList.length - 1) {
                    _error(context, stmtList[i + 1].sourceNode, EErrors.UnreachableCode);
                }
                break;
            }
        }
    }


    if (isNull(func)) {
        console.assert(scope == globalScope);
        func = new FunctionDeclInstruction({ sourceNode, scope, definition, implementation, annotation });
        if (!globalScope.addFunction(func)) {
            _error(context, sourceNode, EErrors.FunctionRedifinition, { funcName: definition.name });
        }
    }

    if (!hasVoidType && !context.haveCurrentFunctionReturnOccur) {
        _error(context, sourceNode, EErrors.InvalidFunctionReturnStmtNotFound, { funcName: definition.name });
    }

    context.currentFunction = null;

    return func;
}


// function resumeFunctionAnalysis(context: Context, program: ProgramScope, pAnalzedFunction: IFunctionDeclInstruction): void {
//     const func: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
//     const sourceNode: IParseNode = func.sourceNode;

//     program.current = func.implementationScope;

//     const children = sourceNode.children;
//     let stmtBlock: StmtBlockInstruction = null;

//     context.currentFunction = func;
//     context.haveCurrentFunctionReturnOccur = false;

//     stmtBlock = <StmtBlockInstruction>analyzeStmtBlock(context, program, children[0]);
//     func.implementation = <IStmtInstruction>stmtBlock;

//     if (!func.returnType.isEqual(SystemScope.T_VOID) && !context.haveCurrentFunctionReturnOccur) {
//         _error(context, sourceNode, EErrors.InvalidFunctionReturnStmtNotFound, { funcName: func.nameID.toString() })
//     }

//     context.currentFunction = null;
//     context.haveCurrentFunctionReturnOccur = false;

//     program.pop();

//     checkInstruction(context, func, ECheckStage.CODE_TARGET_SUPPORT);
// }

/**
 * AST example:
 *    FunctionDef
 *       + ParamList 
 *         T_NON_TYPE_ID = 'bar'
 *       + UsageType 
 */
function analyzeFunctionDef(context: Context, program: ProgramScope, sourceNode: IParseNode): FunctionDefInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    const nameNode = children[children.length - 2];
    const name = nameNode.value;

    const retTypeNode = children[children.length - 1];
    let returnType = analyzeUsageType(context, program, retTypeNode);

    // todo: is it really needed?
    if (returnType.isContainSampler()) {
        _error(context, retTypeNode, EErrors.InvalidFunctionReturnType, { funcName: name });
        return null;
    }

    let id = new IdInstruction({ scope, name, sourceNode: nameNode });

    let semantics: string = null;
    if (children.length === 4) {
        semantics = analyzeSemantic(children[0]);
    }

    let paramList = analyzeParamList(context, program, children[children.length - 3]);
    let funcDef = new FunctionDefInstruction({ scope, sourceNode, returnType, id, paramList })

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
function analyzeParamList(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction[] {

    const children = sourceNode.children;
    let paramList: IVariableDeclInstruction[] = [];

    for (let i = children.length - 2; i >= 1; i--) {
        if (children[i].name === 'ParameterDecl') {
            let param = analyzeParameterDecl(context, program, children[i]);
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
function analyzeParameterDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableDeclInstruction {
    const children = sourceNode.children;

    let type = analyzeParamUsageType(context, program, children[1]);
    let param = analyzeVariable(context, program, children[0], type);

    return param;
}

/**
 * AST example:
 *    ParamUsageType
 *       + Type 
 *       + ParamUsage 
 */
function analyzeParamUsageType(context: Context, program: ProgramScope, sourceNode: IParseNode): IVariableTypeInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let usages: string[] = [];
    let type: ITypeInstruction = null;

    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'Type') {
            type = analyzeType(context, program, children[i]);
        }
        else if (children[i].name === 'ParamUsage') {
            usages.push(analyzeUsage(children[i]));
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
function analyzeStmtBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtBlockInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;
    
    program.push(EScopeType.k_Default);

    let stmtList: IStmtInstruction[] = [];
    for (let i = children.length - 2; i > 0; i--) {
        let stmt = analyzeStmt(context, program, children[i]);
        if (!isNull(stmt)) {
            stmtList.push(stmt);
        }
    }
    
    program.pop();
    
    const stmtBlock = new StmtBlockInstruction({ sourceNode, scope, stmtList });
    checkInstruction(context, stmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

    return stmtBlock;
}


function analyzeStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

    const children = sourceNode.children;
    const firstNodeName: string = children[children.length - 1].name;

    switch (firstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(context, program, children[0]);
        case 'UseDecl':
            analyzeUseDecl(context, program, children[0]);
            return null;
        case 'T_KW_WHILE':
            return analyzeWhileStmt(context, program, sourceNode);
        case 'T_KW_FOR':
            return analyzeForStmt(context, program, sourceNode);
        case 'T_KW_IF':
            return analyzeIfStmt(context, program, sourceNode);
    }
    return null;
}


function analyzeSimpleStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

    const scope = program.currentScope;
    const children = sourceNode.children;
    const firstNodeName: string = children[children.length - 1].name;

    switch (firstNodeName) {
        case 'T_KW_RETURN':
            return analyzeReturnStmt(context, program, sourceNode);

        case 'T_KW_DO':
            return analyzeWhileStmt(context, program, sourceNode);

        case 'StmtBlock':
            return analyzeStmtBlock(context, program, children[0]);

        case 'T_KW_DISCARD':
        case 'T_KW_BREAK':
        case 'T_KW_CONTINUE':
            return analyzeBreakStmt(context, program, sourceNode);

        case 'TypeDecl':
        case 'VariableDecl':
        case 'VarStructDecl':
            return analyzeDeclStmt(context, program, children[0]);

        default:
            if (children.length === 2) {
                return analyzeExprStmt(context, program, sourceNode);
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
function analyzeReturnStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;
   

    const funcReturnType = context.currentFunction.returnType;
    context.haveCurrentFunctionReturnOccur = true;

    if (funcReturnType.isEqual(SystemScope.T_VOID) && children.length === 3) {
        _error(context, sourceNode, EErrors.InvalidReturnStmtVoid);
        return null;
    }
    else if (!funcReturnType.isEqual(SystemScope.T_VOID) && children.length === 2) {
        _error(context, sourceNode, EErrors.InvalidReturnStmtEmpty);
        return null;
    }

    let expr: IExprInstruction = null;
    if (children.length === 3) {
        expr = analyzeExpr(context, program, children[1]);

        if (!funcReturnType.isEqual(expr.type)) {
            _error(context, sourceNode, EErrors.InvalidReturnStmtTypesNotEqual);
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
function analyzeBreakStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;

    const operator: BreakOperator = <BreakOperator>children[1].value;
    
    if (operator === 'discard' && !isNull(context.currentFunction)) {
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
function analyzeDeclStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;
    const nodeName = sourceNode.name;
    
    let declList: IDeclInstruction[] = [];

    switch (nodeName) {
        case 'TypeDecl':
        declList.push(analyzeTypeDecl(context, program, sourceNode));
        break;
        case 'VariableDecl':
        declList = declList.concat(analyzeVariableDecl(context, program, sourceNode));
        break;
        case 'VarStructDecl':
        declList = declList.concat(analyzeVarStructDecl(context, program, sourceNode));
        break;
    }
    
    const declStmtInstruction = new DeclStmtInstruction({ sourceNode, scope });
    checkInstruction(context, declStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return declStmtInstruction;
}


function analyzeExprStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
    const scope = program.currentScope;
    const children = sourceNode.children;
    const expr = analyzeExpr(context, program, children[1]);
    
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
function analyzeWhileStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
    const scope = program.currentScope;
    const children = sourceNode.children;
    const isDoWhile = (children[children.length - 1].value === 'do');
    const isNonIfStmt = (sourceNode.name === 'NonIfStmt') ? true : false;
    const boolType = SystemScope.T_BOOL;

    
    let cond: IExprInstruction = null;
    let conditionType: IVariableTypeInstruction = null;
    let body: IStmtInstruction = null;
    let operator: DoWhileOperator = "do";

    if (isDoWhile) {
        operator = "do";
        cond = analyzeExpr(context, program, children[2]);
        conditionType = <IVariableTypeInstruction>cond.type;

        if (!conditionType.isEqual(boolType)) {
            _error(context, sourceNode, EErrors.InvalidDoWhileCondition, { typeName: conditionType.toString() });
            return null;
        }

        body = analyzeStmt(context, program, children[0]);
    }
    else {
        operator = "while";
        cond = analyzeExpr(context, program, children[2]);
        conditionType = <IVariableTypeInstruction>cond.type;

        if (!conditionType.isEqual(boolType)) {
            _error(context, sourceNode, EErrors.InvalidWhileCondition, { typeName: conditionType.toString() });
            return null;
        }

        if (isNonIfStmt) {
            body = analyzeNonIfStmt(context, program, children[0]);
        }
        else {
            body = analyzeStmt(context, program, children[0]);
        }
    }

    const whileStmt = new WhileStmtInstruction({ sourceNode, scope, cond, body, operator});
    checkInstruction(context, whileStmt, ECheckStage.CODE_TARGET_SUPPORT);

    return whileStmt;
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
 */
function analyzeIfStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
    const scope = program.currentScope;
    const children = sourceNode.children;
    const isIfElse = (children.length === 7);

    const cond = analyzeExpr(context, program, children[children.length - 3]);
    const conditionType = <IVariableTypeInstruction>cond.type;
    const boolType = SystemScope.T_BOOL;
    
    let conseq: IStmtInstruction = null;
    let contrary: IStmtInstruction = null;
    let operator: string = null;
    
    if (!conditionType.isEqual(boolType)) {
        _error(context, sourceNode, EErrors.InvalidIfCondition, { typeName: conditionType.toString() });
        return null;
    }
    
    if (isIfElse) {
        operator = 'if_else';
        conseq = analyzeNonIfStmt(context, program, children[2]);
        contrary = analyzeStmt(context, program, children[0]);
    }
    else {
        operator = 'if';
        conseq = analyzeNonIfStmt(context, program, children[0]);
    }
    
    const ifStmt = new IfStmtInstruction({ sourceNode, scope, cond, conseq, contrary });
    checkInstruction(context, ifStmt, ECheckStage.CODE_TARGET_SUPPORT);

    return ifStmt;
}


/**
 * AST example:
 *    NonIfStmt
 *       + SimpleStmt 
 */
function analyzeNonIfStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

    const children = sourceNode.children;
    const firstNodeName = children[children.length - 1].name;

    switch (firstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(context, program, children[0]);
        case 'T_KW_WHILE':
            return analyzeWhileStmt(context, program, sourceNode);
        case 'T_KW_FOR':
            return analyzeForStmt(context, program, sourceNode);
    }
    return null;
}


function analyzeForStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {
    const scope = program.currentScope;
    const children = sourceNode.children;
    const isNonIfStmt = (sourceNode.name === 'NonIfStmt');

    let body: IStmtInstruction = null;
    
    program.push();
    
    let init: ITypedInstruction = analyzeForInit(context, program, children[children.length - 3]);
    let cond: IExprInstruction = analyzeForCond(context, program, children[children.length - 4]);
    let step: IExprInstruction = null;
    
    if (children.length === 7) {
        step = analyzeForStep(context, program, children[2]);
    }
    
    
    if (isNonIfStmt) {
        body = analyzeNonIfStmt(context, program, children[0]);
    }
    else {
        body = analyzeStmt(context, program, children[0]);
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
function analyzeForInit(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypedInstruction {

    const children = sourceNode.children;
    const firstNodeName = children[children.length - 1].name;

    switch (firstNodeName) {
        case 'VariableDecl':
            // TODO: fixme!! 
            // add support for expressions like "a = 1, b = 2, c = 3"
            return analyzeVariableDecl(context, program, children[0])[0] || null;
        case 'Expr':
            // TODO: fixme!! 
            // add support for expressions like "a = 1, b = 2, c = 3"
            return analyzeExpr(context, program, children[0]);
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
function analyzeForCond(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;

    if (children.length === 1) {
        return null;
    }

    return analyzeExpr(context, program, children[1]);
}


/**
 * AST example:
 *    ForStep
 *       + UnaryExpr 
 */
function analyzeForStep(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const children = sourceNode.children;
    const step = analyzeExpr(context, program, children[0]);
    return step;
}


function analyzeTechniqueDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITechniqueInstruction {
    const children = sourceNode.children;
    const name = analyzeComplexName(children[children.length - 2]);
    // Specifies whether name should be interpreted as globalNamespace.name or just a name;
    const isComplexName = children[children.length - 2].children.length !== 1;
    const scope = program.currentScope;

    let annotation: IAnnotationInstruction = null;
    let semantics: string = null;
    let passList: IPassInstruction[] = null;

    for (let i = children.length - 3; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else {
            passList = analyzeTechnique(context, program, children[i]);
        }
    }

    const technique = new TechniqueInstruction({ sourceNode, name, semantics, annotation, passList, scope });
    addTechnique(context, program, technique);
    return technique;
}



function analyzeTechnique(context: Context, program: ProgramScope, sourceNode: IParseNode): IPassInstruction[] {
    const children = sourceNode.children;
    let passList: IPassInstruction[] = [];
    for (let i = children.length - 2; i >= 1; i--) {
        let pass = analyzePassDecl(context, program, children[i]);
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
function analyzePassDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IPassInstruction {

    const children = sourceNode.children;
    const scope = program.currentScope;
    const entry = analyzePassStateBlockForShaders(context, program, children[0]);
    const renderStates = analyzePassStateBlock(context, program, children[0]);
    
    let id: IIdInstruction = null;
    for (let i = 0; i < children.length; ++ i) {
        if (children[i].name === "T_NON_TYPE_ID") {
            let name = children[i].value;
            id = new IdInstruction({ name, scope });
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


function analyzePassStateBlockForShaders(context: Context, program: ProgramScope,
    sourceNode: IParseNode): { vertex: IFunctionDeclInstruction; pixel: IFunctionDeclInstruction; } {

    const children = sourceNode.children;

    let pixel: IFunctionDeclInstruction = null;
    let vertex: IFunctionDeclInstruction = null;

    for (let i = children.length - 2; i >= 1; i--) {
        let func = analyzePassStateForShader(context, program, children[i]);
        switch (func.functionType) {
            case EFunctionType.k_Vertex:
                assert(vertex == null);
                vertex = func;
                break;
            case EFunctionType.k_Pixel:
                assert(pixel == null);
                pixel = func;
                break;
            default:
                // todo: make error!
                console.error('function is not suitable as shader entry point');
        }
    }

    return { vertex, pixel };
}


function analyzePassStateForShader(context: Context, program: ProgramScope,
    sourceNode: IParseNode): IFunctionDeclInstruction {

    const children = sourceNode.children;

    const shaderTypeName = children[children.length - 1].value.toUpperCase();
    let shaderType = EFunctionType.k_Vertex;

    if (shaderTypeName === 'VERTEXSHADER') {
        shaderType = EFunctionType.k_Vertex
    }
    else if (shaderTypeName === 'PIXELSHADER') {
        shaderType = EFunctionType.k_Pixel;
    }
    else {
        console.error('unknown shader type');
        return null;
    }

    const stateExprNode = children[children.length - 3];
    const exprNode = stateExprNode.children[stateExprNode.children.length - 1];

    const compileExpr = <CompileExprInstruction>analyzeExpr(context, program, exprNode);
    const shaderFunc = compileExpr.function;

    if (shaderType === EFunctionType.k_Vertex) {
        if (!FunctionDefInstruction.checkForVertexUsage(shaderFunc.definition)) {
            _error(context, sourceNode, EErrors.FunctionVertexRedefinition, { funcDef: shaderFunc.toString() });
        }
    }
    else {
        if (!FunctionDefInstruction.checkForPixelUsage(shaderFunc.definition)) {
            _error(context, sourceNode, EErrors.FunctionPixelRedefinition, { funcDef: shaderFunc.toString() });
        }
    }

    shaderFunc.$overwriteType(shaderType);
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
function analyzePassStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): IMap<ERenderStateValues> {
    const children = sourceNode.children;
    let states: IMap<ERenderStateValues> = {}
    for (let i = children.length - 2; i >= 1; i--) {
        states = { ...states, ...analyzePassState(context, program, children[i]) };
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
function analyzePassState(context: Context, program: ProgramScope, sourceNode: IParseNode): IMap<ERenderStateValues> {

    const children = sourceNode.children;
    
    const stateType: string = children[children.length - 1].value.toUpperCase();
    const stateName: ERenderStates = getRenderState(stateType);
    const stateExprNode: IParseNode = children[children.length - 3];
    const exprNode: IParseNode = stateExprNode.children[stateExprNode.children.length - 1];
    
    if (isNull(exprNode.value) || isNull(stateName)) {
        console.warn('Pass state is incorrect.'); // todo: move to warnings
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
// todo: restore functionality! 
function analyzeImportDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): null {
    const children = sourceNode.children;
    const componentName = analyzeComplexName(children[children.length - 2]);

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
        _error(context, sourceNode, EErrors.ImportedComponentNotExists, { componentName: componentName });
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
function analyzeStructDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    const name = children[children.length - 2].value;

    program.push(EScopeType.k_Struct);

    let fields: IVariableDeclInstruction[] = [];
    for (let i = children.length - 4; i >= 1; i--) {
        if (children[i].name === 'VariableDecl') {
            fields = fields.concat(analyzeVariableDecl(context, program, children[i]));
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
function analyzeTypeDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeDeclInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;
    
    let type: ITypeInstruction = null;
    if (children.length === 2) {
        type = analyzeStructDecl(context, program, children[1]);
    }
    else {
        _error(context, sourceNode, EErrors.UnsupportedTypeDecl);
    }

    
    let typeDecl = new TypeDeclInstruction({ scope, sourceNode, type });
    addTypeDecl(context, scope, typeDecl);
    return checkInstruction(context, typeDecl, ECheckStage.CODE_TARGET_SUPPORT);
}


function analyzeGlobals(context: Context, program: ProgramScope, ast: IParseTree): IInstruction[] {
    const children = ast.getRoot().children;
    let globals: IInstruction[] = [];

    for (let i = children.length - 1; i >= 0; i--) {
        switch (children[i].name) {
            case 'TechniqueDecl':
                globals.push(analyzeTechniqueDecl(context, program, children[i]));
                break;
            case 'UseDecl':
                analyzeUseDecl(context, program, children[i]); // << always 'use strict' by default!
                break;
            case 'ImportDecl':
                globals.push(analyzeImportDecl(context, program, children[i]));
                break;
            case 'ProvideDecl':
                globals.push(analyzeProvideDecl(context, program, children[i]));
                break;
            case 'TypeDecl':
                globals.push(analyzeTypeDecl(context, program, children[i]));
                break;
            case 'VariableDecl':
                globals = globals.concat(analyzeVariableDecl(context, program, children[i]));
                break;
            case 'VarStructDecl':
                globals = globals.concat(analyzeVarStructDecl(context, program, children[i]));
                break;
            case 'FunctionDecl':
                globals.push(analyzeFunctionDecl(context, program, children[i]));
                break;
        }
    }

    return globals;
}



// function analyzeFunctionDecls(context: Context, program: ProgramScope): void {
//     for (let i = 0; i < context.functionWithImplementationList.length; i++) {
//         resumeFunctionAnalysis(context, program, context.functionWithImplementationList[i]);
//     }

//     checkFunctionsForRecursion(context);
//     checkFunctionForCorrectUsage(context);
//     generateInfoAboutUsedData(context);
//     generateShadersFromFunctions(context);
// }


class Context {
    readonly filename: string | null = null;

    moduleName: string | null;
    currentFunction: IFunctionDefInstruction | null;
    haveCurrentFunctionReturnOccur: boolean;

    constructor(filename: string, ) {
        this.filename = filename;

        this.moduleName = null;
        this.currentFunction = null;
        this.haveCurrentFunctionReturnOccur = false;
    }
}

export interface IAnalyzeResult {
    root: IInstructionCollector;
    diag: IDiagnosticReport;
}

export function analyze(filename: string, ast: IParseTree): IAnalyzeResult {
    const program = new ProgramScope();
    const context = new Context(filename);

    diag.reset();

    console.time(`analyze(${filename})`);


    let list: IInstruction[] = null;

    try {
        program.begin(SystemScope.SCOPE);
        // analyzeFunctionDefinitions(context, program, ast);
        // analyzeFunctionDecls(context, scope);
        list = analyzeGlobals(context, program, ast);

        program.end();
    }
    catch (e) {
        throw e;
    }

    console.timeEnd(`analyze(${filename})`);
    return { diag: diag.resolve(), root:  new InstructionCollector({ scope: program.currentScope, instructions: list }) };
}


