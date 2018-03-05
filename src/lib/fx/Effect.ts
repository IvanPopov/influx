import { EScopeType } from '../idl/IScope'
import { IParseNode, IParseTree } from '../idl/parser/IParser';
import {
    IInstruction, IFunctionDeclInstruction, IPassInstruction, ISimpleInstruction,
    IVariableDeclInstruction, ITechniqueInstruction, ITypedInstruction,
    IVariableTypeInstruction, IIdInstruction, ITypeInstruction, ITypeDeclInstruction,
    IInstructionError, IExprInstruction, EFunctionType, EInstructionTypes, ECheckStage,
    IAnnotationInstruction, IInitExprInstruction, IIdExprInstruction, IStmtInstruction,
    IDeclInstruction, ILiteralInstruction
} from '../idl/IInstruction';
import { IMap } from '../idl/IMap';
import { time } from '../time';
import { isDef, isDefAndNotNull } from '../common';
import { isNull } from 'util';
import { SystemTypeInstruction } from './instructions/SystemTypeInstruction';
import { ComplexTypeInstruction } from './instructions/ComplexTypeInstruction';
import { SystemFunctionInstruction } from './instructions/SystemFunctionInstruction';
import { VariableDeclInstruction } from './instructions/VariableInstruction';
import { IdInstruction } from './instructions/IdInstruction';
import { VariableTypeInstruction } from './instructions/VariableTypeInstruction';
import { InstructionCollector } from './instructions/InstructionCollector';
import { ExprTemplateTranslator } from './ExprTemplateTranslator';
import { EEffectErrors, EEffectTempErrors } from '../idl/EEffectErrors';
import { logger } from '../logger';
import { ISourceLocation, ILoggerEntity } from '../idl/ILogger';
import { FunctionDefInstruction } from './instructions/FunctionDefInstruction';
import { InitExprInstruction } from './instructions/InitExprInstruction';
import { CompileExprInstruction } from './instructions/CompileExprInstruction';
import { SamplerStateBlockInstruction } from './instructions/SamplerStateBlockInstruction';
import { FunctionCallInstruction } from './instructions/FunctionCallInstruction';
import { IdExprInstruction } from './instructions/IdExprInstruction';
import { FunctionDeclInstruction } from './instructions/FunctionInstruction';
import { SystemCallInstruction } from './instructions/SystemCallInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { PostfixIndexInstruction } from './instructions/PostfixIndexInstruction';
import { PostfixArithmeticInstruction } from './instructions/PostfixArithmeticInstruction';
import { UnaryExprInstruction } from './instructions/UnaryExprInstruction';
import { ConditionalExprInstruction } from './instructions/ConditionalExprInstruction';
import { ArithmeticExprInstruction } from './instructions/ArithmeticExprInstruction';
import { CastExprInstruction } from './instructions/CastExprInstruction'
import { LogicalExprInstruction } from './instructions/LogicalExprInstruction'
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
import { TypeDeclInstruction } from './instructions/TypeInstruction'
import { RelationalExprInstruction } from './instructions/RelationalExprInstruction';
import { BoolInstruction } from './instructions/BoolInstruction';
import { StringInstruction } from './instructions/StringInstruction';
import { FloatInstruction } from './instructions/FloatInstruction';
import { IntInstruction } from './instructions/IntInstruction';
import { DeclStmtInstruction } from './instructions/DeclStmtInstruction';
import { BreakStmtInstruction } from './instructions/BreakStmtInstruction';
import { WhileStmtInstruction } from './instructions/WhileStmtInstruction';
import { IEffectErrorInfo } from '../idl/IEffectErrorInfo';
import { ProgramScope } from './ProgramScope';
import * as fx from './fx';
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';


const TEMPLATE_TYPE = 'template';


function getNodeSourceLocation(node: IParseNode): { line: number; column: number; } | null {
    if (!isDefAndNotNull(node)) {
        return null;
    }

    if (isDef(node.loc)) {
        return { line: node.loc.start.line, column: node.loc.start.column };
    }

    return getNodeSourceLocation(node.children[node.children.length - 1]);
}


const systemTypes: IMap<SystemTypeInstruction> = {};
const systemFunctionsMap: IMap<SystemFunctionInstruction[]> = {};
const systemVariables: IMap<IVariableDeclInstruction> = {};
const systemVertexOut: ComplexTypeInstruction = null;
const systemFunctionHashMap: IMap<boolean> = {};

function generateSystemType(
    name: string,
    realName: string,
    size: number = 1,
    isArray: boolean = false,
    elementType: ITypeInstruction = null,
    length: number = 1
): ITypeInstruction {

    if (getSystemType(name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    let systemType: SystemTypeInstruction = new SystemTypeInstruction();

    systemType.name = name;
    systemType.realName = realName;
    systemType.size = size;

    if (isArray) {
        systemType.addIndex(elementType, length);
    }

    systemTypes[name] = systemType;
    systemType.builtIn = true;

    return systemType;
}


function addFieldsToVectorFromSuffixObject(pSuffixMap: IMap<boolean>, pType: ITypeInstruction, sBaseType: string) {
    let sSuffix: string = null;

    for (sSuffix in pSuffixMap) {
        let sFieldTypeName: string = sBaseType + ((sSuffix.length > 1) ? sSuffix.length.toString() : '');
        let pFieldType: ITypeInstruction = getSystemType(sFieldTypeName);

        (<SystemTypeInstruction>pType).addField(sSuffix, pFieldType, pSuffixMap[sSuffix]);
    }
}


function addSystemTypeScalar(): void {
    generateSystemType('void', 'void', 0);
    generateSystemType('number', 'number', 1);
    generateSystemType('bool', 'bool', 1);
    generateSystemType('float', 'float', 1);
    generateSystemType('string', '', 0);
    generateSystemType('texture', '', 0);
    generateSystemType('sampler', 'sampler2D', 1);
    generateSystemType('sampler2D', 'sampler2D', 1);
    generateSystemType('samplerCUBE', 'samplerCube', 1);
}


function addSystemTypeVector(): void {
    let pXYSuffix: IMap<boolean> = <IMap<boolean>>{};
    let pXYZSuffix: IMap<boolean> = <IMap<boolean>>{};
    let pXYZWSuffix: IMap<boolean> = <IMap<boolean>>{};

    let pRGSuffix: IMap<boolean> = <IMap<boolean>>{};
    let pRGBSuffix: IMap<boolean> = <IMap<boolean>>{};
    let pRGBASuffix: IMap<boolean> = <IMap<boolean>>{};

    let pSTSuffix: IMap<boolean> = <IMap<boolean>>{};
    let pSTPSuffix: IMap<boolean> = <IMap<boolean>>{};
    let pSTPQSuffix: IMap<boolean> = <IMap<boolean>>{};

    generateSuffixLiterals(['x', 'y'], pXYSuffix);
    generateSuffixLiterals(['x', 'y', 'z'], pXYZSuffix);
    generateSuffixLiterals(['x', 'y', 'z', 'w'], pXYZWSuffix);

    generateSuffixLiterals(['r', 'g'], pRGSuffix);
    generateSuffixLiterals(['r', 'g', 'b'], pRGBSuffix);
    generateSuffixLiterals(['r', 'g', 'b', 'a'], pRGBASuffix);

    generateSuffixLiterals(['s', 't'], pSTSuffix);
    generateSuffixLiterals(['s', 't', 'p'], pSTPSuffix);
    generateSuffixLiterals(['s', 't', 'p', 'q'], pSTPQSuffix);

    let pFloat: ITypeInstruction = getSystemType('float');
    let pInt: ITypeInstruction = getSystemType('number');
    let pBool: ITypeInstruction = getSystemType('bool');

    let pFloat2: ITypeInstruction = generateSystemType('float2', 'vec2', 0, true, pFloat, 2);
    let pFloat3: ITypeInstruction = generateSystemType('float3', 'vec3', 0, true, pFloat, 3);
    let pFloat4: ITypeInstruction = generateSystemType('float4', 'vec4', 0, true, pFloat, 4);

    let pInt2: ITypeInstruction = generateSystemType('int2', 'ivec2', 0, true, pInt, 2);
    let pInt3: ITypeInstruction = generateSystemType('int3', 'ivec3', 0, true, pInt, 3);
    let pInt4: ITypeInstruction = generateSystemType('int4', 'ivec4', 0, true, pInt, 4);

    let pBool2: ITypeInstruction = generateSystemType('bool2', 'bvec2', 0, true, pBool, 2);
    let pBool3: ITypeInstruction = generateSystemType('bool3', 'bvec3', 0, true, pBool, 3);
    let pBool4: ITypeInstruction = generateSystemType('bool4', 'bvec4', 0, true, pBool, 4);

    addFieldsToVectorFromSuffixObject(pXYSuffix, pFloat2, 'float');
    addFieldsToVectorFromSuffixObject(pRGSuffix, pFloat2, 'float');
    addFieldsToVectorFromSuffixObject(pSTSuffix, pFloat2, 'float');

    addFieldsToVectorFromSuffixObject(pXYZSuffix, pFloat3, 'float');
    addFieldsToVectorFromSuffixObject(pRGBSuffix, pFloat3, 'float');
    addFieldsToVectorFromSuffixObject(pSTPSuffix, pFloat3, 'float');

    addFieldsToVectorFromSuffixObject(pXYZWSuffix, pFloat4, 'float');
    addFieldsToVectorFromSuffixObject(pRGBASuffix, pFloat4, 'float');
    addFieldsToVectorFromSuffixObject(pSTPQSuffix, pFloat4, 'float');

    addFieldsToVectorFromSuffixObject(pXYSuffix, pInt2, 'number');
    addFieldsToVectorFromSuffixObject(pRGSuffix, pInt2, 'number');
    addFieldsToVectorFromSuffixObject(pSTSuffix, pInt2, 'number');

    addFieldsToVectorFromSuffixObject(pXYZSuffix, pInt3, 'number');
    addFieldsToVectorFromSuffixObject(pRGBSuffix, pInt3, 'number');
    addFieldsToVectorFromSuffixObject(pSTPSuffix, pInt3, 'number');

    addFieldsToVectorFromSuffixObject(pXYZWSuffix, pInt4, 'number');
    addFieldsToVectorFromSuffixObject(pRGBASuffix, pInt4, 'number');
    addFieldsToVectorFromSuffixObject(pSTPQSuffix, pInt4, 'number');

    addFieldsToVectorFromSuffixObject(pXYSuffix, pBool2, 'bool');
    addFieldsToVectorFromSuffixObject(pRGSuffix, pBool2, 'bool');
    addFieldsToVectorFromSuffixObject(pSTSuffix, pBool2, 'bool');

    addFieldsToVectorFromSuffixObject(pXYZSuffix, pBool3, 'bool');
    addFieldsToVectorFromSuffixObject(pRGBSuffix, pBool3, 'bool');
    addFieldsToVectorFromSuffixObject(pSTPSuffix, pBool3, 'bool');

    addFieldsToVectorFromSuffixObject(pXYZWSuffix, pBool4, 'bool');
    addFieldsToVectorFromSuffixObject(pRGBASuffix, pBool4, 'bool');
    addFieldsToVectorFromSuffixObject(pSTPQSuffix, pBool4, 'bool');
}


function addSystemTypeMatrix(): void {
    let pFloat2: ITypeInstruction = getSystemType('float2');
    let pFloat3: ITypeInstruction = getSystemType('float3');
    let pFloat4: ITypeInstruction = getSystemType('float4');

    let pInt2: ITypeInstruction = getSystemType('int2');
    let pInt3: ITypeInstruction = getSystemType('int3');
    let pInt4: ITypeInstruction = getSystemType('int4');

    let pBool2: ITypeInstruction = getSystemType('bool2');
    let pBool3: ITypeInstruction = getSystemType('bool3');
    let pBool4: ITypeInstruction = getSystemType('bool4');

    generateSystemType('float2x2', 'mat2', 0, true, pFloat2, 2);
    generateSystemType('float2x3', 'mat2x3', 0, true, pFloat2, 3);
    generateSystemType('float2x4', 'mat2x4', 0, true, pFloat2, 4);

    generateSystemType('float3x2', 'mat3x2', 0, true, pFloat3, 2);
    generateSystemType('float3x3', 'mat3', 0, true, pFloat3, 3);
    generateSystemType('float3x4', 'mat3x4', 0, true, pFloat3, 4);

    generateSystemType('float4x2', 'mat4x2', 0, true, pFloat4, 2);
    generateSystemType('float4x3', 'mat4x3', 0, true, pFloat4, 3);
    generateSystemType('float4x4', 'mat4', 0, true, pFloat4, 4);

    generateSystemType('int2x2', 'imat2', 0, true, pInt2, 2);
    generateSystemType('int2x3', 'imat2x3', 0, true, pInt2, 3);
    generateSystemType('int2x4', 'imat2x4', 0, true, pInt2, 4);

    generateSystemType('int3x2', 'imat3x2', 0, true, pInt3, 2);
    generateSystemType('int3x3', 'imat3', 0, true, pInt3, 3);
    generateSystemType('int3x4', 'imat3x4', 0, true, pInt3, 4);

    generateSystemType('int4x2', 'imat4x2', 0, true, pInt4, 2);
    generateSystemType('int4x3', 'imat4x3', 0, true, pInt4, 3);
    generateSystemType('int4x4', 'imat4', 0, true, pInt4, 4);

    generateSystemType('bool2x2', 'bmat2', 0, true, pBool2, 2);
    generateSystemType('bool2x3', 'bmat2x3', 0, true, pBool2, 3);
    generateSystemType('bool2x4', 'bmat2x4', 0, true, pBool2, 4);

    generateSystemType('bool3x2', 'bmat3x2', 0, true, pBool3, 2);
    generateSystemType('bool3x3', 'bmat3', 0, true, pBool3, 3);
    generateSystemType('bool3x4', 'bmat3x4', 0, true, pBool3, 4);

    generateSystemType('bool4x2', 'bmat4x2', 0, true, pBool4, 2);
    generateSystemType('bool4x3', 'bmat4x3', 0, true, pBool4, 3);
    generateSystemType('bool4x4', 'bmat4', 0, true, pBool4, 4);
}


function generateBaseVertexOutput(): void {
    //TODO: fix defenition of this variables

    let pOutBasetype: ComplexTypeInstruction = new ComplexTypeInstruction(null);

    let pPosition: VariableDeclInstruction = new VariableDeclInstruction(null);
    let pPointSize: VariableDeclInstruction = new VariableDeclInstruction(null);
    let pPositionType: VariableTypeInstruction = new VariableTypeInstruction(null);
    let pPointSizeType: VariableTypeInstruction = new VariableTypeInstruction(null);
    let pPositionId: IdInstruction = new IdInstruction(null);
    let pPointSizeId: IdInstruction = new IdInstruction(null);

    pPositionType.pushType(getSystemType('float4'));
    pPointSizeType.pushType(getSystemType('float'));

    pPositionId.name = ('pos');
    pPositionId.realName = ('POSITION');

    pPointSizeId.name = ('psize');
    pPointSizeId.realName = ('PSIZE');

    pPosition.push(pPositionType, true);
    pPosition.push(pPositionId, true);

    pPointSize.push(pPointSizeType, true);
    pPointSize.push(pPointSizeId, true);

    pPosition.semantics = ('POSITION');
    pPointSize.semantics = ('PSIZE');

    let pFieldCollector: IInstruction = new InstructionCollector();
    pFieldCollector.push(pPosition, false);
    pFieldCollector.push(pPointSize, false);

    pOutBasetype.addFields(pFieldCollector, true);

    pOutBasetype.name = ('VS_OUT');
    pOutBasetype.realName = ('VS_OUT_S');

    systemVertexOut = pOutBasetype;
}


function generateSuffixLiterals(pLiterals: string[], pOutput: IMap<boolean>, iDepth: number = 0): void {
    if (iDepth >= pLiterals.length) {
        return;
    }

    if (iDepth === 0) {
        for (let i: number = 0; i < pLiterals.length; i++) {
            pOutput[pLiterals[i]] = true;
        }

        iDepth = 1;
    }

    const pOutputKeys: string[] = Object.keys(pOutput);

    for (let i: number = 0; i < pLiterals.length; i++) {
        for (let j: number = 0; j < pOutputKeys.length; j++) {
            if (pOutputKeys[j].indexOf(pLiterals[i]) !== -1) {
                pOutput[pOutputKeys[j] + pLiterals[i]] = false;
            }
            else {
                pOutput[pOutputKeys[j] + pLiterals[i]] = (pOutput[pOutputKeys[j]] === false) ? false : true;
            }
        }
    }

    iDepth++;

    generateSuffixLiterals(pLiterals, pOutput, iDepth);
}


export function getExternalType(pType: ITypeInstruction): any {
    if (pType.isEqual(getSystemType('number')) ||
        pType.isEqual(getSystemType('float'))) {
        return Number;
    }
    else if (pType.isEqual(getSystemType('bool'))) {
        return 'Boolean';
    }
    else if (pType.isEqual(getSystemType('float2')) ||
        pType.isEqual(getSystemType('bool2')) ||
        pType.isEqual(getSystemType('int2'))) {
        return 'Vec2';
    }
    else if (pType.isEqual(getSystemType('float3')) ||
        pType.isEqual(getSystemType('bool3')) ||
        pType.isEqual(getSystemType('int3'))) {
        return 'Vec3';
    }
    else if (pType.isEqual(getSystemType('float4')) ||
        pType.isEqual(getSystemType('bool4')) ||
        pType.isEqual(getSystemType('int4'))) {
        return 'Vec4';
    }
    else if (pType.isEqual(getSystemType('float2x2')) ||
        pType.isEqual(getSystemType('bool2x2')) ||
        pType.isEqual(getSystemType('int2x2'))) {
        return 'Vec2';
    }
    else if (pType.isEqual(getSystemType('float3x3')) ||
        pType.isEqual(getSystemType('bool3x3')) ||
        pType.isEqual(getSystemType('int3x3'))) {
        return 'Mat3';
    }
    else if (pType.isEqual(getSystemType('float4x4')) ||
        pType.isEqual(getSystemType('bool4x4')) ||
        pType.isEqual(getSystemType('int4x4'))) {
        return 'Mat4';
    }
    else {
        return null;
    }
}

export function isMatrixType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('float2x2')) ||
        pType.isEqual(getSystemType('float3x3')) ||
        pType.isEqual(getSystemType('float4x4')) ||
        pType.isEqual(getSystemType('int2x2')) ||
        pType.isEqual(getSystemType('int3x3')) ||
        pType.isEqual(getSystemType('int4x4')) ||
        pType.isEqual(getSystemType('bool2x2')) ||
        pType.isEqual(getSystemType('bool3x3')) ||
        pType.isEqual(getSystemType('bool4x4'));
}

