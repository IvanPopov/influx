import { assert, isDef, isDefAndNotNull, isNull, assignIfDef, PropertiesDiff } from '@lib/common';
import { ArithmeticExprInstruction, ArithmeticOperator } from '@lib/fx/instructions/ArithmeticExprInstruction';
import { AssigmentOperator, AssignmentExprInstruction } from "@lib/fx/instructions/AssignmentExprInstruction";
import { BoolInstruction } from '@lib/fx/instructions/BoolInstruction';
import { BreakOperator, BreakStmtInstruction } from '@lib/fx/instructions/BreakStmtInstruction';
import { CastExprInstruction } from '@lib/fx/instructions/CastExprInstruction';
import { CompileExprInstruction } from '@lib/fx/instructions/CompileExprInstruction';
import { ComplexExprInstruction } from '@lib/fx/instructions/ComplexExprInstruction';
import { ComplexTypeInstruction } from '@lib/fx/instructions/ComplexTypeInstruction';
import { ConditionalExprInstruction } from '@lib/fx/instructions/ConditionalExprInstruction';
import { ConstructorCallInstruction } from '@lib/fx/instructions/ConstructorCallInstruction';
import { DeclStmtInstruction } from '@lib/fx/instructions/DeclStmtInstruction';
import { ExprStmtInstruction } from '@lib/fx/instructions/ExprStmtInstruction';
import { FloatInstruction } from '@lib/fx/instructions/FloatInstruction';
import { ForStmtInstruction } from '@lib/fx/instructions/ForStmtInstruction';
import { FunctionCallInstruction } from '@lib/fx/instructions/FunctionCallInstruction';
import { FunctionDeclInstruction } from '@lib/fx/instructions/FunctionDeclInstruction';
import { FunctionDefInstruction } from '@lib/fx/instructions/FunctionDefInstruction';
import { IdExprInstruction } from '@lib/fx/instructions/IdExprInstruction';
import { IdInstruction } from '@lib/fx/instructions/IdInstruction';
import { IfStmtInstruction } from '@lib/fx/instructions/IfStmtInstruction';
import { InitExprInstruction } from '@lib/fx/instructions/InitExprInstruction';
import { InstructionCollector } from '@lib/fx/instructions/InstructionCollector';
import { IntInstruction } from '@lib/fx/instructions/IntInstruction';
import { LogicalExprInstruction, LogicalOperator } from '@lib/fx/instructions/LogicalExprInstruction';
import { PassInstruction } from '@lib/fx/instructions/PassInstruction';
import { PostfixArithmeticInstruction, PostfixOperator } from '@lib/fx/instructions/PostfixArithmeticInstruction';
import { PostfixIndexInstruction } from '@lib/fx/instructions/PostfixIndexInstruction';
import { PostfixPointInstruction } from '@lib/fx/instructions/PostfixPointInstruction';
import { ProvideInstruction } from "@lib/fx/instructions/ProvideInstruction";
import { RelationalExprInstruction, RelationOperator } from '@lib/fx/instructions/RelationalExprInstruction';
import { ReturnStmtInstruction } from '@lib/fx/instructions/ReturnStmtInstruction';
import { SamplerOperator, SamplerStateBlockInstruction } from '@lib/fx/instructions/SamplerStateBlockInstruction';
import { SamplerStateInstruction } from "@lib/fx/instructions/SamplerStateInstruction";
import { SemicolonStmtInstruction } from '@lib/fx/instructions/SemicolonStmtInstruction';
import { StmtBlockInstruction } from '@lib/fx/instructions/StmtBlockInstruction';
import { StringInstruction } from '@lib/fx/instructions/StringInstruction';
import { SystemTypeInstruction } from '@lib/fx/instructions/SystemTypeInstruction';
import { TechniqueInstruction } from '@lib/fx/instructions/TechniqueInstruction';
import { TypeDeclInstruction } from '@lib/fx/instructions/TypeDeclInstruction';
import { UnaryExprInstruction, UnaryOperator } from '@lib/fx/instructions/UnaryExprInstruction';
import { EVariableUsageFlags, VariableDeclInstruction } from '@lib/fx/instructions/VariableDeclInstruction';
import { VariableTypeInstruction } from '@lib/fx/instructions/VariableTypeInstruction';
import { DoWhileOperator, WhileStmtInstruction } from '@lib/fx/instructions/WhileStmtInstruction';
import { ProgramScope } from '@lib/fx/ProgramScope';
import * as SystemScope from '@lib/fx/SystemScope';
import { EAnalyzerErrors as EErrors, EAnalyzerWarnings as EWarnings } from '@lib/idl/EAnalyzerErrors';
import { ERenderStates } from '@lib/idl/ERenderStates';
import { ERenderStateValues } from '@lib/idl/ERenderStateValues';
import { ECheckStage, EFunctionType, EInstructionTypes, EScopeType, IAnnotationInstruction, IConstructorCallInstruction, IDeclInstruction, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, IInstructionError, IPassInstruction, IProvideInstruction, ISamplerStateInstruction, IScope, IStmtBlockInstruction, IStmtInstruction, ITechniqueInstruction, ITypeDeclInstruction, ITypedInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction, ETechniqueType, ICompileExprInstruction } from '@lib/idl/IInstruction';
import { IMap } from '@lib/idl/IMap';
import { IParseNode, IParseTree, IRange } from "@lib/idl/parser/IParser";
import { Diagnostics, IDiagnosticReport } from "@lib/util/Diagnostics";
import { PartFxInstruction } from '@lib/fx/instructions/part/PartFxInstruction';
import { IPartFxPassInstruction, IPartFxInstruction } from '@lib/idl/IPartFx';
import { PartFxPassInstruction } from '@lib/fx/instructions/part/PartFxPassInstruction';