export function isVectorType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('float2')) ||
        pType.isEqual(getSystemType('float3')) ||
        pType.isEqual(getSystemType('float4')) ||
        pType.isEqual(getSystemType('bool2')) ||
        pType.isEqual(getSystemType('bool3')) ||
        pType.isEqual(getSystemType('bool4')) ||
        pType.isEqual(getSystemType('int2')) ||
        pType.isEqual(getSystemType('int3')) ||
        pType.isEqual(getSystemType('int4'));
}

export function isScalarType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('bool')) ||
        pType.isEqual(getSystemType('number')) ||
        pType.isEqual(getSystemType('float'));
}

export function isFloatBasedType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('float')) ||
        pType.isEqual(getSystemType('float2')) ||
        pType.isEqual(getSystemType('float3')) ||
        pType.isEqual(getSystemType('float4')) ||
        pType.isEqual(getSystemType('float2x2')) ||
        pType.isEqual(getSystemType('float3x3')) ||
        pType.isEqual(getSystemType('float4x4'));
}

export function isIntBasedType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('number')) ||
        pType.isEqual(getSystemType('int2')) ||
        pType.isEqual(getSystemType('int3')) ||
        pType.isEqual(getSystemType('int4')) ||
        pType.isEqual(getSystemType('int2x2')) ||
        pType.isEqual(getSystemType('int3x3')) ||
        pType.isEqual(getSystemType('int4x4'));
}

export function isBoolBasedType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('bool')) ||
        pType.isEqual(getSystemType('bool2')) ||
        pType.isEqual(getSystemType('bool3')) ||
        pType.isEqual(getSystemType('bool4')) ||
        pType.isEqual(getSystemType('bool2x2')) ||
        pType.isEqual(getSystemType('bool3x3')) ||
        pType.isEqual(getSystemType('bool4x4'));
}

export function isSamplerType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('sampler')) ||
        pType.isEqual(getSystemType('sampler2D')) ||
        pType.isEqual(getSystemType('samplerCUBE')) ||
        pType.isEqual(getSystemType('video_buffer'));
}


function generateSystemFunction(name: string, sTranslationExpr: string,
    sReturnTypeName: string,
    pArgumentsTypes: string[],
    pTemplateTypes: string[],
    isForVertex: boolean = true, isForPixel: boolean = true): void {

    var pExprTranslator: ExprTemplateTranslator = new ExprTemplateTranslator(sTranslationExpr);
    var pSystemFunctions: IMap<SystemFunctionInstruction[]> = systemFunctionsMap;
    var pTypes: ITypeInstruction[] = null;
    var sFunctionHash: string = "";
    var pReturnType: ITypeInstruction = null;
    var pFunction: SystemFunctionInstruction = null;

    if (!isNull(pTemplateTypes)) {
        for (var i: number = 0; i < pTemplateTypes.length; i++) {
            pTypes = [];
            sFunctionHash = name + "(";
            pReturnType = (sReturnTypeName === TEMPLATE_TYPE) ?
                getSystemType(pTemplateTypes[i]) :
                getSystemType(sReturnTypeName);


            for (var j: number = 0; j < pArgumentsTypes.length; j++) {
                if (pArgumentsTypes[j] === TEMPLATE_TYPE) {
                    pTypes.push(getSystemType(pTemplateTypes[i]));
                    sFunctionHash += pTemplateTypes[i] + ",";
                }
                else {
                    pTypes.push(getSystemType(pArgumentsTypes[j]));
                    sFunctionHash += pArgumentsTypes[j] + ","
                }
            }

            sFunctionHash += ")";

            if (systemFunctionHashMap[sFunctionHash]) {
                _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: sFunctionHash });
            }

            pFunction = new SystemFunctionInstruction(name, pReturnType, pExprTranslator, pTypes);

            if (!isDef(pSystemFunctions[name])) {
                pSystemFunctions[name] = [];
            }

            pFunction.vertex = (isForVertex);
            pFunction.pixel = (isForPixel);

            pSystemFunctions[name].push(pFunction);
            pFunction.builtIn = (true);
        }
    }
    else {

        if (sReturnTypeName === TEMPLATE_TYPE) {
            logger.critical("Bad return type(TEMPLATE_TYPE) for system function '" + name + "'.");
        }

        pReturnType = getSystemType(sReturnTypeName);
        pTypes = [];
        sFunctionHash = name + "(";

        for (var i: number = 0; i < pArgumentsTypes.length; i++) {
            if (pArgumentsTypes[i] === TEMPLATE_TYPE) {
                logger.critical("Bad argument type(TEMPLATE_TYPE) for system function '" + name + "'.");
            }
            else {
                pTypes.push(getSystemType(pArgumentsTypes[i]));
                sFunctionHash += pArgumentsTypes[i] + ",";
            }
        }

        sFunctionHash += ")";

        if (systemFunctionHashMap[sFunctionHash]) {
            _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: sFunctionHash });
        }

        pFunction = new SystemFunctionInstruction(name, pReturnType, pExprTranslator, pTypes);

        pFunction.vertex = (isForVertex);
        pFunction.pixel = (isForPixel);

        if (!isDef(pSystemFunctions[name])) {
            pSystemFunctions[name] = [];
        }

        pSystemFunctions[name].push(pFunction);
        pFunction.builtIn = (true);
    }

}


// function generateNotBuiltInSystemFuction(name: string, sDefenition: string, sImplementation: string,
//     sReturnType: string,
//     pUsedTypes: string[],
//     pUsedFunctions: string[]): void {

//     if (isDef(systemFunctionsMap[name])) {
//         return;
//     }

//     let pReturnType: ITypeInstruction = getSystemType(sReturnType);
//     let pFunction: SystemFunctionInstruction = new SystemFunctionInstruction(name, pReturnType, null, null);

//     pFunction.definition = sDefenition;
//     pFunction.implementaion = sImplementation;

//     let pUsedExtSystemTypes: ITypeDeclInstruction[] = [];
//     let pUsedExtSystemFunctions: IFunctionDeclInstruction[] = [];

//     if (!isNull(pUsedTypes)) {
//         for (let i: number = 0; i < pUsedTypes.length; i++) {
//             let pTypeDecl: ITypeDeclInstruction = <ITypeDeclInstruction>getSystemType(pUsedTypes[i]).parent;
//             if (!isNull(pTypeDecl)) {
//                 pUsedExtSystemTypes.push(pTypeDecl);
//             }
//         }
//     }

//     if (!isNull(pUsedFunctions)) {
//         for (let i: number = 0; i < pUsedFunctions.length; i++) {
//             let pFindFunction: IFunctionDeclInstruction = findSystemFunction(pUsedFunctions[i], null);
//             pUsedExtSystemFunctions.push(pFindFunction);
//         }
//     }

//     pFunction.setUsedSystemData(pUsedExtSystemTypes, pUsedExtSystemFunctions);
//     pFunction.closeSystemDataInfo();
//     pFunction.builtIn = (false);

//     systemFunctionsMap[name] = [pFunction];
// }


function addSystemFunctions(): void {
    generateSystemFunction('dot', 'dot($1,$2)', 'float', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('mul', '$1*$2', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'number', 'float2', 'float3', 'float4']);
    generateSystemFunction('mod', 'mod($1,$2)', 'float', ['float', 'float'], null);
    generateSystemFunction('floor', 'floor($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('ceil', 'ceil($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('fract', 'fract($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('abs', 'abs($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('sign', 'sign($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('normalize', 'normalize($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('length', 'length($1)', 'float', [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('cross', 'cross($1, $2)', 'float3', ['float3', 'float3'], null);
    generateSystemFunction('reflect', 'reflect($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('max', 'max($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('max', 'max($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

    generateSystemFunction('min', 'min($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('min', 'min($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

    generateSystemFunction('mix', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('mix', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

    generateSystemFunction('clamp', 'clamp($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('clamp', 'clamp($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float', 'float'], ['float2', 'float3', 'float4']);

    generateSystemFunction('pow', 'pow($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('mod', 'mod($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'float3', 'float4']);
    generateSystemFunction('mod', 'mod($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);
    generateSystemFunction('exp', 'exp($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('exp2', 'exp2($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('log', 'log($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('log2', 'log2($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('inversesqrt', 'inversesqrt($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('sqrt', 'sqrt($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

    generateSystemFunction('all', 'all($1)', 'bool', [TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);
    generateSystemFunction('any', 'any($1)', 'bool', [TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);
    generateSystemFunction('not', 'not($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);

    generateSystemFunction('distance', 'distance($1,$2)', 'float', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

    generateSystemFunction('lessThan', 'lessThan($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
    generateSystemFunction('lessThan', 'lessThan($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
    generateSystemFunction('lessThan', 'lessThan($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);

    generateSystemFunction('lessThanEqual', 'lessThanEqual($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
    generateSystemFunction('lessThanEqual', 'lessThanEqual($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
    generateSystemFunction('lessThanEqual', 'lessThanEqual($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);

    generateSystemFunction('equal', 'equal($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
    generateSystemFunction('equal', 'equal($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
    generateSystemFunction('equal', 'equal($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);
    generateSystemFunction('equal', 'equal($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);

    generateSystemFunction('notEqual', 'notEqual($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
    generateSystemFunction('notEqual', 'notEqual($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
    generateSystemFunction('notEqual', 'notEqual($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);
    generateSystemFunction('notEqual', 'notEqual($1,$2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['bool2', 'bool3', 'bool4']);

    generateSystemFunction('greaterThan', 'greaterThan($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
    generateSystemFunction('greaterThan', 'greaterThan($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
    generateSystemFunction('greaterThan', 'greaterThan($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);

    generateSystemFunction('greaterThanEqual', 'greaterThanEqual($1,$2)', 'bool2', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float2', 'int2']);
    generateSystemFunction('greaterThanEqual', 'greaterThanEqual($1,$2)', 'bool3', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float3', 'int3']);
    generateSystemFunction('greaterThanEqual', 'greaterThanEqual($1,$2)', 'bool4', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float4', 'int4']);


    generateSystemFunction('radians', 'radians($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('degrees', 'degrees($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('sin', 'sin($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('cos', 'cos($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('tan', 'tan($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('asin', 'asin($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('acos', 'acos($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('atan', 'atan($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('atan', 'atan($1, $2)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);

    generateSystemFunction('tex2D', 'texture2D($1,$2)', 'float4', ['sampler', 'float2'], null);
    generateSystemFunction('tex2D', 'texture2D($1,$2)', 'float4', ['sampler2D', 'float2'], null);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler', 'float3'], null);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler2D', 'float3'], null);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler', 'float4'], null);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2)', 'float4', ['sampler2D', 'float4'], null);
    generateSystemFunction('texCUBE', 'textureCube($1,$2)', 'float4', ['sampler', 'float3'], null);
    generateSystemFunction('texCUBE', 'textureCube($1,$2)', 'float4', ['samplerCUBE', 'float3'], null);

    generateSystemFunction('tex2D', 'texture2D($1,$2,$3)', 'float4', ['sampler', 'float2', 'float'], null, false, true);
    generateSystemFunction('tex2D', 'texture2D($1,$2,$3)', 'float4', ['sampler2D', 'float2', 'float'], null, false, true);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, false, true);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler2D', 'float3', 'float'], null, false, true);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler', 'float4', 'float'], null, false, true);
    generateSystemFunction('tex2DProj', 'texture2DProj($1,$2,$3)', 'float4', ['sampler2D', 'float4', 'float'], null, false, true);
    generateSystemFunction('texCUBE', 'textureCube($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, false, true);
    generateSystemFunction('texCUBE', 'textureCube($1,$2,$3)', 'float4', ['samplerCUBE', 'float3', 'float'], null, false, true);

    generateSystemFunction('tex2DLod', 'texture2DLod($1,$2,$3)', 'float4', ['sampler', 'float2', 'float'], null, true, false);
    generateSystemFunction('tex2DLod', 'texture2DLod($1,$2,$3)', 'float4', ['sampler2D', 'float2', 'float'], null, true, false);
    generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, true, false);
    generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler2D', 'float3', 'float'], null, true, false);
    generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler', 'float4', 'float'], null, true, false);
    generateSystemFunction('tex2DProjLod', 'texture2DProjLod($1,$2,$3)', 'float4', ['sampler2D', 'float4', 'float'], null, true, false);
    generateSystemFunction('texCUBELod', 'textureCubeLod($1,$2,$3)', 'float4', ['sampler', 'float3', 'float'], null, true, false);
    generateSystemFunction('texCUBELod', 'textureCubeLod($1,$2,$3)', 'float4', ['samplerCUBE', 'float3', 'float'], null, true, false);

    //OES_standard_derivatives

    generateSystemFunction('dFdx', 'dFdx($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('dFdy', 'dFdy($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('width', 'width($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('fwidth', 'fwidth($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    // generateSystemFunction("smoothstep", "smoothstep($1, $2, $3)", "float3", ["float3", "float3", "float3"], null);
    generateSystemFunction('smoothstep', 'smoothstep($1, $2, $3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('smoothstep', 'smoothstep($1, $2, $3)', TEMPLATE_TYPE, ['float', 'float', TEMPLATE_TYPE], ['float2', 'float3', 'float4']);

    generateSystemFunction('frac', 'fract($1)', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('lerp', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('lerp', 'mix($1,$2,$3)', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, 'float'], ['float2', 'float3', 'float4']);

    generateSystemFunction('saturate', 'max(0., min(1., $1))', TEMPLATE_TYPE, [TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
}


function initSystemTypes(): void {
    console.assert(isNull(systemTypes));

    addSystemTypeScalar();
    addSystemTypeVector();
    addSystemTypeMatrix();

    generateBaseVertexOutput();
}


function initSystemFunctions(): void {
    console.assert(isNull(systemFunctionsMap));
    addSystemFunctions();
}


function generateSystemVariable(name: string, realName: string, sTypeName: string,
    isForVertex: boolean, isForPixel: boolean, isOnlyRead: boolean): void {

    if (isDef(systemVariables[name])) {
        return;
    }

    let pVariableDecl: IVariableDeclInstruction = new VariableDeclInstruction(null);
    let pName: IIdInstruction = new IdInstruction(null);
    let pType: IVariableTypeInstruction = new VariableTypeInstruction(null);

    pName.name = name;
    pName.realName = (realName);

    pType.pushType(getSystemType(sTypeName));

    if (isOnlyRead) {
        pType.writable = (false);
    }

    pVariableDecl.vertex = (isForVertex);
    pVariableDecl.pixel = (isForPixel);

    pVariableDecl.push(pType, true);
    pVariableDecl.push(pName, true);

    systemVariables[name] = pVariableDecl;

    pVariableDecl.builtIn = (true);
}


function addSystemVariables(): void {
    generateSystemVariable('fragColor', 'gl_FragColor', 'float4', false, true, true);
    generateSystemVariable('fragCoord', 'gl_FragCoord', 'float4', false, true, true);
    generateSystemVariable('frontFacing', 'gl_FrontFacing', 'bool', false, true, true);
    generateSystemVariable('pointCoord', 'gl_PointCoord', 'float2', false, true, true);
    generateSystemVariable('resultColor', 'resultColor', 'float4', false, true, true);
}


function initSystemVariables(): void {
    console.assert(isNull(systemVariables))
    addSystemVariables();
}


function findSystemFunction(sFunctionName: string,
    pArguments: ITypedInstruction[]): IFunctionDeclInstruction {
    let pSystemFunctions: SystemFunctionInstruction[] = systemFunctionsMap[sFunctionName];

    if (!isDef(pSystemFunctions)) {
        return null;
    }

    if (isNull(pArguments)) {
        for (let i: number = 0; i < pSystemFunctions.length; i++) {
            if (pSystemFunctions[i].numArgsRequired === 0) {
                return <IFunctionDeclInstruction>pSystemFunctions[i];
            }
        }
    }

    for (let i: number = 0; i < pSystemFunctions.length; i++) {
        if (pArguments.length !== pSystemFunctions[i].numArgsRequired) {
            continue;
        }

        let pTestedArguments: ITypedInstruction[] = pSystemFunctions[i].arguments;

        let isOk: boolean = true;

        for (let j: number = 0; j < pArguments.length; j++) {
            isOk = false;

            if (!pArguments[j].type.isEqual(pTestedArguments[j].type)) {
                break;
            }

            isOk = true;
        }

        if (isOk) {
            return <IFunctionDeclInstruction>pSystemFunctions[i];
        }
    }
    return null;
}


function findFunction(scope: ProgramScope, sFunctionName: string,
    pArguments: IExprInstruction[]): IFunctionDeclInstruction;
function findFunction(scope: ProgramScope, sFunctionName: string,
    pArguments: IVariableDeclInstruction[]): IFunctionDeclInstruction;
function findFunction(scope: ProgramScope, sFunctionName: string,
    pArguments: ITypedInstruction[]): IFunctionDeclInstruction {
    return findSystemFunction(sFunctionName, pArguments) ||
        scope.getFunction(sFunctionName, pArguments);
}


function findConstructor(pType: ITypeInstruction,
    pArguments: IExprInstruction[]): IVariableTypeInstruction {

    let pVariableType: IVariableTypeInstruction = new VariableTypeInstruction(null);
    pVariableType.pushType(pType);

    return pVariableType;
}


function findShaderFunction(scope: ProgramScope, sFunctionName: string,
    pArguments: IExprInstruction[]): IFunctionDeclInstruction {
    return scope.getShaderFunction(sFunctionName, pArguments);
}


function findFunctionByDef(scope: ProgramScope, pDef: FunctionDefInstruction): IFunctionDeclInstruction {
    return findFunction(scope, pDef.name, pDef.arguments);
}


export function getBaseVertexOutType(): ComplexTypeInstruction {
    return systemVertexOut;
}


export function getSystemType(sTypeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    return systemTypes[sTypeName] || null;
}


export function getSystemVariable(name: string): IVariableDeclInstruction {
    return systemVariables[name] || null;
}


function getVariable(scope: ProgramScope, name: string): IVariableDeclInstruction {
    return getSystemVariable(name) || scope.getVariable(name);
}


function getType(scope: ProgramScope, sTypeName: string): ITypeInstruction {
    return getSystemType(sTypeName) || scope.getType(sTypeName);
}


function isSystemFunction(pFunction: IFunctionDeclInstruction): boolean {
    return false;
}


function isSystemVariable(pVariable: IVariableDeclInstruction): boolean {
    return false;
}


function isSystemType(pType: ITypeDeclInstruction): boolean {
    return false;
}






function _error(context: Context, node: IParseNode, eCode: number, pInfo: IEffectErrorInfo = {}): void {
    let pLocation: ISourceLocation = <ISourceLocation>{ file: context? context.analyzedFileName: null, line: 0 };
    let pLineColumn: { line: number; column: number; } = getNodeSourceLocation(node);

    switch (eCode) {
        default:
            pInfo.line = pLineColumn.line + 1;
            pInfo.column = pLineColumn.column + 1;

            pLocation.line = pLineColumn.line + 1;

            break;
    }

    let pLogEntity: ILoggerEntity = <ILoggerEntity>{
        code: eCode,
        info: pInfo,
        location: pLocation
    };

    logger.critical(pLogEntity);
    //throw new Error(eCode.toString());
}


function analyzeUseDecl(context: Context, scope: ProgramScope, node: IParseNode): void {
    scope.useStrictMode();
}


function analyzeComplexName(node: IParseNode): string {
    const pChildren: IParseNode[] = node.children;
    let name: string = '';

    for (let i: number = pChildren.length - 1; i >= 0; i--) {
        name += pChildren[i].value;
    }

    return name;
}


function analyzeGlobalUseDecls(context: Context, scope: ProgramScope, pTree: IParseTree): void {
    let pChildren: IParseNode[] = pTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'UseDecl') {
            analyzeUseDecl(context, scope, pChildren[i]); // << always 'use strict' by default!
        }
    }
}


function analyzeProvideDecl(context: Context, node: IParseNode): void {
    const pChildren: IParseNode[] = node.children;

    if (pChildren.length === 2) {
        context.provideNameSpace = analyzeComplexName(pChildren[0]);
    }
    else {
        _error(context, node, EEffectTempErrors.UNSUPPORTED_PROVIDE_AS);
        return;
    }
}


function analyzeGlobalProvideDecls(context: Context, scope: ProgramScope, pTree: IParseTree): void {
    let pChildren: IParseNode[] = pTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'ProvideDecl') {
            analyzeProvideDecl(context, pChildren[i]);
        }
    }
}


function analyzeInitExpr(context: Context, scope: ProgramScope, node: IParseNode): IInitExprInstruction {
    let pChildren: IParseNode[] = node.children;
    let pInitExpr: IInitExprInstruction = new InitExprInstruction(node);

    if (pChildren.length === 1) {
        pInitExpr.push(analyzeExpr(context, scope, pChildren[0]), true);
    }
    else {
        for (let i: number = 0; i < pChildren.length; i++) {
            if (pChildren[i].name === 'InitExpr') {
                pInitExpr.push(analyzeInitExpr(context, scope, pChildren[i]), true);
            }
        }
    }

    return pInitExpr;
}



function _errorFromInstruction(context: Context, node: IParseNode, pError: IInstructionError): void {
    _error(context, node, pError.code, isNull(pError.info) ? {} : pError.info);
}


function checkInstruction(context: Context, pInst: IInstruction, eStage: ECheckStage): void {
    if (!pInst._check(eStage)) {
        _errorFromInstruction(context, pInst.sourceNode, pInst._getLastError());
    }
}


function addVariableDecl(context: Context, scope: ProgramScope, pVariable: IVariableDeclInstruction): void {
    if (isSystemVariable(pVariable)) {
        _error(context, pVariable.sourceNode, EEffectErrors.REDEFINE_SYSTEM_VARIABLE, { varName: pVariable.name });
    }

    let isVarAdded: boolean = scope.addVariable(pVariable);

    if (!isVarAdded) {
        let eScopeType: EScopeType = scope.type;

        switch (eScopeType) {
            case EScopeType.k_Default:
                _error(context, pVariable.sourceNode, EEffectErrors.REDEFINE_VARIABLE, { varName: pVariable.name });
                break;
            case EScopeType.k_Struct:
                _error(context, pVariable.sourceNode, EEffectErrors.BAD_NEW_FIELD_FOR_STRUCT_NAME, { fieldName: pVariable.name });
                break;
            case EScopeType.k_Annotation:
                _error(context, pVariable.sourceNode, EEffectErrors.BAD_NEW_ANNOTATION_VAR, { varName: pVariable.name });
                break;
        }
    }
}


function addTypeDecl(context: Context, scope: ProgramScope, pType: ITypeDeclInstruction): void {
    if (isSystemType(pType)) {
        _error(context, pType.sourceNode, EEffectErrors.REDEFINE_SYSTEM_TYPE, { typeName: pType.name });
    }

    let isTypeAdded: boolean = scope.addType(pType);

    if (!isTypeAdded) {
        _error(context, pType.sourceNode, EEffectErrors.REDEFINE_TYPE, { typeName: pType.name });
    }
}


function addFunctionDecl(context: Context, scope: ProgramScope, node: IParseNode, pFunction: IFunctionDeclInstruction): void {
    if (isSystemFunction(pFunction)) {
        _error(context, node, EEffectErrors.REDEFINE_SYSTEM_FUNCTION, { funcName: pFunction.name });
    }

    let isFunctionAdded: boolean = scope.addFunction(pFunction);

    if (!isFunctionAdded) {
        _error(context, node, EEffectErrors.REDEFINE_FUNCTION, { funcName: pFunction.name });
    }
}


function addTechnique(context: Context, scope: ProgramScope, pTechnique: ITechniqueInstruction): void {
    let name: string = pTechnique.name;

    if (isDef(context.techniqueMap[name])) {
        _error(context, pTechnique.sourceNode, EEffectErrors.BAD_TECHNIQUE_REDEFINE_NAME, { techName: name });
        return;
    }

    context.techniqueMap[name] = pTechnique;
}


function checkFunctionsForRecursion(context: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = context.functionWithImplementationList;
    let isNewAdd: boolean = true;
    let isNewDelete: boolean = true;

    while (isNewAdd || isNewDelete) {
        isNewAdd = false;
        isNewDelete = false;

        mainFor:
        for (let i: number = 0; i < pFunctionList.length; i++) {
            let pTestedFunction: IFunctionDeclInstruction = pFunctionList[i];
            let pUsedFunctionList: IFunctionDeclInstruction[] = pTestedFunction.usedFunctionList;

            if (!pTestedFunction.isUsed()) {
                //logger.warn("Unused function '" + pTestedFunction.stringDef + "'.");
                continue mainFor;
            }
            if (pTestedFunction.isBlackListFunction()) {
                continue mainFor;
            }

            if (isNull(pUsedFunctionList)) {
                continue mainFor;
            }

            for (let j: number = 0; j < pUsedFunctionList.length; j++) {
                let pAddedUsedFunctionList: IFunctionDeclInstruction[] = pUsedFunctionList[j].usedFunctionList;

                if (isNull(pAddedUsedFunctionList)) {
                    continue;
                }

                for (let k: number = 0; k < pAddedUsedFunctionList.length; k++) {
                    let pAddedFunction: IFunctionDeclInstruction = pAddedUsedFunctionList[k];
                    let node = pAddedFunction.sourceNode;

                    if (pTestedFunction === pAddedFunction) {
                        pTestedFunction.addToBlackList();
                        isNewDelete = true;
                        _error(context, node, EEffectErrors.BAD_FUNCTION_USAGE_RECURSION, { funcDef: pTestedFunction.stringDef });
                        continue mainFor;
                    }

                    if (pAddedFunction.isBlackListFunction() ||
                        !pAddedFunction.canUsedAsFunction()) {
                        pTestedFunction.addToBlackList();
                        _error(context, node, EEffectErrors.BAD_FUNCTION_USAGE_BLACKLIST, { funcDef: pTestedFunction.stringDef });
                        isNewDelete = true;
                        continue mainFor;
                    }

                    if (pTestedFunction.addUsedFunction(pAddedFunction)) {
                        isNewAdd = true;
                    }
                }
            }
        }
    }
}


function checkFunctionForCorrectUsage(context: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = context.functionWithImplementationList;
    let isNewUsageSet: boolean = true;
    let isNewDelete: boolean = true;

    while (isNewUsageSet || isNewDelete) {
        isNewUsageSet = false;
        isNewDelete = false;

        mainFor:
        for (let i: number = 0; i < pFunctionList.length; i++) {
            let pTestedFunction: IFunctionDeclInstruction = pFunctionList[i];
            let pUsedFunctionList: IFunctionDeclInstruction[] = pTestedFunction.usedFunctionList;

            if (!pTestedFunction.isUsed()) {
                //logger.warn("Unused function '" + pTestedFunction.stringDef + "'.");
                continue mainFor;
            }
            if (pTestedFunction.isBlackListFunction()) {
                continue mainFor;
            }

            if (!pTestedFunction.checkVertexUsage()) {
                _error(context, pTestedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction.stringDef });
                pTestedFunction.addToBlackList();
                isNewDelete = true;
                continue mainFor;
            }

            if (!pTestedFunction.checkPixelUsage()) {
                _error(context, pTestedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction.stringDef });
                pTestedFunction.addToBlackList();
                isNewDelete = true;
                continue mainFor;
            }

            if (isNull(pUsedFunctionList)) {
                continue mainFor;
            }

            for (let j: number = 0; j < pUsedFunctionList.length; j++) {
                let pUsedFunction: IFunctionDeclInstruction = pUsedFunctionList[j];

                if (pTestedFunction.isUsedInVertex()) {
                    if (!pUsedFunction.vertex) {
                        _error(context, pUsedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction.stringDef });
                        pTestedFunction.addToBlackList();
                        isNewDelete = true;
                        continue mainFor;
                    }

                    if (!pUsedFunction.isUsedInVertex()) {
                        pUsedFunction.markUsedInVertex();
                        isNewUsageSet = true;
                    }

                }

                if (pTestedFunction.isUsedInPixel()) {
                    if (!pUsedFunction.pixel) {
                        _error(context, pUsedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction.stringDef });
                        pTestedFunction.addToBlackList();
                        isNewDelete = true;
                        continue mainFor;
                    }

                    if (!pUsedFunction.isUsedInPixel()) {
                        pUsedFunction.markUsedInPixel();
                        isNewUsageSet = true;
                    }
                }
            }
        }
    }
}


function generateInfoAboutUsedData(context: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = context.functionWithImplementationList;

    for (let i: number = 0; i < pFunctionList.length; i++) {
        pFunctionList[i].generateInfoAboutUsedData();
    }
}


function generateShadersFromFunctions(context: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = context.functionWithImplementationList;

    for (let i: number = 0; i < pFunctionList.length; i++) {

        if (pFunctionList[i].isUsedAsVertex()) {
            pFunctionList[i].convertToVertexShader();
        }
        if (pFunctionList[i].isUsedAsPixel()) {
            pFunctionList[i].convertToPixelShader();
        }

        if (pFunctionList[i]._isErrorOccured()) {
            _errorFromInstruction(context, pFunctionList[i].sourceNode, pFunctionList[i]._getLastError());
            pFunctionList[i]._clearError();
        }
    }
}





function getRenderState(sState: string): ERenderStates {
    let eType: ERenderStates = null;

    switch (sState) {
        case 'BLENDENABLE':
            eType = ERenderStates.BLENDENABLE;
            break;
        case 'CULLFACEENABLE':
            eType = ERenderStates.CULLFACEENABLE;
            break;
        case 'ZENABLE':
            eType = ERenderStates.ZENABLE;
            break;
        case 'ZWRITEENABLE':
            eType = ERenderStates.ZWRITEENABLE;
            break;
        case 'DITHERENABLE':
            eType = ERenderStates.DITHERENABLE;
            break;
        case 'SCISSORTESTENABLE':
            eType = ERenderStates.SCISSORTESTENABLE;
            break;
        case 'STENCILTESTENABLE':
            eType = ERenderStates.STENCILTESTENABLE;
            break;
        case 'POLYGONOFFSETFILLENABLE':
            eType = ERenderStates.POLYGONOFFSETFILLENABLE;
            break;
        case 'CULLFACE':
            eType = ERenderStates.CULLFACE;
            break;
        case 'FRONTFACE':
            eType = ERenderStates.FRONTFACE;
            break;

        case 'SRCBLENDCOLOR':
            eType = ERenderStates.SRCBLENDCOLOR;
            break;
        case 'DESTBLENDCOLOR':
            eType = ERenderStates.DESTBLENDCOLOR;
            break;
        case 'SRCBLENDALPHA':
            eType = ERenderStates.SRCBLENDALPHA;
            break;
        case 'DESTBLENDALPHA':
            eType = ERenderStates.DESTBLENDALPHA;
            break;

        case 'BLENDEQUATIONCOLOR':
            eType = ERenderStates.BLENDEQUATIONCOLOR;
            break;
        case 'BLENDEQUATIONALPHA':
            eType = ERenderStates.BLENDEQUATIONALPHA;
            break;

        case 'SRCBLEND':
            eType = ERenderStates.SRCBLEND;
            break;
        case 'DESTBLEND':
            eType = ERenderStates.DESTBLEND;
            break;
        case 'BLENDFUNC':
            eType = ERenderStates.BLENDFUNC;
            break;
        case 'BLENDFUNCSEPARATE':
            eType = ERenderStates.BLENDFUNCSEPARATE;
            break;

        case 'BLENDEQUATION':
            eType = ERenderStates.BLENDEQUATION;
            break;
        case 'BLENDEQUATIONSEPARATE':
            eType = ERenderStates.BLENDEQUATIONSEPARATE;
            break;

        case 'ZFUNC':
            eType = ERenderStates.ZFUNC;
            break;
        case 'ALPHABLENDENABLE':
            eType = ERenderStates.ALPHABLENDENABLE;
            break;
        case 'ALPHATESTENABLE':
            eType = ERenderStates.ALPHATESTENABLE;
            break;

        default:
            logger.warn('Unsupported render state type used: ' + sState + '. WebGl...');
            break;
    }

    return eType;
}


function getRenderStateValue(eState: ERenderStates, sValue: string): ERenderStateValues {
    let eValue: ERenderStateValues = ERenderStateValues.UNDEF;

    switch (eState) {
        case ERenderStates.ALPHABLENDENABLE:
        case ERenderStates.ALPHATESTENABLE:
            logger.warn('ALPHABLENDENABLE/ALPHATESTENABLE not supported in WebGL.');
            return ERenderStateValues.UNDEF;

        case ERenderStates.BLENDENABLE:
        case ERenderStates.CULLFACEENABLE:
        case ERenderStates.ZENABLE:
        case ERenderStates.ZWRITEENABLE:
        case ERenderStates.DITHERENABLE:
        case ERenderStates.SCISSORTESTENABLE:
        case ERenderStates.STENCILTESTENABLE:
        case ERenderStates.POLYGONOFFSETFILLENABLE:
            switch (sValue) {
                case 'TRUE':
                    eValue = ERenderStateValues.TRUE;
                    break;
                case 'FALSE':
                    eValue = ERenderStateValues.FALSE;
                    break;

                default:
                    logger.warn('Unsupported render state ALPHABLENDENABLE/ZENABLE/ZWRITEENABLE/DITHERENABLE value used: '
                        + sValue + '.');
                    return eValue;
            }
            break;

        case ERenderStates.CULLFACE:
            switch (sValue) {
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
                    logger.warn('Unsupported render state CULLFACE value used: ' + sValue + '.');
                    return eValue;
            }
            break;

        case ERenderStates.FRONTFACE:
            switch (sValue) {
                case 'CW':
                    eValue = ERenderStateValues.CW;
                    break;
                case 'CCW':
                    eValue = ERenderStateValues.CCW;
                    break;

                default:
                    logger.warn('Unsupported render state FRONTFACE value used: ' + sValue + '.');
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
            switch (sValue) {
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
                    logger.warn('Unsupported render state SRCBLEND/DESTBLEND value used: ' + sValue + '.');
                    return eValue;
            }
            break;

        case ERenderStates.BLENDEQUATION:
        case ERenderStates.BLENDEQUATIONSEPARATE:
        case ERenderStates.BLENDEQUATIONCOLOR:
        case ERenderStates.BLENDEQUATIONALPHA:
            switch (sValue) {
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
                    logger.warn('Unsupported render state BLENDEQUATION/BLENDEQUATIONSEPARATE value used: ' + sValue + '.');
                    return eValue;
            }
            break;

        case ERenderStates.ZFUNC:
            switch (sValue) {
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
                    logger.warn('Unsupported render state ZFUNC value used: ' +
                        sValue + '.');
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
 * @sOperator {string} Один из операторов: + - * / % += -= *= /= %= = < > <= >= == != =
 * @pLeftType {IVariableTypeInstruction} Тип левой части выражения
 * @pRightType {IVariableTypeInstruction} Тип правой части выражения
 */
function checkTwoOperandExprTypes(
    context: Context,
    sOperator: string,
    pLeftType: IVariableTypeInstruction,
    pRightType: IVariableTypeInstruction): IVariableTypeInstruction {

    const isComplex: boolean = pLeftType.isComplex() || pRightType.isComplex();
    const isArray: boolean = pLeftType.isNotBaseArray() || pRightType.isNotBaseArray();
    const isSampler: boolean = isSamplerType(pLeftType) || isSamplerType(pRightType);
    const pBoolType: IVariableTypeInstruction = getSystemType('bool').variableType;

    if (isArray || isSampler) {
        return null;
    }

    if (sOperator === '%' || sOperator === '%=') {
        return null;
    }

    if (isAssignmentOperator(sOperator)) {
        if (!pLeftType.writable) {
            _error(context, pLeftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        if (!pRightType.readable) {
            _error(context, pRightType.sourceNode,EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (sOperator !== '=' && !pLeftType.readable) {
            _error(context, pLeftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        }
    }
    else {
        if (!pLeftType.readable) {
            _error(context, pLeftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!pRightType.readable) {
            _error(context, pRightType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }
    }

    if (isComplex) {
        if (sOperator === '=' && pLeftType.isEqual(pRightType)) {
            return <IVariableTypeInstruction>pLeftType;
        }
        else if (isEqualOperator(sOperator) && !pLeftType.isContainArray() && !pLeftType.isContainSampler()) {
            return pBoolType;
        }
        else {
            return null;
        }
    }

    // let pReturnType: IVariableTypeInstruction = null;
    const pLeftBaseType: IVariableTypeInstruction = (<SystemTypeInstruction>pLeftType.baseType).variableType;
    const pRightBaseType: IVariableTypeInstruction = (<SystemTypeInstruction>pRightType.baseType).variableType;


    if (pLeftType.isConst() && isAssignmentOperator(sOperator)) {
        return null;
    }

    if (pLeftType.isEqual(pRightType)) {
        if (isArithmeticalOperator(sOperator)) {
            if (!isMatrixType(pLeftType) || (sOperator !== '/' && sOperator !== '/=')) {
                return pLeftBaseType;
            }
            else {
                return null;
            }
        }
        else if (isRelationalOperator(sOperator)) {
            if (isScalarType(pLeftType)) {
                return pBoolType;
            }
            else {
                return null;
            }
        }
        else if (isEqualOperator(sOperator)) {
            return pBoolType;
        }
        else if (sOperator === '=') {
            return pLeftBaseType;
        }
        else {
            return null;
        }

    }

    if (isArithmeticalOperator(sOperator)) {
        if (isBoolBasedType(pLeftType) || isBoolBasedType(pRightType) ||
            isFloatBasedType(pLeftType) !== isFloatBasedType(pRightType) ||
            isIntBasedType(pLeftType) !== isIntBasedType(pRightType)) {
            return null;
        }

        if (isScalarType(pLeftType)) {
            return pRightBaseType;
        }

        if (isScalarType(pRightType)) {
            return pLeftBaseType;
        }

        if (sOperator === '*' || sOperator === '*=') {
            if (isMatrixType(pLeftType) && isVectorType(pRightType) &&
                pLeftType.length === pRightType.length) {
                return pRightBaseType;
            }
            else if (isMatrixType(pRightType) && isVectorType(pLeftType) &&
                pLeftType.length === pRightType.length) {
                return pLeftBaseType;
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
 * @sOperator {string} Один из операторов: + - ! ++ --
 * @pLeftType {IVariableTypeInstruction} Тип операнда
 */
function checkOneOperandExprType(context: Context, node: IParseNode, sOperator: string,
    pType: IVariableTypeInstruction): IVariableTypeInstruction {

    const isComplex: boolean = pType.isComplex();
    const isArray: boolean = pType.isNotBaseArray();
    const isSampler: boolean = isSamplerType(pType);

    if (isComplex || isArray || isSampler) {
        return null;
    }

    if (!pType.readable) {
        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }


    if (sOperator === '++' || sOperator === '--') {
        if (!pType.writable) {
            _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        return pType;
    }

    if (sOperator === '!') {
        const pBoolType: IVariableTypeInstruction = getSystemType('bool').variableType;

        if (pType.isEqual(pBoolType)) {
            return pBoolType;
        }
        else {
            return null;
        }
    }
    else {
        if (isBoolBasedType(pType)) {
            return null;
        }
        else {
            return (<SystemTypeInstruction>pType.baseType).variableType;
        }
    }

    //return null;
}


function isAssignmentOperator(sOperator: string): boolean {
    return sOperator === '+=' || sOperator === '-=' ||
        sOperator === '*=' || sOperator === '/=' ||
        sOperator === '%=' || sOperator === '=';
}


function isArithmeticalOperator(sOperator: string): boolean {
    return sOperator === '+' || sOperator === '+=' ||
        sOperator === '-' || sOperator === '-=' ||
        sOperator === '*' || sOperator === '*=' ||
        sOperator === '/' || sOperator === '/=';
}


function isRelationalOperator(sOperator: string): boolean {
    return sOperator === '>' || sOperator === '>=' ||
        sOperator === '<' || sOperator === '<=';
}


function isEqualOperator(sOperator: string): boolean {
    return sOperator === '==' || sOperator === '!=';
}


function analyzeVariableDecl(context: Context, scope: ProgramScope, node: IParseNode, pInstruction: IInstruction = null): void {
    let pChildren: IParseNode[] = node.children;
    let pGeneralType: IVariableTypeInstruction = null;
    let pVariable: IVariableDeclInstruction = null;
    let i: number = 0;

    pGeneralType = analyzeUsageType(context, scope, pChildren[pChildren.length - 1]);

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'Variable') {
            pVariable = analyzeVariable(context, scope, pChildren[i], pGeneralType);

            if (!isNull(pInstruction)) {
                pInstruction.push(pVariable, true);
                if (pInstruction.instructionType === EInstructionTypes.k_DeclStmtInstruction) {
                    let pVariableSubDecls: IVariableDeclInstruction[] = pVariable.vars;
                    if (!isNull(pVariableSubDecls)) {
                        for (let j: number = 0; j < pVariableSubDecls.length; j++) {
                            pInstruction.push(pVariableSubDecls[j], false);
                        }
                    }
                }
            }
        }
    }
}


function analyzeUsageType(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {
    let pChildren: IParseNode[] = node.children;
    let i: number = 0;
    let pType: IVariableTypeInstruction = new VariableTypeInstruction(node);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'Type') {
            let pMainType: ITypeInstruction = analyzeType(context, scope, pChildren[i]);
            pType.pushType(pMainType);
        }
        else if (pChildren[i].name === 'Usage') {
            let sUsage: string = analyzeUsage(pChildren[i]);
            pType.addUsage(sUsage);
        }
    }

    checkInstruction(context, pType, ECheckStage.CODE_TARGET_SUPPORT);
    return pType;
}


function analyzeType(context: Context, scope: ProgramScope, node: IParseNode): ITypeInstruction {
    let pChildren: IParseNode[] = node.children;
    let pType: ITypeInstruction = null;

    switch (node.name) {
        case 'T_TYPE_ID':
            pType = getType(scope, node.value);

            if (isNull(pType)) {
                _error(context, node, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: node.value });
            }
            break;

        case 'Struct':
            pType = analyzeStruct(context, scope, node);
            break;

        case 'T_KW_VOID':
            pType = getSystemType('void');
            break;

        case 'ScalarType':
        case 'ObjectType':
            pType = getType(scope, pChildren[pChildren.length - 1].value);

            if (isNull(pType)) {
                _error(context, node, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: pChildren[pChildren.length - 1].value });
            }

            break;

        case 'VectorType':
        case 'MatrixType':
            _error(context, node, EEffectErrors.BAD_TYPE_VECTOR_MATRIX);
            break;

        case 'BaseType':
        case 'Type':
            return analyzeType(context, scope, pChildren[0]);
    }

    return pType;
}


function analyzeUsage(node: IParseNode): string {
    node = node.children[0];
    return node.value;
}


function analyzeVariable(context: Context, scope: ProgramScope, node: IParseNode, pGeneralType: IVariableTypeInstruction): IVariableDeclInstruction {
    let pChildren: IParseNode[] = node.children;

    let pVarDecl: IVariableDeclInstruction = new VariableDeclInstruction(node);
    let pVariableType: IVariableTypeInstruction = new VariableTypeInstruction(node);
    let pAnnotation: IAnnotationInstruction = null;
    let sSemantic: string = '';
    let pInitExpr: IInitExprInstruction = null;

    pVarDecl.push(pVariableType, true);
    pVariableType.pushType(pGeneralType);
    pVarDecl.scope = (scope.current);

    analyzeVariableDim(context, scope, pChildren[pChildren.length - 1], pVarDecl);

    let i: number = 0;
    for (i = pChildren.length - 2; i >= 0; i--) {
        if (pChildren[i].name === 'Annotation') {
            pAnnotation = analyzeAnnotation(pChildren[i]);
            pVarDecl.annotation = (pAnnotation);
        }
        else if (pChildren[i].name === 'Semantic') {
            sSemantic = analyzeSemantic(pChildren[i]);
            pVarDecl.semantics = (sSemantic);
            pVarDecl.nameID.realName = (sSemantic);
        }
        else if (pChildren[i].name === 'Initializer') {
            pInitExpr = analyzeInitializer(context, scope, pChildren[i]);
            if (!pInitExpr.optimizeForVariableType(pVariableType)) {
                _error(context, node, EEffectErrors.BAD_VARIABLE_INITIALIZER, { varName: pVarDecl.name });
                return null;
            }
            pVarDecl.push(pInitExpr, true);
        }
    }

    checkInstruction(context, pVarDecl, ECheckStage.CODE_TARGET_SUPPORT);
    addVariableDecl(context, scope, pVarDecl);
    pVarDecl.fillNameIndex();

    return pVarDecl;
}


function analyzeVariableDim(context: Context, scope: ProgramScope, node: IParseNode, pVariableDecl: IVariableDeclInstruction): void {
    let pChildren: IParseNode[] = node.children;
    let pVariableType: IVariableTypeInstruction = <IVariableTypeInstruction>pVariableDecl.type;

    if (pChildren.length === 1) {
        let pName: IIdInstruction = new IdInstruction(node);
        pName.name = (pChildren[0].value);
        pVariableDecl.push(pName, true);
        return;
    }

    analyzeVariableDim(context, scope, pChildren[pChildren.length - 1], pVariableDecl);

    {
        let pIndexExpr: IExprInstruction = analyzeExpr(context, scope, pChildren[pChildren.length - 3]);
        pVariableType.addArrayIndex(pIndexExpr);
    }
}


function analyzeAnnotation(node: IParseNode): IAnnotationInstruction {
    // todo
    return null;
}


function analyzeSemantic(node: IParseNode): string {
    let sSemantic: string = node.children[0].value;
    // let pDecl: IDeclInstruction = <IDeclInstruction>_pCurrentInstruction;
    // pDecl.semantics = (sSemantic);
    return sSemantic;
}


function analyzeInitializer(context: Context, scope: ProgramScope, node: IParseNode): IInitExprInstruction {
    let pChildren: IParseNode[] = node.children;
    let pInitExpr: IInitExprInstruction = new InitExprInstruction(node);

    if (pChildren.length === 2) {
        pInitExpr.push(analyzeExpr(context, scope, pChildren[0]), true);
    }
    else {
        for (let i: number = pChildren.length - 3; i >= 1; i--) {
            if (pChildren[i].name === 'InitExpr') {
                pInitExpr.push(analyzeInitExpr(context, scope, pChildren[i]), true);
            }
        }
    }

    return pInitExpr;
}


function analyzeExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    let name: string = node.name;

    switch (name) {
        case 'ObjectExpr':
            return analyzeObjectExpr(context, scope, node);
        case 'ComplexExpr':
            return analyzeComplexExpr(context, scope, node);
        case 'PostfixExpr':
            return analyzePostfixExpr(context, scope, node);
        case 'UnaryExpr':
            return analyzeUnaryExpr(context, scope, node);
        case 'CastExpr':
            return analyzeCastExpr(context, scope, node);
        case 'ConditionalExpr':
            return analyzeConditionalExpr(context, scope, node);
        case 'MulExpr':
        case 'AddExpr':
            return analyzeArithmeticExpr(context, scope, node);
        case 'RelationalExpr':
        case 'EqualityExpr':
            return analyzeRelationExpr(context, scope, node);
        case 'AndExpr':
        case 'OrExpr':
            return analyzeLogicalExpr(context, scope, node);
        case 'AssignmentExpr':
            return analyzeAssignmentExpr(context, scope, node);
        case 'T_NON_TYPE_ID':
            return analyzeIdExpr(context, scope, node);
        case 'T_STRING':
        case 'T_UINT':
        case 'T_FLOAT':
        case 'T_KW_TRUE':
        case 'T_KW_FALSE':
            return analyzeSimpleExpr(context, scope, node);
        default:
            _error(context, node, EEffectErrors.UNSUPPORTED_EXPR, { exprName: name });
            break;
    }

    return null;
}


function analyzeObjectExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    let name: string = node.children[node.children.length - 1].name;

    switch (name) {
        case 'T_KW_COMPILE':
            return analyzeCompileExpr(context, scope, node);
        case 'T_KW_SAMPLER_STATE':
            return analyzeSamplerStateBlock(context, scope, node);
        default:
    }
    return null;
}


function analyzeCompileExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = node.children;
    let pExpr: CompileExprInstruction = new CompileExprInstruction(node);
    let pExprType: IVariableTypeInstruction;
    let pArguments: IExprInstruction[] = null;
    let sShaderFuncName: string = pChildren[pChildren.length - 2].value;
    let pShaderFunc: IFunctionDeclInstruction = null;
    let i: number = 0;

    pArguments = [];

    if (pChildren.length > 4) {
        let pArgumentExpr: IExprInstruction;

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(context, scope, pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pShaderFunc = findShaderFunction(scope, sShaderFuncName, pArguments);

    if (isNull(pShaderFunc)) {
        _error(context, node, EEffectErrors.BAD_COMPILE_NOT_FUNCTION, { funcName: sShaderFuncName });
        return null;
    }

    pExprType = (<IVariableTypeInstruction>pShaderFunc.type).wrap();

    pExpr.type = (pExprType);
    pExpr.operator = ('complile');
    pExpr.push(pShaderFunc.nameID, false);

    if (!isNull(pArguments)) {
        for (i = 0; i < pArguments.length; i++) {
            pExpr.push(pArguments[i], true);
        }
    }

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSamplerStateBlock(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    node = node.children[0];

    let pChildren: IParseNode[] = node.children;
    let pExpr: SamplerStateBlockInstruction = new SamplerStateBlockInstruction(node);
    let i: number = 0;

    pExpr.operator = ('sample_state');

    for (i = pChildren.length - 2; i >= 1; i--) {
        analyzeSamplerState(context, scope, pChildren[i], pExpr);
    }

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSamplerState(context: Context, scope: ProgramScope, node: IParseNode, pSamplerStates: SamplerStateBlockInstruction): void {

    let pChildren: IParseNode[] = node.children;
    if (pChildren[pChildren.length - 2].name === 'StateIndex') {
        _error(context, node, EEffectErrors.NOT_SUPPORT_STATE_INDEX);
        return;
    }

    let pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
    let pSubStateExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
    let sStateType: string = pChildren[pChildren.length - 1].value.toUpperCase();
    let sStateValue: string = '';

    if (isNull(pSubStateExprNode.value)) {
        _error(context, pSubStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
        return;
    }

    let pTexture: IVariableDeclInstruction = null;

    switch (sStateType) {
        case 'TEXTURE':
            // let pTexture: IVariableDeclInstruction = null;
            if (pStateExprNode.children.length !== 3 || pSubStateExprNode.value === '{') {
                _error(context, pSubStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return;
            }
            let sTextureName: string = pStateExprNode.children[1].value;
            if (isNull(sTextureName) || !scope.hasVariable(sTextureName)) {
                _error(context, pStateExprNode.children[1], EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return;
            }

            pTexture = getVariable(scope, sTextureName);
            sStateValue = sTextureName;
            break;

        case 'ADDRESSU': /* WRAP_S */
        case 'ADDRESSV': /* WRAP_T */
            sStateValue = pSubStateExprNode.value.toUpperCase();
            switch (sStateValue) {
                case 'WRAP':
                case 'CLAMP':
                case 'MIRROR':
                    break;
                default:
                    logger.warn('Webgl don`t support this wrapmode: ' + sStateValue);
                    return;
            }
            break;

        case 'MAGFILTER':
        case 'MINFILTER':
            sStateValue = pSubStateExprNode.value.toUpperCase();
            switch (sStateValue) {
                case 'POINT':
                    sStateValue = 'NEAREST';
                    break;
                case 'POINT_MIPMAP_POINT':
                    sStateValue = 'NEAREST_MIPMAP_NEAREST';
                    break;
                case 'LINEAR_MIPMAP_POINT':
                    sStateValue = 'LINEAR_MIPMAP_NEAREST';
                    break;
                case 'POINT_MIPMAP_LINEAR':
                    sStateValue = 'NEAREST_MIPMAP_LINEAR';
                    break;

                case 'NEAREST':
                case 'LINEAR':
                case 'NEAREST_MIPMAP_NEAREST':
                case 'LINEAR_MIPMAP_NEAREST':
                case 'NEAREST_MIPMAP_LINEAR':
                case 'LINEAR_MIPMAP_LINEAR':
                    break;
                default:
                    logger.warn('Webgl don`t support this texture filter: ' + sStateValue);
                    return;
            }
            break;

        default:
            logger.warn('Don`t support this texture param: ' + sStateType);
            return;
    }

    if (sStateType !== 'TEXTURE') {
        pSamplerStates.addState(sStateType, sStateValue);
    }
    else {
        pSamplerStates.texture = (pTexture);
    }
}


function analyzeComplexExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = node.children;
    let sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'T_NON_TYPE_ID':
            return analyzeFunctionCallExpr(context, scope, node);
        case 'BaseType':
        case 'T_TYPE_ID':
            return analyzeConstructorCallExpr(context, scope, node);
        default:
            return analyzeSimpleComplexExpr(context, scope, node);
    }
}


function analyzeFunctionCallExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = node.children;
    let pExpr: IExprInstruction = null;
    let pExprType: IVariableTypeInstruction = null;
    let pArguments: IExprInstruction[] = null;
    let sFuncName: string = pChildren[pChildren.length - 1].value;
    let pFunction: IFunctionDeclInstruction = null;
    let pFunctionId: IIdExprInstruction = null;
    let i: number = 0;
    let pCurrentAnalyzedFunction: IFunctionDeclInstruction = context.currentFunction;

    if (pChildren.length > 3) {
        let pArgumentExpr: IExprInstruction;

        pArguments = [];

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(context, scope, pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pFunction = findFunction(scope, sFuncName, pArguments);

    if (isNull(pFunction)) {
        _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_FUNCTION, { funcName: sFuncName });
        return null;
    }

    if (!isDef(pFunction)) {
        _error(context, node, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: sFuncName });
        return null;
    }

    if (!isNull(pCurrentAnalyzedFunction)) {
        if (!pFunction.pixel) {
            pCurrentAnalyzedFunction.pixel = (false);
        }

        if (!pFunction.vertex) {
            pCurrentAnalyzedFunction.vertex = (false);
        }
    }

    if (pFunction.instructionType === EInstructionTypes.k_FunctionDeclInstruction) {
        let pFunctionCallExpr: FunctionCallInstruction = new FunctionCallInstruction(null);

        pFunctionId = new IdExprInstruction(null);
        pFunctionId.push(pFunction.nameID, false);

        pExprType = (<IVariableTypeInstruction>pFunction.type).wrap();

        pFunctionCallExpr.type = (pExprType);
        pFunctionCallExpr.push(pFunctionId, true);

        if (!isNull(pArguments)) {
            for (i = 0; i < pArguments.length; i++) {
                pFunctionCallExpr.push(pArguments[i], true);
            }

            let pFunctionArguments: IVariableDeclInstruction[] = (<FunctionDeclInstruction>pFunction).arguments;
            for (i = 0; i < pArguments.length; i++) {
                if (pFunctionArguments[i].type.hasUsage('out')) {
                    if (!pArguments[i].type.writable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }
                }
                else if (pFunctionArguments[i].type.hasUsage('inout')) {
                    if (!pArguments[i].type.writable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }

                    if (!pArguments[i].type.readable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }
                }
                else {
                    if (!pArguments[i].type.readable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }
                }
            }

            for (i = pArguments.length; i < pFunctionArguments.length; i++) {
                pFunctionCallExpr.push(pFunctionArguments[i].initializeExpr, false);
            }

        }

        if (!isNull(pCurrentAnalyzedFunction)) {
            pCurrentAnalyzedFunction.addUsedFunction(pFunction);
        }

        pFunction.markUsedAs(EFunctionType.k_Function);

        pExpr = pFunctionCallExpr;
    }
    else {
        let pSystemCallExpr: SystemCallInstruction = new SystemCallInstruction();

        pSystemCallExpr.setSystemCallFunction(pFunction);
        pSystemCallExpr.fillByArguments(pArguments);

        if (!isNull(pCurrentAnalyzedFunction)) {
            for (i = 0; i < pArguments.length; i++) {
                if (!pArguments[i].type.readable) {
                    _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
                    return null;
                }
            }
        }

        pExpr = pSystemCallExpr;

        if (!pFunction.builtIn && !isNull(pCurrentAnalyzedFunction)) {
            pCurrentAnalyzedFunction.addUsedFunction(pFunction);
        }
    }

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeConstructorCallExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = node.children;
    let pExpr: ConstructorCallInstruction = new ConstructorCallInstruction(node);
    let pExprType: IVariableTypeInstruction = null;
    let pArguments: IExprInstruction[] = null;
    let pConstructorType: ITypeInstruction = null;
    let i: number = 0;

    pConstructorType = analyzeType(context, scope, pChildren[pChildren.length - 1]);

    if (isNull(pConstructorType)) {
        _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_TYPE);
        return null;
    }

    if (pChildren.length > 3) {
        let pArgumentExpr: IExprInstruction = null;

        pArguments = [];

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(context, scope,pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pExprType = findConstructor(pConstructorType, pArguments);

    if (isNull(pExprType)) {
        _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_CONSTRUCTOR, { typeName: pConstructorType.toString() });
        return null;
    }

    pExpr.type = (pExprType);
    pExpr.push(pConstructorType, false);

    if (!isNull(pArguments)) {
        for (i = 0; i < pArguments.length; i++) {
            if (!pArguments[i].type.readable) {
                _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
                return null;
            }

            pExpr.push(pArguments[i], true);
        }
    }

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSimpleComplexExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let pExpr: ComplexExprInstruction = new ComplexExprInstruction(node);
    let pComplexExpr: IExprInstruction;
    let pExprType: IVariableTypeInstruction;

    pComplexExpr = analyzeExpr(context, scope,pChildren[1]);
    pExprType = <IVariableTypeInstruction>pComplexExpr.type;

    pExpr.type = (pExprType);
    pExpr.push(pComplexExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}



function analyzePostfixExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sSymbol: string = pChildren[pChildren.length - 2].value;

    switch (sSymbol) {
        case '[':
            return analyzePostfixIndex(context, scope,node);
        case '.':
            return analyzePostfixPoint(context, scope,node);
        case '++':
        case '--':
            return analyzePostfixArithmetic(context, scope,node);
    }

    return null;
}


function analyzePostfixIndex(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let pExpr: PostfixIndexInstruction = new PostfixIndexInstruction(node);
    let pPostfixExpr: IExprInstruction = null;
    let pIndexExpr: IExprInstruction = null;
    let pExprType: IVariableTypeInstruction = null;
    let pPostfixExprType: IVariableTypeInstruction = null;
    let pIndexExprType: IVariableTypeInstruction = null;
    let pIntType: ITypeInstruction = null;

    pPostfixExpr = analyzeExpr(context, scope,pChildren[pChildren.length - 1]);
    pPostfixExprType = <IVariableTypeInstruction>pPostfixExpr.type;

    if (!pPostfixExprType.isArray()) {
        _error(context, node, EEffectErrors.BAD_POSTIX_NOT_ARRAY, { typeName: pPostfixExprType.toString() });
        return null;
    }

    pIndexExpr = analyzeExpr(context, scope,pChildren[pChildren.length - 3]);
    pIndexExprType = <IVariableTypeInstruction>pIndexExpr.type;

    pIntType = getSystemType('number');

    if (!pIndexExprType.isEqual(pIntType)) {
        _error(context, node, EEffectErrors.BAD_POSTIX_NOT_INT_INDEX, { typeName: pIndexExprType.toString() });
        return null;
    }

    pExprType = <IVariableTypeInstruction>(pPostfixExprType.arrayElementType);

    pExpr.type = (pExprType);
    pExpr.push(pPostfixExpr, true);
    pExpr.push(pIndexExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzePostfixPoint(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let pExpr: PostfixPointInstruction = new PostfixPointInstruction(node);
    let pPostfixExpr: IExprInstruction = null;
    let sFieldName: string = '';
    let pFieldNameExpr: IIdExprInstruction = null;
    let pExprType: IVariableTypeInstruction = null;
    let pPostfixExprType: IVariableTypeInstruction = null;

    pPostfixExpr = analyzeExpr(context, scope,pChildren[pChildren.length - 1]);
    pPostfixExprType = <IVariableTypeInstruction>pPostfixExpr.type;

    sFieldName = pChildren[pChildren.length - 3].value;

    pFieldNameExpr = pPostfixExprType.getFieldExpr(sFieldName);

    if (isNull(pFieldNameExpr)) {
        _error(context, node, EEffectErrors.BAD_POSTIX_NOT_FIELD, {
            typeName: pPostfixExprType.toString(),
            fieldName: sFieldName
        });
        return null;
    }

    pExprType = <IVariableTypeInstruction>pFieldNameExpr.type;
    pExpr.type = (pExprType);
    pExpr.push(pPostfixExpr, true);
    pExpr.push(pFieldNameExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzePostfixArithmetic(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sOperator: string = pChildren[0].value;
    let pExpr: PostfixArithmeticInstruction = new PostfixArithmeticInstruction(node);
    let pPostfixExpr: IExprInstruction;
    let pExprType: IVariableTypeInstruction;
    let pPostfixExprType: IVariableTypeInstruction;

    pPostfixExpr = analyzeExpr(context, scope, pChildren[1]);
    pPostfixExprType = <IVariableTypeInstruction>pPostfixExpr.type;

    pExprType = checkOneOperandExprType(context, node, sOperator, pPostfixExprType);

    if (isNull(pExprType)) {
        _error(context, node, EEffectErrors.BAD_POSTIX_ARITHMETIC, {
            operator: sOperator,
            typeName: pPostfixExprType.toString()
        });
        return null;
    }

    pExpr.type = (pExprType);
    pExpr.operator = (sOperator);
    pExpr.push(pPostfixExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeUnaryExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sOperator: string = pChildren[1].value;
    let pExpr: UnaryExprInstruction = new UnaryExprInstruction(node);
    let pUnaryExpr: IExprInstruction;
    let pExprType: IVariableTypeInstruction;
    let pUnaryExprType: IVariableTypeInstruction;

    pUnaryExpr = analyzeExpr(context, scope,pChildren[0]);
    pUnaryExprType = <IVariableTypeInstruction>pUnaryExpr.type;

    pExprType = checkOneOperandExprType(context, node, sOperator, pUnaryExprType);

    if (isNull(pExprType)) {
        _error(context, node, EEffectErrors.BAD_UNARY_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            tyepName: pUnaryExprType.toString()
        });
        return null;
    }

    pExpr.operator = (sOperator);
    pExpr.type = (pExprType);
    pExpr.push(pUnaryExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeCastExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let pExpr: CastExprInstruction = new CastExprInstruction(node);
    let pExprType: IVariableTypeInstruction;
    let pCastedExpr: IExprInstruction;

    pExprType = analyzeConstTypeDim(context, scope, pChildren[2]);
    pCastedExpr = analyzeExpr(context, scope, pChildren[0]);

    if (!(<IVariableTypeInstruction>pCastedExpr.type).readable) {
        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr.type = (pExprType);
    pExpr.push(pExprType, true);
    pExpr.push(pCastedExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeConditionalExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let pExpr: ConditionalExprInstruction = new ConditionalExprInstruction(node);
    let pConditionExpr: IExprInstruction;
    let pTrueExpr: IExprInstruction;
    let pFalseExpr: IExprInstruction;
    let pConditionType: IVariableTypeInstruction;
    let pTrueExprType: IVariableTypeInstruction;
    let pFalseExprType: IVariableTypeInstruction;
    let pBoolType: ITypeInstruction;

    pConditionExpr = analyzeExpr(context, scope, pChildren[pChildren.length - 1]);
    pTrueExpr = analyzeExpr(context, scope, pChildren[pChildren.length - 3]);
    pFalseExpr = analyzeExpr(context, scope, pChildren[0]);

    pConditionType = <IVariableTypeInstruction>pConditionExpr.type;
    pTrueExprType = <IVariableTypeInstruction>pTrueExpr.type;
    pFalseExprType = <IVariableTypeInstruction>pFalseExpr.type;

    pBoolType = getSystemType('bool');

    if (!pConditionType.isEqual(pBoolType)) {
        _error(context, pConditionExpr.sourceNode, EEffectErrors.BAD_CONDITION_TYPE, { typeName: pConditionType.toString() });
        return null;
    }

    if (!pTrueExprType.isEqual(pFalseExprType)) {
        _error(context, pTrueExprType.sourceNode, EEffectErrors.BAD_CONDITION_VALUE_TYPES, <IEffectErrorInfo>{
            leftTypeName: pTrueExprType.toString(),
            rightTypeName: pFalseExprType.toString()
        });
        return null;
    }

    if (!pConditionType.readable) {
        _error(context, pConditionType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pTrueExprType.readable) {
        _error(context, pTrueExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pFalseExprType.readable) {
        _error(context, pFalseExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr.type = (pTrueExprType);
    pExpr.push(pConditionExpr, true);
    pExpr.push(pTrueExpr, true);
    pExpr.push(pFalseExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeArithmeticExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sOperator: string = node.children[1].value;
    let pExpr: ArithmeticExprInstruction = new ArithmeticExprInstruction(node);
    let pLeftExpr: IExprInstruction = null;
    let pRightExpr: IExprInstruction = null;
    let pLeftType: IVariableTypeInstruction = null;
    let pRightType: IVariableTypeInstruction = null;
    let pExprType: IVariableTypeInstruction = null;

    pLeftExpr = analyzeExpr(context, scope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(context, scope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    pExprType = checkTwoOperandExprTypes(context, sOperator, pLeftType, pRightType);

    if (isNull(pExprType)) {
        _error(context, node, EEffectErrors.BAD_ARITHMETIC_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            leftTypeName: pLeftType.toString(),
            rightTypeName: pRightType.toString()
        });
        return null;
    }

    pExpr.operator = (sOperator);
    pExpr.type = (pExprType);
    pExpr.push(pLeftExpr, true);
    pExpr.push(pRightExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);
    return pExpr;
}


function analyzeRelationExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sOperator: string = node.children[1].value;
    let pExpr: RelationalExprInstruction = new RelationalExprInstruction(node);
    let pLeftExpr: IExprInstruction;
    let pRightExpr: IExprInstruction;
    let pLeftType: IVariableTypeInstruction;
    let pRightType: IVariableTypeInstruction;
    let pExprType: IVariableTypeInstruction;

    pLeftExpr = analyzeExpr(context, scope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(context, scope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    pExprType = checkTwoOperandExprTypes(context, sOperator, pLeftType, pRightType);

    if (isNull(pExprType)) {
        _error(context, node, EEffectErrors.BAD_RELATIONAL_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            leftTypeName: pLeftType.hash,
            rightTypeName: pRightType.hash
        });
        return null;
    }

    pExpr.operator = (sOperator);
    pExpr.type = (pExprType);
    pExpr.push(pLeftExpr, true);
    pExpr.push(pRightExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeLogicalExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sOperator: string = node.children[1].value;
    let pExpr: LogicalExprInstruction = new LogicalExprInstruction(node);
    let pLeftExpr: IExprInstruction;
    let pRightExpr: IExprInstruction;
    let pLeftType: IVariableTypeInstruction;
    let pRightType: IVariableTypeInstruction;
    let pBoolType: ITypeInstruction;

    pLeftExpr = analyzeExpr(context, scope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(context, scope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    pBoolType = getSystemType('bool');

    if (!pLeftType.isEqual(pBoolType)) {
        _error(context, pLeftType.sourceNode, EEffectErrors.BAD_LOGICAL_OPERATION, {
            operator: sOperator,
            typeName: pLeftType.toString()
        });
        return null;
    }
    if (!pRightType.isEqual(pBoolType)) {
        _error(context, pRightType.sourceNode, EEffectErrors.BAD_LOGICAL_OPERATION, {
            operator: sOperator,
            typeName: pRightType.toString()
        });
        return null;
    }

    if (!pLeftType.readable) {
        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pRightType.readable) {
        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr.operator = (sOperator);
    pExpr.type = ((<SystemTypeInstruction>pBoolType).variableType);
    pExpr.push(pLeftExpr, true);
    pExpr.push(pRightExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeAssignmentExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = node.children;
    let sOperator: string = pChildren[1].value;
    let pExpr: AssignmentExprInstruction = new AssignmentExprInstruction(node);
    let pLeftExpr: IExprInstruction;
    let pRightExpr: IExprInstruction;
    let pLeftType: IVariableTypeInstruction;
    let pRightType: IVariableTypeInstruction;
    let pExprType: IVariableTypeInstruction;

    pLeftExpr = analyzeExpr(context, scope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(context, scope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    if (sOperator !== '=') {
        pExprType = checkTwoOperandExprTypes(context, sOperator, pLeftType, pRightType);
        if (isNull(pExprType)) {
            _error(context, node, EEffectErrors.BAD_ARITHMETIC_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
                operator: sOperator,
                leftTypeName: pLeftType.hash,
                rightTypeName: pRightType.hash
            });
        }
    }
    else {
        pExprType = pRightType;
    }

    pExprType = checkTwoOperandExprTypes(context, '=', pLeftType, pExprType);

    if (isNull(pExprType)) {
        _error(context, node, EEffectErrors.BAD_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
            leftTypeName: pLeftType.hash,
            rightTypeName: pRightType.hash
        });
    }

    pExpr.operator = (sOperator);
    pExpr.type = (pExprType);
    pExpr.push(pLeftExpr, true);
    pExpr.push(pRightExpr, true);

    checkInstruction(context, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeIdExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let name: string = node.value;
    let pVariable: IVariableDeclInstruction = getVariable(scope, name);

    if (isNull(pVariable)) {
        _error(context, node, EEffectErrors.UNKNOWN_VARNAME, { varName: name });
        return null;
    }

    if (!isNull(context.currentFunction)) {
        // TODO: rewrite this!
        if (!pVariable.pixel) {
            context.currentFunction.pixel = false;
        }
        if (!pVariable.vertex) {
            context.currentFunction.vertex = false;
        }
    }

    let pVarId: IdExprInstruction = new IdExprInstruction(node);
    pVarId.push(pVariable.nameID, false);

    checkInstruction(context, pVarId, ECheckStage.CODE_TARGET_SUPPORT);

    return pVarId;
}


function analyzeSimpleExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

    let pInstruction: ILiteralInstruction = null;
    const name: string = node.name;
    const sValue: string = node.value;

    switch (name) {
        case 'T_UINT':
            pInstruction = new IntInstruction(node);
            pInstruction.value = ((<number><any>sValue) * 1);
            break;
        case 'T_FLOAT':
            pInstruction = new FloatInstruction(node);
            pInstruction.value = ((<number><any>sValue) * 1.0);
            break;
        case 'T_STRING':
            pInstruction = new StringInstruction(node);
            pInstruction.value = (sValue);
            break;
        case 'T_KW_TRUE':
            pInstruction = new BoolInstruction(node);
            pInstruction.value = (true);
            break;
        case 'T_KW_FALSE':
            pInstruction = new BoolInstruction(node);
            pInstruction.value = (false);
            break;
    }

    return pInstruction;
}



function analyzeConstTypeDim(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {

    const pChildren: IParseNode[] = node.children;

    if (pChildren.length > 1) {
        _error(context, node, EEffectErrors.BAD_CAST_TYPE_USAGE);
        return null;
    }

    let pType: IVariableTypeInstruction;

    pType = <IVariableTypeInstruction>(analyzeType(context, scope, pChildren[0]));

    if (!pType.isBase()) {
        _error(context, node, EEffectErrors.BAD_CAST_TYPE_NOT_BASE, { typeName: pType.toString() });
    }

    checkInstruction(context, pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}


function analyzeVarStructDecl(context: Context, scope: ProgramScope, node: IParseNode, pInstruction: IInstruction = null): void {

    const pChildren: IParseNode[] = node.children;
    let pUsageType: IVariableTypeInstruction = null;
    let pVariable: IVariableDeclInstruction = null;
    let i: number = 0;

    pUsageType = analyzeUsageStructDecl(context, scope, pChildren[pChildren.length - 1]);

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'Variable') {
            pVariable = analyzeVariable(context, scope, pChildren[i], pUsageType);

            if (!isNull(pInstruction)) {
                pInstruction.push(pVariable, true);
            }
        }
    }
}


function analyzeUsageStructDecl(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {

    let pChildren: IParseNode[] = node.children;
    let i: number = 0;
    let pType: IVariableTypeInstruction = new VariableTypeInstruction(node);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'StructDecl') {
            const pMainType: ITypeInstruction = analyzeStructDecl(context, scope, pChildren[i]);
            pType.pushType(pMainType);

            const pTypeDecl: ITypeDeclInstruction = new TypeDeclInstruction(null);
            pTypeDecl.push(pMainType, true);

            addTypeDecl(context, scope, pTypeDecl);
        }
        else if (pChildren[i].name === 'Usage') {
            const sUsage: string = analyzeUsage(pChildren[i]);
            pType.addUsage(sUsage);
        }
    }

    checkInstruction(context, pType, ECheckStage.CODE_TARGET_SUPPORT);
    return pType;
}


function analyzeStruct(context: Context, scope: ProgramScope, node: IParseNode): ITypeInstruction {
    const pChildren: IParseNode[] = node.children;

    const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction(node);
    const pFieldCollector: IInstruction = new InstructionCollector();

    scope.pushScope(EScopeType.k_Struct);

    let i: number = 0;
    for (i = pChildren.length - 4; i >= 1; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(context, scope, pChildren[i], pFieldCollector);
        }
    }

    scope.popScope();
    pStruct.addFields(pFieldCollector, true);

    checkInstruction(context, pStruct, ECheckStage.CODE_TARGET_SUPPORT);
    return pStruct;
}


function analyzeFunctionDeclOnlyDefinition(context: Context, scope: ProgramScope, node: IParseNode): IFunctionDeclInstruction {

    const pChildren: IParseNode[] = node.children;
    let pFunction: FunctionDeclInstruction = null;
    let pFunctionDef: FunctionDefInstruction = null;
    let pAnnotation: IAnnotationInstruction = null;
    const sLastNodeValue: string = pChildren[0].value;
    let bNeedAddFunction: boolean = false;

    pFunctionDef = analyzeFunctionDef(context, scope, pChildren[pChildren.length - 1]);
    pFunction = <FunctionDeclInstruction>findFunctionByDef(scope, pFunctionDef);

    if (!isDef(pFunction)) {
        _error(context, node, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: pFunction.nameID.toString() });
        return null;
    }

    if (!isNull(pFunction) && pFunction.implementation) {
        _error(context, node, EEffectErrors.BAD_REDEFINE_FUNCTION, { funcName: pFunction.nameID.toString() });
        return null;
    }

    if (isNull(pFunction)) {
        pFunction = new FunctionDeclInstruction(null);
        bNeedAddFunction = true;
    }
    else {
        if (!pFunction.returnType.isEqual(pFunctionDef.returnType)) {
            _error(context, node, EEffectErrors.BAD_FUNCTION_DEF_RETURN_TYPE, { funcName: pFunction.nameID.toString() });
            return null;
        }

        bNeedAddFunction = false;
    }

    pFunction.definition = (<IDeclInstruction>pFunctionDef);

    scope.restoreScope();

    if (pChildren.length === 3) {
        pAnnotation = analyzeAnnotation(pChildren[1]);
        pFunction.annotation = (pAnnotation);
    }

    if (sLastNodeValue !== ';') {
        pFunction.implementationScope = (scope.current);
        context.functionWithImplementationList.push(pFunction);
    }

    scope.popScope();

    if (bNeedAddFunction) {
        addFunctionDecl(context, scope, node, pFunction);
    }

    return pFunction;
}


function resumeFunctionAnalysis(context: Context, scope: ProgramScope, pAnalzedFunction: IFunctionDeclInstruction): void {
    const pFunction: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
    const node: IParseNode = pFunction.sourceNode;

    scope.current = pFunction.implementationScope;

    const pChildren: IParseNode[] = node.children;
    let pStmtBlock: StmtBlockInstruction = null;

    context.currentFunction = pFunction;
    context.haveCurrentFunctionReturnOccur = false;

    pStmtBlock = <StmtBlockInstruction>analyzeStmtBlock(context, scope, pChildren[0]);
    pFunction.implementation = <IStmtInstruction>pStmtBlock;

    if (!pFunction.returnType.isEqual(getSystemType('void')) && !context.haveCurrentFunctionReturnOccur) {
        _error(context, node, EEffectErrors.BAD_FUNCTION_DONT_HAVE_RETURN_STMT, { funcName: pFunction.nameID.toString() })
    }

    context.currentFunction = null;
    context.haveCurrentFunctionReturnOccur = false;

    scope.popScope();

    checkInstruction(context, pFunction, ECheckStage.CODE_TARGET_SUPPORT);
}


function analyzeFunctionDef(context: Context, scope: ProgramScope, node: IParseNode): FunctionDefInstruction {
    const pChildren: IParseNode[] = node.children;
    const pFunctionDef: FunctionDefInstruction = new FunctionDefInstruction(node);
    let pReturnType: IVariableTypeInstruction = null;
    let pFuncName: IIdInstruction = null;
    const pNameNode = pChildren[pChildren.length - 2];
    const sFuncName: string = pNameNode.value;

    const pRetTypeNode = pChildren[pChildren.length - 1];
    pReturnType = analyzeUsageType(context, scope, pRetTypeNode);

    if (pReturnType.isContainSampler()) {
        _error(context, pRetTypeNode, EEffectErrors.BAD_RETURN_TYPE_FOR_FUNCTION, { funcName: sFuncName });
        return null;
    }

    pFuncName = new IdInstruction(pNameNode);
    pFuncName.name = (sFuncName);
    pFuncName.realName = (sFuncName + '_' + '0000'); // TODO: use uniq guid <<

    pFunctionDef.returnType = (pReturnType);
    pFunctionDef.functionName = (pFuncName);

    if (pChildren.length === 4) {
        const sSemantic: string = analyzeSemantic(pChildren[0]);
        pFunctionDef.semantics = (sSemantic);
    }

    scope.pushScope(EScopeType.k_Default);

    analyzeParamList(context, scope, pChildren[pChildren.length - 3], pFunctionDef);

    scope.popScope();

    checkInstruction(context, pFunctionDef, ECheckStage.CODE_TARGET_SUPPORT);

    return pFunctionDef;
}


function analyzeParamList(context: Context, scope: ProgramScope, node: IParseNode, pFunctionDef: FunctionDefInstruction): void {

    const pChildren: IParseNode[] = node.children;
    let pParameter: IVariableDeclInstruction;

    let i: number = 0;

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'ParameterDecl') {
            pParameter = analyzeParameterDecl(context, scope, pChildren[i]);
            pParameter.scope = (scope.current);
            pFunctionDef.addParameter(pParameter, scope.isStrictMode());
        }
    }
}


function analyzeParameterDecl(context: Context, scope: ProgramScope, node: IParseNode): IVariableDeclInstruction {

    const pChildren: IParseNode[] = node.children;
    let pType: IVariableTypeInstruction = null;
    let pParameter: IVariableDeclInstruction = null;

    pType = analyzeParamUsageType(context, scope, pChildren[1]);
    pParameter = analyzeVariable(context, scope, pChildren[0], pType);

    return pParameter;
}


function analyzeParamUsageType(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {
    const pChildren: IParseNode[] = node.children;
    let i: number = 0;
    const pType: IVariableTypeInstruction = new VariableTypeInstruction(node);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'Type') {
            const pMainType: ITypeInstruction = analyzeType(context, scope, pChildren[i]);
            pType.pushType(pMainType);
        }
        else if (pChildren[i].name === 'ParamUsage') {
            const sUsage: string = analyzeUsage(pChildren[i]);
            pType.addUsage(sUsage);
        }
    }

    checkInstruction(context, pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}


function analyzeStmtBlock(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const pStmtBlock: StmtBlockInstruction = new StmtBlockInstruction(node);
    let pStmt: IStmtInstruction;
    let i: number = 0;

    pStmtBlock.scope = (scope.current);

    scope.pushScope(EScopeType.k_Default);

    for (i = pChildren.length - 2; i > 0; i--) {
        pStmt = analyzeStmt(context, scope, pChildren[i]);
        if (!isNull(pStmt)) {
            pStmtBlock.push(pStmt);
        }
    }

    scope.popScope();

    checkInstruction(context, pStmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

    return pStmtBlock;
}


function analyzeStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(context, scope, pChildren[0]);
        case 'UseDecl':
            analyzeUseDecl(context, scope, pChildren[0]);
            return null;
        case 'T_KW_WHILE':
            return analyzeWhileStmt(context, scope, node);
        case 'T_KW_FOR':
            return analyzeForStmt(context, scope, node);
        case 'T_KW_IF':
            return analyzeIfStmt(context, scope, node);
    }
    return null;
}


function analyzeSimpleStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'T_KW_RETURN':
            return analyzeReturnStmt(context, scope, node);

        case 'T_KW_DO':
            return analyzeWhileStmt(context, scope, node);

        case 'StmtBlock':
            return analyzeStmtBlock(context, scope, pChildren[0]);

        case 'T_KW_DISCARD':
        case 'T_KW_BREAK':
        case 'T_KW_CONTINUE':
            return analyzeBreakStmt(context, scope, node);

        case 'TypeDecl':
        case 'VariableDecl':
        case 'VarStructDecl':
            return analyzeDeclStmt(context, scope, pChildren[0]);

        default:
            if (pChildren.length === 2) {
                return analyzeExprStmt(context, scope, node);
            }
            else {
                return new SemicolonStmtInstruction(node);
            }
    }
}


function analyzeReturnStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const pReturnStmtInstruction: ReturnStmtInstruction = new ReturnStmtInstruction(node);

    const pFunctionReturnType: IVariableTypeInstruction = context.currentFunction.returnType;

    context.haveCurrentFunctionReturnOccur = true;

    if (pFunctionReturnType.isEqual(getSystemType('void')) && pChildren.length === 3) {
        _error(context, node, EEffectErrors.BAD_RETURN_STMT_VOID);
        return null;
    }
    else if (!pFunctionReturnType.isEqual(getSystemType('void')) && pChildren.length === 2) {
        _error(context, node, EEffectErrors.BAD_RETURN_STMT_EMPTY);
        return null;
    }

    if (pChildren.length === 3) {
        const pExprInstruction: IExprInstruction = analyzeExpr(context, scope, pChildren[1]);

        if (!pFunctionReturnType.isEqual(pExprInstruction.type)) {
            _error(context, node, EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
            return null;
        }

        pReturnStmtInstruction.push(pExprInstruction, true);
    }

    checkInstruction(context, pReturnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pReturnStmtInstruction;
}


function analyzeBreakStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const pBreakStmtInstruction: BreakStmtInstruction = new BreakStmtInstruction(node);
    const sOperatorName: string = pChildren[1].value;

    pBreakStmtInstruction.operator = (sOperatorName);

    if (sOperatorName === 'discard' && !isNull(context.currentFunction)) {
        context.currentFunction.vertex = (false);
    }

    checkInstruction(context, pBreakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pBreakStmtInstruction;
}


function analyzeDeclStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    // let pChildren: IParseNode[] = node.children;
    const sNodeName: string = node.name;
    const pDeclStmtInstruction: DeclStmtInstruction = new DeclStmtInstruction(node);

    switch (sNodeName) {
        case 'TypeDecl':
            analyzeTypeDecl(context, scope, node, pDeclStmtInstruction);
            break;
        case 'VariableDecl':
            analyzeVariableDecl(context, scope, node, pDeclStmtInstruction);
            break;
        case 'VarStructDecl':
            analyzeVarStructDecl(context, scope, node, pDeclStmtInstruction);
            break;
    }

    checkInstruction(context, pDeclStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pDeclStmtInstruction;
}


function analyzeExprStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const pExprStmtInstruction: ExprStmtInstruction = new ExprStmtInstruction(node);
    const pExprInstruction: IExprInstruction = analyzeExpr(context, scope, pChildren[1]);

    pExprStmtInstruction.push(pExprInstruction, true);

    checkInstruction(context, pExprStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pExprStmtInstruction;
}


function analyzeWhileStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const isDoWhile: boolean = (pChildren[pChildren.length - 1].value === 'do');
    const isNonIfStmt: boolean = (node.name === 'NonIfStmt') ? true : false;

    const pWhileStmt: WhileStmtInstruction = new WhileStmtInstruction(node);
    let pCondition: IExprInstruction = null;
    let pConditionType: IVariableTypeInstruction = null;
    const pBoolType: ITypeInstruction = getSystemType('bool');
    let pStmt: IStmtInstruction = null;

    if (isDoWhile) {
        pWhileStmt.operator = ('do_while');
        pCondition = analyzeExpr(context, scope, pChildren[2]);
        pConditionType = <IVariableTypeInstruction>pCondition.type;

        if (!pConditionType.isEqual(pBoolType)) {
            _error(context, node, EEffectErrors.BAD_DO_WHILE_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        pStmt = analyzeStmt(context, scope, pChildren[0]);
    }
    else {
        pWhileStmt.operator = ('while');
        pCondition = analyzeExpr(context, scope, pChildren[2]);
        pConditionType = <IVariableTypeInstruction>pCondition.type;

        if (!pConditionType.isEqual(pBoolType)) {
            _error(context, node, EEffectErrors.BAD_WHILE_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        if (isNonIfStmt) {
            pStmt = analyzeNonIfStmt(context, scope, pChildren[0]);
        }
        else {
            pStmt = analyzeStmt(context, scope, pChildren[0]);
        }

        pWhileStmt.push(pCondition, true);
        pWhileStmt.push(pStmt, true);
    }

    checkInstruction(context, pWhileStmt, ECheckStage.CODE_TARGET_SUPPORT);

    return pWhileStmt;
}


function analyzeIfStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const isIfElse: boolean = (pChildren.length === 7);

    const pIfStmtInstruction: IfStmtInstruction = new IfStmtInstruction(node);
    const pCondition: IExprInstruction = analyzeExpr(context, scope, pChildren[pChildren.length - 3]);
    const pConditionType: IVariableTypeInstruction = <IVariableTypeInstruction>pCondition.type;
    const pBoolType: ITypeInstruction = getSystemType('bool');

    let pIfStmt: IStmtInstruction = null;
    let pElseStmt: IStmtInstruction = null;

    if (!pConditionType.isEqual(pBoolType)) {
        _error(context, node, EEffectErrors.BAD_IF_CONDITION, { typeName: pConditionType.toString() });
        return null;
    }

    pIfStmtInstruction.push(pCondition, true);

    if (isIfElse) {
        pIfStmtInstruction.operator = ('if_else');
        pIfStmt = analyzeNonIfStmt(context, scope, pChildren[2]);
        pElseStmt = analyzeStmt(context, scope, pChildren[0]);

        pIfStmtInstruction.push(pIfStmt, true);
        pIfStmtInstruction.push(pElseStmt, true);
    }
    else {
        pIfStmtInstruction.operator = ('if');
        pIfStmt = analyzeNonIfStmt(context, scope, pChildren[0]);

        pIfStmtInstruction.push(pIfStmt, true);
    }

    checkInstruction(context, pIfStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pIfStmtInstruction;
}


function analyzeNonIfStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(context, scope, pChildren[0]);
        case 'T_KW_WHILE':
            return analyzeWhileStmt(context, scope, node);
        case 'T_KW_FOR':
            return analyzeForStmt(context, scope, node);
    }
    return null;
}


function analyzeForStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = node.children;
    const isNonIfStmt: boolean = (node.name === 'NonIfStmt');
    const pForStmtInstruction: ForStmtInstruction = new ForStmtInstruction(node);
    let pStmt: IStmtInstruction = null;

    scope.pushScope();

    analyzeForInit(context, scope, pChildren[pChildren.length - 3], pForStmtInstruction);
    analyzeForCond(context, scope, pChildren[pChildren.length - 4], pForStmtInstruction);

    if (pChildren.length === 7) {
        analyzeForStep(context, scope, pChildren[2], pForStmtInstruction);
    }
    else {
        pForStmtInstruction.push(null);
    }


    if (isNonIfStmt) {
        pStmt = analyzeNonIfStmt(context, scope, pChildren[0]);
    }
    else {
        pStmt = analyzeStmt(context, scope, pChildren[0]);
    }

    pForStmtInstruction.push(pStmt, true);

    scope.popScope();

    checkInstruction(context, pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pForStmtInstruction;
}


function analyzeForInit(context: Context, scope: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = node.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'VariableDecl':
            analyzeVariableDecl(context, scope, pChildren[0], pForStmtInstruction);
            break;
        case 'Expr':
            const pExpr: IExprInstruction = analyzeExpr(context, scope, pChildren[0]);
            pForStmtInstruction.push(pExpr, true);
            break;
        default:
            // ForInit : ';'
            pForStmtInstruction.push(null);
            break;
    }

    return;
}


function analyzeForCond(context: Context, scope: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = node.children;

    if (pChildren.length === 1) {
        pForStmtInstruction.push(null);
        return;
    }

    const pConditionExpr: IExprInstruction = analyzeExpr(context, scope, pChildren[1]);

    pForStmtInstruction.push(pConditionExpr, true);
    return;
}


function analyzeForStep(context: Context, scope: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = node.children;
    const pStepExpr: IExprInstruction = analyzeExpr(context, scope, pChildren[0]);

    pForStmtInstruction.push(pStepExpr, true);

    return;
}




function analyzeTechniqueForImport(context: Context, scope: ProgramScope, node: IParseNode): void {

    const pChildren: IParseNode[] = node.children;
    const pTechnique: ITechniqueInstruction = new TechniqueInstruction(node);
    const sTechniqueName: string = analyzeComplexName(pChildren[pChildren.length - 2]);
    const isComplexName: boolean = pChildren[pChildren.length - 2].children.length !== 1;

    pTechnique.name = (sTechniqueName);

    for (let i: number = pChildren.length - 3; i >= 0; i--) {
        if (pChildren[i].name === 'Annotation') {
            const pAnnotation: IAnnotationInstruction = analyzeAnnotation(pChildren[i]);
            pTechnique.annotation = (pAnnotation);
        }
        else if (pChildren[i].name === 'Semantic') {
            const sSemantic: string = analyzeSemantic(pChildren[i]);
            pTechnique.semantics = (sSemantic);
        }
        else {
            analyzeTechniqueBodyForImports(context, scope, pChildren[i], pTechnique);
        }
    }

    addTechnique(context, scope, pTechnique);
}



function analyzeTechniqueBodyForImports(context: Context, scope: ProgramScope, node: IParseNode, pTechnique: ITechniqueInstruction): void {

    const pChildren: IParseNode[] = node.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassDeclForImports(context, scope, pChildren[i], pTechnique);
    }
}


function analyzePassDeclForImports(context: Context, scope: ProgramScope, node: IParseNode, pTechnique: ITechniqueInstruction): void {

    const pChildren: IParseNode[] = node.children;

    if (pChildren[0].name === 'ImportDecl') {
        analyzeImportDecl(context, pChildren[0], pTechnique);
    }
    else if (pChildren.length > 1) {
        const pPass: IPassInstruction = new PassInstruction(node);
        //TODO: add annotation and id
        analyzePassStateBlockForShaders(context, scope, pChildren[0], pPass);

        pTechnique.addPass(pPass);
    }
}


function analyzePassStateBlockForShaders(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = node.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassStateForShader(context, scope, pChildren[i], pPass);
    }
}


function analyzePassStateForShader(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = node.children;

    const sType: string = pChildren[pChildren.length - 1].value.toUpperCase();
    let eShaderType: EFunctionType = EFunctionType.k_Vertex;

    if (sType === 'VERTEXSHADER') {
        eShaderType = EFunctionType.k_Vertex
    }
    else if (sType === 'PIXELSHADER') {
        eShaderType = EFunctionType.k_Pixel;
    }
    else {
        console.error('unknown shader type');
        return;
    }

    const pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
    const pExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
    const pCompileExpr: CompileExprInstruction = <CompileExprInstruction>analyzeExpr(context, scope, pExprNode);
    const pShaderFunc: IFunctionDeclInstruction = pCompileExpr.function;

    if (eShaderType === EFunctionType.k_Vertex) {
        if (!pShaderFunc.checkDefenitionForVertexUsage()) {
            _error(context, node, EEffectErrors.BAD_FUNCTION_VERTEX_DEFENITION, { funcDef: pShaderFunc.toString() });
        }
    }
    else {
        if (!pShaderFunc.checkDefenitionForPixelUsage()) {
            _error(context, node, EEffectErrors.BAD_FUNCTION_PIXEL_DEFENITION, { funcDef: pShaderFunc.toString() });
        }
    }

    pShaderFunc.markUsedAs(eShaderType);
}


function analyzePassStateIfForShader(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = node.children;

    if (pChildren.length === 5) {
        analyzePassStateBlockForShaders(context, scope, pChildren[0], pPass);
    }
    else if (pChildren.length === 7 && pChildren[0].name === 'PassStateBlock') {
        analyzePassStateBlockForShaders(context, scope, pChildren[2], pPass);
        analyzePassStateBlockForShaders(context, scope, pChildren[0], pPass);
    }
    else {
        analyzePassStateBlockForShaders(context, scope, pChildren[2], pPass);
        analyzePassStateIfForShader(context, scope, pChildren[0], pPass);
    }
}



function resumeTechniqueAnalysis(context: Context, scope: ProgramScope, pTechnique: ITechniqueInstruction): void {
    const pPassList: IPassInstruction[] = pTechnique.passList;

    for (let i: number = 0; i < pPassList.length; i++) {
        resumePassAnalysis(context, scope, pPassList[i]);
    }
}


function resumePassAnalysis(context: Context, scope: ProgramScope, pPass: IPassInstruction): void {
    const node: IParseNode = pPass.sourceNode;


    const pChildren: IParseNode[] = node.children;

    analyzePassStateBlock(context, scope, pChildren[0], pPass);

    pPass.finalizePass();
}


function analyzePassStateBlock(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = node.children;
    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassState(context, scope, pChildren[i], pPass);
    }
}


function analyzePassState(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = node.children;

    {
        const sType: string = pChildren[pChildren.length - 1].value.toUpperCase();
        const eType: ERenderStates = getRenderState(sType);
        const pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
        const pExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];

        if (isNull(pExprNode.value) || isNull(eType)) {
            logger.warn('So pass state are incorrect');
            return;
        }

        if (pExprNode.value === '{' && pStateExprNode.children.length > 3) {
            const pValues: ERenderStateValues[] = new Array(Math.ceil((pStateExprNode.children.length - 2) / 2));
            for (let i: number = pStateExprNode.children.length - 2, j: number = 0; i >= 1; i -= 2, j++) {
                pValues[j] = getRenderStateValue(eType, pStateExprNode.children[i].value.toUpperCase());
            }

            switch (eType) {
                case ERenderStates.BLENDFUNC:
                    if (pValues.length !== 2) {
                        logger.warn('So pass state are incorrect');
                        return;
                    }
                    pPass.setState(ERenderStates.SRCBLENDCOLOR, pValues[0]);
                    pPass.setState(ERenderStates.SRCBLENDALPHA, pValues[0]);
                    pPass.setState(ERenderStates.DESTBLENDCOLOR, pValues[1]);
                    pPass.setState(ERenderStates.DESTBLENDALPHA, pValues[1]);
                    break;

                case ERenderStates.BLENDFUNCSEPARATE:
                    if (pValues.length !== 4) {
                        logger.warn('So pass state are incorrect');
                        return;
                    }
                    pPass.setState(ERenderStates.SRCBLENDCOLOR, pValues[0]);
                    pPass.setState(ERenderStates.SRCBLENDALPHA, pValues[2]);
                    pPass.setState(ERenderStates.DESTBLENDCOLOR, pValues[1]);
                    pPass.setState(ERenderStates.DESTBLENDALPHA, pValues[3]);
                    break;

                case ERenderStates.BLENDEQUATIONSEPARATE:
                    if (pValues.length !== 2) {
                        logger.warn('So pass state are incorrect');
                        return;
                    }
                    pPass.setState(ERenderStates.BLENDEQUATIONCOLOR, pValues[0]);
                    pPass.setState(ERenderStates.BLENDEQUATIONALPHA, pValues[1]);
                    break;

                default:
                    logger.warn('So pass state are incorrect');
                    return;
            }
        }
        else {
            let sValue: string = '';
            if (pExprNode.value === '{') {
                sValue = pStateExprNode.children[1].value.toUpperCase();
            }
            else {
                sValue = pExprNode.value.toUpperCase();
            }

            const eValue: ERenderStateValues = getRenderStateValue(eType, sValue);

            if (eValue !== ERenderStateValues.UNDEF) {
                switch (eType) {
                    case ERenderStates.SRCBLEND:
                        pPass.setState(ERenderStates.SRCBLENDCOLOR, eValue);
                        pPass.setState(ERenderStates.SRCBLENDALPHA, eValue);
                        break;
                    case ERenderStates.DESTBLEND:
                        pPass.setState(ERenderStates.DESTBLENDCOLOR, eValue);
                        pPass.setState(ERenderStates.DESTBLENDALPHA, eValue);
                        break;
                    case ERenderStates.BLENDEQUATION:
                        pPass.setState(ERenderStates.BLENDEQUATIONCOLOR, eValue);
                        pPass.setState(ERenderStates.BLENDEQUATIONALPHA, eValue);
                        break;
                    default:
                        pPass.setState(eType, eValue);
                        break;
                }
            }
        }
    }

}


function analyzeImportDecl(context: Context, node: IParseNode, pTechnique: ITechniqueInstruction = null): void {
    const pChildren: IParseNode[] = node.children;
    const sComponentName: string = analyzeComplexName(pChildren[pChildren.length - 2]);
    // let iShift: number = 0;

    if (pChildren[0].name === 'ExtOpt') {
        logger.warn('We don`t suppor ext-commands for import');
    }
    if (pChildren.length !== 2) {
        // iShift = analyzeShiftOpt(pChildren[0]);
    }

    if (!isNull(pTechnique)) {
        //We can import techniques from the same file, but on this stage they don`t have component yet.
        //So we need special mehanism to add them on more belated stage
        // let sShortedComponentName: string = sComponentName;
        if (context.provideNameSpace !== '') {
            // sShortedComponentName = sComponentName.replace(_sProvideNameSpace + ".", "");
        }

        throw null;
        // let pTechniqueFromSameEffect: ITechniqueInstruction = _pTechniqueMap[sComponentName] || _pTechniqueMap[sShortedComponentName];
        // if (isDefAndNotNull(pTechniqueFromSameEffect)) {
        //     pTechnique._addTechniqueFromSameEffect(pTechniqueFromSameEffect, iShift);
        //     return;
        // }
    }

    const pSourceTechnique: ITechniqueInstruction = fx.techniques[sComponentName];
    if (!pSourceTechnique) {
        _error(context, node, EEffectErrors.BAD_IMPORTED_COMPONENT_NOT_EXIST, { componentName: sComponentName });
        return;
    }

    throw null;
}


function analyzeStructDecl(context: Context, scope: ProgramScope, node: IParseNode): ITypeInstruction {
    const pChildren: IParseNode[] = node.children;

    const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction(node);
    const pFieldCollector: IInstruction = new InstructionCollector();

    const name: string = pChildren[pChildren.length - 2].value;

    pStruct.name = name;

    scope.pushScope(EScopeType.k_Struct);

    let i: number = 0;
    for (i = pChildren.length - 4; i >= 1; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(context, scope, pChildren[i], pFieldCollector);
        }
    }

    scope.popScope();

    pStruct.addFields(pFieldCollector, true);

    checkInstruction(context, pStruct, ECheckStage.CODE_TARGET_SUPPORT);
    return pStruct;
}


function analyzeTypeDecl(context: Context, scope: ProgramScope, node: IParseNode, pParentInstruction: IInstruction = null): ITypeDeclInstruction {
    let pChildren: IParseNode[] = node.children;

    let pTypeDeclInstruction: ITypeDeclInstruction = new TypeDeclInstruction(node);

    if (pChildren.length === 2) {
        const pStructInstruction: ComplexTypeInstruction = <ComplexTypeInstruction>analyzeStructDecl(context, scope, pChildren[1]);
        pTypeDeclInstruction.push(pStructInstruction, true);
    }
    else {
        _error(context, node, EEffectErrors.UNSUPPORTED_TYPEDECL);
    }

    checkInstruction(context, pTypeDeclInstruction, ECheckStage.CODE_TARGET_SUPPORT);
    addTypeDecl(context, scope, pTypeDeclInstruction);

    if (!isNull(pParentInstruction)) {
        pParentInstruction.push(pTypeDeclInstruction, true);
    }

    return pTypeDeclInstruction;
}


function analyzeGlobalTypeDecls(context: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'TypeDecl') {
            analyzeTypeDecl(context, scope, pChildren[i]);
        }
    }
}


function analyzeFunctionDefinitions(context: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'FunctionDecl') {
            analyzeFunctionDeclOnlyDefinition(context, scope, pChildren[i]);
        }
    }
}


function analyzeGlobalImports(context: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'ImportDecl') {
            analyzeImportDecl(context, pChildren[i], null);
        }
    }
}


function analyzeTechniqueImports(context: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'TechniqueDecl') {
            analyzeTechniqueForImport(context, scope, pChildren[i]);
        }
    }
}


function analyzeVariableDecls(context: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(context, scope, pChildren[i]);
        }
        else if (pChildren[i].name === 'VarStructDecl') {
            analyzeVarStructDecl(context, scope, pChildren[i]);
        }
    }
}


function analyzeFunctionDecls(context: Context, scope: ProgramScope): void {
    for (let i: number = 0; i < context.functionWithImplementationList.length; i++) {
        resumeFunctionAnalysis(context, scope, context.functionWithImplementationList[i]);
    }

    checkFunctionsForRecursion(context);
    checkFunctionForCorrectUsage(context);
    generateInfoAboutUsedData(context);
    generateShadersFromFunctions(context);
}


function analyzeTechniques(context: Context, scope: ProgramScope): void {
    for (let name in context.techniqueMap) {
        resumeTechniqueAnalysis(context, scope, context.techniqueMap[name]);
    }
}


initSystemTypes();
initSystemFunctions();
initSystemVariables();

// TODO: refactor context data!
class Context {
    public analyzedFileName: string | null = null;
    public provideNameSpace: string | null = null;
    public currentFunction: IFunctionDeclInstruction | null = null;
    public haveCurrentFunctionReturnOccur: boolean = false;
    public functionWithImplementationList: IFunctionDeclInstruction[] = [];
    public techniqueMap: IMap<ITechniqueInstruction> = {};

    constructor (filename: string) {
        this.analyzedFileName = filename;
    }
}


function analyze(sAnalyzedFileName: string, pTree: IParseTree): boolean {
    const context: Context = new Context(sAnalyzedFileName);

    const scope: ProgramScope = new ProgramScope();

    let iParseTime: number = time();

    try {
        scope.pushScope();

        analyzeGlobalUseDecls(context, scope, pTree);
        analyzeGlobalProvideDecls(context, scope, pTree);
        analyzeGlobalTypeDecls(context, scope, pTree);
        analyzeFunctionDefinitions(context, scope, pTree);
        analyzeGlobalImports(context, scope, pTree);
        analyzeTechniqueImports(context, scope, pTree);
        analyzeVariableDecls(context, scope, pTree);
        analyzeFunctionDecls(context, scope);
        analyzeTechniques(context, scope);

        scope.popScope();
    }
    catch (e) {
        throw e;
    }

    console.log('analyze time: ', time() - iParseTime);

    return true;
}