function validate(instr: IInstruction, expectedType: EInstructionTypes) {
    assert(instr.instructionType === expectedType);
}

// todo: refactor it
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
            [EErrors.InvalidFunctionReturnStmtNotFound]: 'Return statement expected.', // todo: specify func name and return type details.
            [EErrors.InvalidVariableInitializing]: 'Invalid variable initializing.',
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

    context.error(sourceNode, EErrors.UnsupportedProvideAs);
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
    context.error(sourceNode, pError.code, isNull(pError.info) ? {} : pError.info);
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
        context.error(typeDecl.sourceNode, EErrors.SystemTypeRedefinition, { typeName: typeDecl.name });
    }

    let isAdded = scope.addType(typeDecl.type);
    if (!isAdded) {
        context.error(typeDecl.sourceNode, EErrors.TypeRedefinition, { typeName: typeDecl.name });
    }
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


function addTechnique(context: Context, program: ProgramScope, technique: ITechniqueInstruction): void {
    let name: string = technique.name;

    if (program.globalScope.hasTechnique(name)) {
        context.error(technique.sourceNode, EErrors.TechniqueNameRedefinition, { techName: name });
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
//                         context.error(sourceNode, EErrors.InvalidFunctionUsageRecursion, { funcDef: testedFunction.stringDef });
//                         continue mainFor;
//                     }

//                     if (addedFunction.isBlackListFunction() ||
//                         !addedFunction.canUsedAsFunction()) {
//                         testedFunction.addToBlackList();
//                         context.error(sourceNode, EErrors.InvalidFunctionUsageBlackList, { funcDef: testedFunction.stringDef });
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
//                 context.error(testedFunction.sourceNode, EErrors.InvalidFunctionUsageVertex, { funcDef: testedFunction.stringDef });
//                 testedFunction.addToBlackList();
//                 isNewDelete = true;
//                 continue mainFor;
//             }

//             if (!testedFunction.checkPixelUsage()) {
//                 context.error(testedFunction.sourceNode, EErrors.InvalidFunctionUsagePixel, { funcDef: testedFunction.stringDef });
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
//                         context.error(usedFunction.sourceNode, EErrors.InvalidFunctionUsageVertex, { funcDef: testedFunction.stringDef });
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
//                         context.error(usedFunction.sourceNode, EErrors.InvalidFunctionUsagePixel, { funcDef: testedFunction.stringDef });
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
            console.warn(EWarnings[EWarnings.UnsupportedRenderStateTypeUsed], { state });
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
            context.error(leftType.sourceNode, EErrors.InvalidTypeForWriting);
            return null;
        }

        if (!rightType.readable) {
            context.error(rightType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        if (operator !== '=' && !leftType.readable) {
            context.error(leftType.sourceNode, EErrors.InvalidTypeForReading);
        }
    }
    else {
        if (!leftType.readable) {
            context.error(leftType.sourceNode, EErrors.InvalidTypeForReading);
            return null;
        }

        if (!rightType.readable) {
            context.error(rightType.sourceNode, EErrors.InvalidTypeForReading);
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
                context.error(sourceNode, EErrors.InvalidTypeNameNotType, { typeName: sourceNode.value });
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
                context.error(sourceNode, EErrors.InvalidTypeNameNotType, { typeName: children[children.length - 1].value });
            }

            break;

        case 'VectorType':
        case 'MatrixType':
            context.error(sourceNode, EErrors.InvalidTypeVectorMatrix);
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
function analyzeVariable(context: Context, program: ProgramScope, sourceNode: IParseNode, generalType: IVariableTypeInstruction): IVariableDeclInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let annotation: IAnnotationInstruction = null;
    let init: IInitExprInstruction = null;
    let semantics = '';
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
    
        assert (vdimChildren.length == 4);

        if (!isNull(arrayIndex)) {
            generalType = new VariableTypeInstruction({ scope, sourceNode, type: generalType, arrayIndex });
        }

        arrayIndex = analyzeExpr(context, program, vdimChildren[vdimChildren.length - 3]);
        vdimNode = vdimChildren[vdimChildren.length - 1];
    } while (true);
    
    type = new VariableTypeInstruction({ scope, sourceNode, type: generalType, arrayIndex });

    for (let i = children.length - 2; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else if (children[i].name === 'Initializer') {
            let args = analyzeInitializerArguments(context, program, children[i]);
            init = new InitExprInstruction({ scope, sourceNode: children[i], args, type });
            
            let isValidInit = false;
            try {
                isValidInit = init.optimizeForVariableType(type);
            } catch (e) {};

            if (!isValidInit) {
                // todo: make it warning
                context.error(sourceNode, EErrors.InvalidVariableInitializing, { varName: id.name });
                init = null;
            }
        }
    }

    const varDecl = new VariableDeclInstruction({ sourceNode, scope, type, init, id, semantics, annotation, usageFlags });
    assert(scope.type != EScopeType.k_System);

    if (SystemScope.hasVariable(varDecl.name)) {
        context.error(sourceNode, EErrors.SystemVariableRedefinition, { varName: varDecl.name });
    }

    const isAdded = scope.addVariable(varDecl);
    if (!isAdded) {
        switch (scope.type) {
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
function analyzeInitializerArguments(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction[] {
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

    return args;
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
            context.critical(sourceNode, EErrors.UnsupportedExpr, { exprName: name });
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

    let args: IExprInstruction[] = [];

    if (children.length > 4) {
        for (let i = children.length - 3; i > 0; i--) {
            if (children[i].value !== ',') {
                let argumentExpr = analyzeExpr(context, program, children[i]);
                args.push(argumentExpr);
            }
        }
    }

    // let shaderFunc = program.globalScope.findShaderFunction(shaderFuncName, args);
    let func = program.globalScope.findFunction(shaderFuncName, args);

    if (isNull(func)) {
        context.error(sourceNode, EErrors.InvalidCompileNotFunction, { funcName: shaderFuncName });
        return null;
    }

    let type = VariableTypeInstruction.wrap(<IVariableTypeInstruction>func.definition.returnType, scope);

    let expr = new CompileExprInstruction({ args, scope, type, operand: func });
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

    if (func.instructionType === EInstructionTypes.k_FunctionDeclInstruction || 
        func.instructionType === EInstructionTypes.k_SystemFunctionDeclInstruction) {
        if (!isNull(args)) {
            const funcArguments = func.definition.paramList;

            for (let i = 0; i < args.length; i++) {
                if (funcArguments[i].type.hasUsage('out')) {
                    if (!args[i].type.writable) {
                        context.error(sourceNode, EErrors.InvalidTypeForWriting);
                        return null;
                    }
                } else if (funcArguments[i].type.hasUsage('inout')) {
                    if (!args[i].type.writable) {
                        context.error(sourceNode, EErrors.InvalidTypeForWriting);
                        return null;
                    }

                    if (!args[i].type.readable) {
                        context.error(sourceNode, EErrors.InvalidTypeForReading);
                        return null;
                    }
                } else {
                    if (!args[i].type.readable) {
                        context.error(sourceNode, EErrors.InvalidTypeForReading);
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
        context.error(sourceNode, EErrors.InvalidComplexNotType);
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
        context.error(sourceNode, EErrors.InvalidComplexNotConstructor, { typeName: ctorType.toString() });
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
        context.error(sourceNode, EErrors.InvalidPostfixNotArray, { typeName: postfixExprType.toString() });
        return null;
    }

    const indexExpr = analyzeExpr(context, program, children[children.length - 3]);
    const indexExprType = <IVariableTypeInstruction>indexExpr.type;

    if (!indexExprType.isEqual(SystemScope.T_INT)) {
        context.error(sourceNode, EErrors.InvalidPostfixNotIntIndex, { typeName: indexExprType.toString() });
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
        context.error(sourceNode, EErrors.InvalidPostfixNotField, {
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
        context.error(sourceNode, EErrors.InvalidPostfixArithmetic, {
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
        context.error(sourceNode, EErrors.InvalidUnaryOperation, {
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
        context.error(conditionExpr.sourceNode, EErrors.InvalidConditionType, { typeName: conditionType.toString() });
        return null;
    }

    if (!leftExprType.isEqual(rightExprType)) {
        context.error(leftExprType.sourceNode, EErrors.InvalidConditonValueTypes, {
            leftTypeName: leftExprType.toString(),
            rightTypeName: rightExprType.toString()
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
        context.error(sourceNode, EErrors.InvalidArithmeticOperation, {
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
        context.error(sourceNode, EErrors.InvalidRelationalOperation, {
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
        context.error(leftType.sourceNode, EErrors.InvalidLogicOperation, {
            operator: operator,
            typeName: leftType.toString()
        });
        return null;
    }
    if (!rightType.isEqual(boolType)) {
        context.error(rightType.sourceNode, EErrors.InvalidLogicOperation, {
            operator: operator,
            typeName: rightType.toString()
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
            context.error(sourceNode, EErrors.InvalidArithmeticAssigmentOperation, {
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
function analyzeIdExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const scope = program.currentScope;

    let name = sourceNode.value;
    let decl = scope.findVariable(name);

    if (isNull(decl)) {
        context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
        return null;
    }

    if (context.func) {
        // todo: rewrite this!
        if (!decl.checkPixelUsage()) {
            // context.currentFunction.$overwriteType(EFunctionType.k_Function);
        }

        if (!decl.checkVertexUsage()) {
            // context.currentFunction.$overwriteType(EFunctionType.k_Function);
        }
    }

    let id = new IdInstruction({ sourceNode, name, scope });
    let varId = new IdExprInstruction({ scope, sourceNode, id, decl });
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
        context.error(sourceNode, EErrors.InvalidCastTypeUsage);
        return null;
    }

    const type = <IVariableTypeInstruction>(analyzeType(context, program, children[0]));

    if (!type.isBase()) {
        context.error(sourceNode, EErrors.InvalidCastTypeNotBase, { typeName: type.toString() });
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

    let annotation: IAnnotationInstruction = null;
    let implementation: IStmtBlockInstruction = null;

    program.push(EScopeType.k_Default);

    let definition = analyzeFunctionDef(context, program, children[children.length - 1]);
    let func = globalScope.findFunction(definition.name, definition.paramList);

    if (!isDef(func)) {
        context.error(sourceNode, EErrors.CannotChooseFunction, { funcName: definition.name });
        program.pop();
        return null;
    }

    if (!isNull(func) && func.implementation) {
        context.error(sourceNode, EErrors.FunctionRedefinition, { funcName: definition.name });
        program.pop();
        return null;
    }

    if (!isNull(func)) {
        if (!func.definition.returnType.isEqual(definition.returnType)) {
            context.error(sourceNode, EErrors.InvalidFuncDefenitionReturnType, { funcName: definition.name });
            program.pop();
            return null;
        }
    }

    assert(context.funcDef === null);

    // todo: rewrite context ?
    context.funcDef = definition;

    if (children.length === 3) {
        annotation = analyzeAnnotation(children[1]);
    }

    if (lastNodeValue !== ';') {
        // todo: do to increase scope depth inside stmt block!!
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
                    context.error(stmtList[i + 1].sourceNode, EErrors.UnreachableCode);
                }
                break;
            }
        }
    }


    if (isNull(func)) {
        assert(scope == globalScope);
        func = new FunctionDeclInstruction({ sourceNode, scope, definition, implementation, annotation });
        if (!globalScope.addFunction(func)) {
            context.error(sourceNode, EErrors.FunctionRedifinition, { funcName: definition.name });
        }
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
function analyzeFunctionDef(context: Context, program: ProgramScope, sourceNode: IParseNode): FunctionDefInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    const nameNode = children[children.length - 2];
    const name = nameNode.value;

    const retTypeNode = children[children.length - 1];
    let returnType = analyzeUsageType(context, program, retTypeNode);

    // todo: is it really needed?
    if (returnType.isContainSampler()) {
        context.error(retTypeNode, EErrors.InvalidFunctionReturnType, { funcName: name });
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
    
    let stmtList: IStmtInstruction[] = [];
    for (let i = children.length - 2; i > 0; i--) {
        let stmt = analyzeStmt(context, program, children[i]);
        if (!isNull(stmt)) {
            stmtList.push(stmt);
        }
    }
    
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
        {
            program.push(EScopeType.k_Default);
            let stmtBlock = analyzeStmtBlock(context, program, children[0]);
            program.pop();
            return stmtBlock;
        }
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
   
    assert(context.func);

    const funcReturnType = context.funcDef.returnType;
    context.haveCurrentFunctionReturnOccur = true;

    if (funcReturnType.isEqual(SystemScope.T_VOID) && children.length === 3) {
        context.error(sourceNode, EErrors.InvalidReturnStmtVoid);
        return null;
    }
    else if (!funcReturnType.isEqual(SystemScope.T_VOID) && children.length === 2) {
        context.error(sourceNode, EErrors.InvalidReturnStmtEmpty);
        return null;
    }

    let expr: IExprInstruction = null;
    if (children.length === 3) {
        expr = analyzeExpr(context, program, children[1]);

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
function analyzeBreakStmt(context: Context, program: ProgramScope, sourceNode: IParseNode): IStmtInstruction {

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
    
    const declStmtInstruction = new DeclStmtInstruction({ sourceNode, scope, declList });
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
            context.error(sourceNode, EErrors.InvalidDoWhileCondition, { typeName: conditionType.toString() });
            return null;
        }

        body = analyzeStmt(context, program, children[0]);
    }
    else {
        operator = "while";
        cond = analyzeExpr(context, program, children[2]);
        conditionType = <IVariableTypeInstruction>cond.type;

        if (!conditionType.isEqual(boolType)) {
            context.error(sourceNode, EErrors.InvalidWhileCondition, { typeName: conditionType.toString() });
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
        context.error(sourceNode, EErrors.InvalidIfCondition, { typeName: conditionType.toString() });
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
    if (children.length == 0) {
        return null;
    }
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
    let techniqueType: ETechniqueType = ETechniqueType.k_BasicFx;

    for (let i = children.length - 3; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else {
            passList = analyzeTechnique(context, program, children[i]);
        }
    }

    const technique = new TechniqueInstruction({ sourceNode, name, techniqueType, semantics, annotation, passList, scope });
    addTechnique(context, program, technique);
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

/**
 * AST example:
 *    PassState
 *         T_PUNCTUATOR_59 = ';'
 *       + PassStateExpr 
 *         T_PUNCTUATOR_61 = '='
 *         T_NON_TYPE_ID = 'VertexShader'
 */
function analyzePassStateBlockForShaders(context: Context, program: ProgramScope,
    sourceNode: IParseNode): { vertex: IFunctionDeclInstruction; pixel: IFunctionDeclInstruction; } {

    const children = sourceNode.children;

    let pixel: IFunctionDeclInstruction = null;
    let vertex: IFunctionDeclInstruction = null;

    for (let i = children.length - 2; i >= 1; i--) {
        let func = analyzePassStateForShader(context, program, children[i]);
        if (!isNull(func)) {
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
            context.error(sourceNode, EErrors.FunctionVertexRedefinition, { funcDef: shaderFunc.toString() });
        }
    }
    else {
        if (!FunctionDefInstruction.checkForPixelUsage(shaderFunc.definition)) {
            context.error(sourceNode, EErrors.FunctionPixelRedefinition, { funcDef: shaderFunc.toString() });
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
        context.error(sourceNode, EErrors.UnsupportedTypeDecl);
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
            
            case 'PartFxDecl':
                globals.push(analyzePartFXDecl(context, program, children[i]));
                break;

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
                assert(program.currentScope == program.globalScope);

                context.beginFunc();
                globals.push(analyzeFunctionDecl(context, program, children[i]));
                context.endFunc();
                break;
        }
    }

    return globals;
}


/**
 * AST example:
 *    PassState
 *         T_PUNCTUATOR_59 = ';'
 *       + PassStateExpr 
 *         T_PUNCTUATOR_61 = '='
 *         T_NON_TYPE_ID = 'SpawnRoutine'
 */
function analyzePartFXProperty(context: Context, program: ProgramScope, sourceNode: IParseNode): any {
    const children = sourceNode.children;
    console.log(sourceNode);
}

/**
 * AST example:
 *    PassDecl
 *       + PassStateBlock 
 *         T_NON_TYPE_ID = 'P0'
 *         T_KW_PASS = 'pass'
 */
function analyzePartFXPassDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IPartFxPassInstruction {

    
    const children = sourceNode.children;
    const scope = program.currentScope;
    const renderStates = analyzePassStateBlock(context, program, children[0]);
    const fxStates = analyzePartFxStateBlock(context, program, children[0]);

    const sorting = assignIfDef(fxStates.sorting, true);
    const defaultShader = assignIfDef(fxStates.defaultShader, false);
    const prerenderRoutine = assignIfDef(fxStates.prerenderRoutine, null);

    let id: IIdInstruction = null;
    for (let i = 0; i < children.length; ++ i) {
        if (children[i].name === "T_NON_TYPE_ID") {
            let name = children[i].value;
            id = new IdInstruction({ name, scope });
        }
    }

    const pass = new PartFxPassInstruction({
        scope,
        sourceNode,
        renderStates,
        id,
        sorting,
        defaultShader,
        prerenderRoutine,
        // todo: rework shaders setup
        pixelShader: null,
        vertexShader: null
    });

    //todo: add annotation and id

    return pass;
}



type IPartFxPassProperties = PropertiesDiff<IPartFxPassInstruction, IPassInstruction>;

// todo: use explicit return type
function analyzePartFxStateBlock(context: Context, program: ProgramScope, sourceNode: IParseNode): Partial<IPartFxPassProperties> {
    const children = sourceNode.children;
    let states: Partial<IPartFxPassProperties> = {}
    for (let i = children.length - 2; i >= 1; i--) {
        states = { ...states, ...analyzePartFXPassProperies(context, program, children[i]) };
    }
    return states;
}


/**
 * AST example:
 *    PassState
 *         T_PUNCTUATOR_59 = ';'
 *       + PassStateExpr 
 *         T_PUNCTUATOR_61 = '='
 *         T_NON_TYPE_ID = 'STATE_ONE'
 */
/**
 * AST example:
 *    PassState
 *         T_PUNCTUATOR_59 = ';'
 *       + PassStateExpr 
 *         T_PUNCTUATOR_61 = '='
 *         T_NON_TYPE_ID = 'STATE_TWO'
 */
/**
 * AST example:
 *    PassStateExpr
 *         T_PUNCTUATOR_125 = '}'
 *         T_UINT = '1'
 *         T_PUNCTUATOR_44 = ','
 *         T_KW_TRUE = 'true'
 *         T_PUNCTUATOR_123 = '{'
 */
// todo: add explicit type for fx statess
function analyzePartFXPassProperies(context: Context, program: ProgramScope, sourceNode: IParseNode): Partial<IPartFxPassProperties> {

    const children = sourceNode.children;
    
    const stateName: string = children[children.length - 1].value.toUpperCase();
    const stateExprNode: IParseNode = children[children.length - 3];
    const exprNode: IParseNode = stateExprNode.children[stateExprNode.children.length - 1];

    let fxStates: Partial<IPartFxPassProperties> = {};
    
    if (isNull(exprNode.value) || isNull(stateName)) {
        console.warn('Pass state is incorrect.'); // todo: move to warnings
        // todo: return correct state list
        return fxStates;
    }
    
    /**
     * AST example:
     *    PassStateExpr
     *         T_PUNCTUATOR_125 = '}'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_44 = ','
     *         T_KW_TRUE = 'true'
     *         T_PUNCTUATOR_123 = '{'
     */
    if (exprNode.value === '{' && stateExprNode.children.length > 3) {
        const values: string[] = new Array(Math.ceil((stateExprNode.children.length - 2) / 2));
        for (let i = stateExprNode.children.length - 2, j = 0; i >= 1; i -= 2, j++) {
            // todo: validate values with names
            values[j] = stateExprNode.children[i].value.toUpperCase();
        }

        switch (stateName) {
            // case ERenderStates.BLENDFUNC:
            //     if (values.length !== 2) {
            //         console.warn('Pass state are incorrect.');
            //         return {};
            //     }
            //     renderStates[ERenderStates.SRCBLENDCOLOR] = values[0];
            //     renderStates[ERenderStates.SRCBLENDALPHA] = values[0];
            //     renderStates[ERenderStates.DESTBLENDCOLOR] = values[1];
            //     renderStates[ERenderStates.DESTBLENDALPHA] = values[1];
            //     break;
            default:
                console.warn('Pass fx state is incorrect.');
                return fxStates;
        }
    }
    /**
     * AST example:
     *    PassStateExpr
     *         T_NON_TYPE_ID = 'FALSE'
     */
    else {
        let value: string = null;
        if (exprNode.value === '{') {
            value = stateExprNode.children[1].value.toUpperCase();
        }
        else {
            value = exprNode.value.toUpperCase();
        }

        switch (stateName) {
            case 'SORTING':
                // todo: use correct validation with diag error output
                assert(value == 'TRUE' || value == 'FALSE');
                fxStates.sorting = (value === 'TRUE');
                break;
            case 'DEFAULTSHADER':
                 // todo: use correct validation with diag error output
                 assert(value == 'TRUE' || value == 'FALSE');
                 fxStates.defaultShader = (value === 'TRUE');
                 break;
            case 'PRERENDERROUTINE':
                fxStates.prerenderRoutine = <ICompileExprInstruction>analyzeObjectExpr(context, program, exprNode);
                // todo: validate prerender routine!
                console.log(fxStates.prerenderRoutine);
                break;
            default:
                console.warn('Pass fx state is incorrect.');
                break;
        }
    }
    
    return fxStates;
}



/**
 * AST example:
 *    PartFxDecl
 *         T_PUNCTUATOR_125 = '}'
 *       + PassDecl 
 *       + PassState 
 *       + PassState 
 *       + PassState 
 *         T_PUNCTUATOR_123 = '{'
 *       + ComplexNameOpt 
 *         T_KW_FXPART = 'partFx'
 */
export function analyzePartFXDecl(context: Context, program: ProgramScope, sourceNode: IParseNode): IPartFxInstruction {
    const children = sourceNode.children;
    const name = analyzeComplexName(children[children.length - 2]);
    // Specifies whether name should be interpreted as globalNamespace.name or just a name;
    const isComplexName = children[children.length - 2].children.length !== 1;
    const scope = program.currentScope;

    let annotation: IAnnotationInstruction = null;
    let semantics: string = null;
    let passList: IPartFxPassInstruction[] = [];
    let spawnRoutine: ICompileExprInstruction = null;
    let initRoutine: ICompileExprInstruction = null;
    let updateRoutine: ICompileExprInstruction = null;

    for (let i = children.length - 3; i >= 0; i--) {

        switch(children[i].name) {
            case 'Annotation':
                annotation = analyzeAnnotation(children[i]);
                break;
            case 'Semantic':
                semantics = analyzeSemantic(children[i]);
                break;
            case 'PassState':
                {
                    let stateNode = children[i];
                    let stateName = stateNode.children[3].value; // "T_NON_TYPE_ID"
                    switch (stateName.toUpperCase()) {
                        case 'SPAWNROUTINE':
                            {
                                let objectExrNode = stateNode.children[1].children[0];
                                spawnRoutine = <ICompileExprInstruction>analyzeObjectExpr(context, program, objectExrNode);
                                console.log(spawnRoutine);
                            }
                            break;
                    }
                }
                // todo: process state
                analyzePartFXProperty(context, program, children[i]);
                break;
            case 'PassDecl':
            let pass = analyzePartFXPassDecl(context, program, children[i]);
                assert(!isNull(pass));
                passList.push(pass);
                break;

        }
    }

    const partFx = new PartFxInstruction({ sourceNode, name, semantics, annotation, passList, scope, 
        spawnRoutine, initRoutine, updateRoutine });
        
    addTechnique(context, program, partFx);
    return partFx;
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
    readonly filename: string | null;
    readonly diagnostics: AnalyzerDiagnostics;

    /** driven from provide declaration */
    moduleName: string | null;

    // funct states
    func: boolean;                              // Are we inside a function analysis?
    funcDef: IFunctionDefInstruction | null;    // Current function definition.
    haveCurrentFunctionReturnOccur: boolean;    // todo: replace with array of return statements.

    constructor(filename: string, ) {
        this.diagnostics = new AnalyzerDiagnostics;
        this.filename = filename;
        this.moduleName = null;
        this.funcDef = null;
        this.haveCurrentFunctionReturnOccur = false;
    }


    beginFunc(): void {
        this.func = true;
        this.haveCurrentFunctionReturnOccur = false;
        this.funcDef = null;
    }

    endFunc(): void {
        this.func = false
    }


    error(sourceNode: IParseNode, code: number, info: IErrorInfo = {}): void {
        let loc = this.resolveNodeSourceLocation(sourceNode);
        let file = this.filename;

        this.diagnostics.error(code, { file, loc, info });
    }


    critical(sourceNode: IParseNode, code: number, info: IErrorInfo = {}): void {
        let loc = this.resolveNodeSourceLocation(sourceNode);
        let file = this.filename;

        this.diagnostics.critical(code, { file, loc, info });
    }


    warn(sourceNode: IParseNode, code: number, info: IWarningInfo = {}): void {
        let loc = this.resolveNodeSourceLocation(sourceNode);
        let file = this.filename;
        
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

export interface IAnalyzeResult {
    root: IInstructionCollector;
    scope: IScope;
    diag: IDiagnosticReport;
}

export function analyze(filename: string, ast: IParseTree): IAnalyzeResult {
    console.time(`analyze(${filename})`);

    
    const program = new ProgramScope(SystemScope.SCOPE);
    const context = new Context(filename);
    
    let globals: IInstruction[] = null;
    try {
        globals = analyzeGlobals(context, program, ast);
        program.validate();
    } catch (e) {
        // critical errors were occured
        throw e;
    }
    
    console.timeEnd(`analyze(${filename})`);

    assert(program.currentScope == program.globalScope);
    
    const scope = program.globalScope;
    const root = new InstructionCollector({ scope: program.currentScope, instructions: globals });
    const diag = context.diagnostics.resolve();

    return { root, scope, diag };
}


