import { EScopeType } from '../idl/IScope'
import { IParseNode, IParseTree } from '../idl/parser/IParser';
import {
    IAFXInstruction, IAFXFunctionDeclInstruction, IAFXPassInstruction, IAFXSimpleInstruction,
    IAFXVariableDeclInstruction, IAFXTechniqueInstruction, IAFXTypedInstruction,
    IAFXVariableTypeInstruction, IAFXIdInstruction, IAFXTypeInstruction, IAFXTypeDeclInstruction,
    IAFXInstructionError, IAFXExprInstruction, EFunctionType, EAFXInstructionTypes, ECheckStage,
    IAFXAnnotationInstruction, IAFXInitExprInstruction, IAFXIdExprInstruction, IAFXStmtInstruction,
    IAFXDeclInstruction, IAFXLiteralInstruction
} from '../idl/IAFXInstruction';
import { IAFXEffect } from '../idl/IAFXEffect';
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
import { PrimaryExprInstruction } from './instructions/PrimaryExprInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { PostfixIndexInstruction } from './instructions/PostfixIndexInstruction';
import { PostfixArithmeticInstruction } from './instructions/PostfixArithmeticInstruction';
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';
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
import { MemExprInstruction } from './instructions/MemExprInstruction';
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


const TEMPLATE_TYPE = 'template';


function getNodeSourceLocation(pNode: IParseNode): { line: number; column: number; } | null {
    if (!isDefAndNotNull(pNode)) {
        return null;
    }
    if (isDef(pNode.line)) {
        return { line: pNode.line, column: pNode.start };
    } else {
        return getNodeSourceLocation(pNode.children[pNode.children.length - 1]);
    }
}


let pSystemTypes: IMap<SystemTypeInstruction> = {};
let pSystemFunctionsMap: IMap<SystemFunctionInstruction[]> = {};
let pSystemVariables: IMap<IAFXVariableDeclInstruction> = {};
let pSystemVertexOut: ComplexTypeInstruction = null;
let pSystemFunctionHashMap: IMap<boolean> = {};

function generateSystemType(
    sName: string,
    sRealName: string,
    iSize: number = 1,
    isArray: boolean = false,
    pElementType: IAFXTypeInstruction = null,
    iLength: number = 1
): IAFXTypeInstruction {

    if (isDef(pSystemTypes[sName])) {
        return null;
    }

    let pSystemType: SystemTypeInstruction = new SystemTypeInstruction();

    pSystemType._setName(sName);
    pSystemType.setRealName(sRealName);
    pSystemType.setSize(iSize);
    if (isArray) {
        pSystemType.addIndex(pElementType, iLength);
    }

    pSystemTypes[sName] = pSystemType;
    pSystemType._setBuiltIn(true);

    return pSystemType;
}

function addFieldsToVectorFromSuffixObject(pSuffixMap: IMap<boolean>, pType: IAFXTypeInstruction, sBaseType: string) {
    let sSuffix: string = null;

    for (sSuffix in pSuffixMap) {
        let sFieldTypeName: string = sBaseType + ((sSuffix.length > 1) ? sSuffix.length.toString() : '');
        let pFieldType: IAFXTypeInstruction = getSystemType(sFieldTypeName);

        (<SystemTypeInstruction>pType).addField(sSuffix, pFieldType, pSuffixMap[sSuffix]);
    }
}

function generateNotBuildtInSystemType(sName: string, sRealName: string, sDeclString: string,
    iSize: number = 1, isArray: boolean = false,
    pElementType: IAFXTypeInstruction = null, iLength: number = 1
): IAFXTypeInstruction {

    if (isDef(pSystemTypes[sName])) {
        return null;
    }

    let pSystemType: SystemTypeInstruction = new SystemTypeInstruction();
    pSystemType._setName(sName);
    pSystemType.setRealName(sRealName);
    pSystemType.setSize(iSize);
    pSystemType.setDeclString(sDeclString);

    if (isArray) {
        pSystemType.addIndex(pElementType, iLength);
    }

    pSystemTypes[sName] = pSystemType;
    pSystemType._setBuiltIn(false);

    let pSystemTypeDecl: IAFXTypeDeclInstruction = new TypeDeclInstruction();
    pSystemTypeDecl._push(pSystemType, true);
    pSystemTypeDecl._setBuiltIn(false);

    return pSystemType;
}

function addSystemTypeScalar(): void {
    generateSystemType('void', 'void', 0);
    generateSystemType('number', 'number', 1);
    generateSystemType('bool', 'bool', 1);
    generateSystemType('float', 'float', 1);
    generateSystemType('ptr', 'float', 1);
    generateSystemType('string', '', 0);
    generateSystemType('texture', '', 0);
    generateSystemType('sampler', 'sampler2D', 1);
    generateSystemType('sampler2D', 'sampler2D', 1);
    generateSystemType('samplerCUBE', 'samplerCube', 1);
    generateSystemType('video_buffer', 'sampler2D', 1);


    generateNotBuildtInSystemType('video_buffer_header', 'A_TextureHeader',
        'struct A_TextureHeader { float width; float height; float stepX; float stepY; }');
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

    let pFloat: IAFXTypeInstruction = getSystemType('float');
    let pInt: IAFXTypeInstruction = getSystemType('number');
    let pBool: IAFXTypeInstruction = getSystemType('bool');

    let pFloat2: IAFXTypeInstruction = generateSystemType('float2', 'vec2', 0, true, pFloat, 2);
    let pFloat3: IAFXTypeInstruction = generateSystemType('float3', 'vec3', 0, true, pFloat, 3);
    let pFloat4: IAFXTypeInstruction = generateSystemType('float4', 'vec4', 0, true, pFloat, 4);

    let pInt2: IAFXTypeInstruction = generateSystemType('int2', 'ivec2', 0, true, pInt, 2);
    let pInt3: IAFXTypeInstruction = generateSystemType('int3', 'ivec3', 0, true, pInt, 3);
    let pInt4: IAFXTypeInstruction = generateSystemType('int4', 'ivec4', 0, true, pInt, 4);

    let pBool2: IAFXTypeInstruction = generateSystemType('bool2', 'bvec2', 0, true, pBool, 2);
    let pBool3: IAFXTypeInstruction = generateSystemType('bool3', 'bvec3', 0, true, pBool, 3);
    let pBool4: IAFXTypeInstruction = generateSystemType('bool4', 'bvec4', 0, true, pBool, 4);

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
    let pFloat2: IAFXTypeInstruction = getSystemType('float2');
    let pFloat3: IAFXTypeInstruction = getSystemType('float3');
    let pFloat4: IAFXTypeInstruction = getSystemType('float4');

    let pInt2: IAFXTypeInstruction = getSystemType('int2');
    let pInt3: IAFXTypeInstruction = getSystemType('int3');
    let pInt4: IAFXTypeInstruction = getSystemType('int4');

    let pBool2: IAFXTypeInstruction = getSystemType('bool2');
    let pBool3: IAFXTypeInstruction = getSystemType('bool3');
    let pBool4: IAFXTypeInstruction = getSystemType('bool4');

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

    let pOutBasetype: ComplexTypeInstruction = new ComplexTypeInstruction();

    let pPosition: VariableDeclInstruction = new VariableDeclInstruction(null);
    let pPointSize: VariableDeclInstruction = new VariableDeclInstruction(null);
    let pPositionType: VariableTypeInstruction = new VariableTypeInstruction(null);
    let pPointSizeType: VariableTypeInstruction = new VariableTypeInstruction(null);
    let pPositionId: IdInstruction = new IdInstruction(null);
    let pPointSizeId: IdInstruction = new IdInstruction(null);

    pPositionType._pushType(getSystemType('float4'));
    pPointSizeType._pushType(getSystemType('float'));

    pPositionId._setName('pos');
    pPositionId._setRealName('POSITION');

    pPointSizeId._setName('psize');
    pPointSizeId._setRealName('PSIZE');

    pPosition._push(pPositionType, true);
    pPosition._push(pPositionId, true);

    pPointSize._push(pPointSizeType, true);
    pPointSize._push(pPointSizeId, true);

    pPosition._setSemantic('POSITION');
    pPointSize._setSemantic('PSIZE');

    let pFieldCollector: IAFXInstruction = new InstructionCollector();
    pFieldCollector._push(pPosition, false);
    pFieldCollector._push(pPointSize, false);

    pOutBasetype.addFields(pFieldCollector, true);

    pOutBasetype._setName('VS_OUT');
    pOutBasetype.setRealName('VS_OUT_S');

    pSystemVertexOut = pOutBasetype;
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


function getExternalType(pType: IAFXTypeInstruction): any {
    if (pType._isEqual(getSystemType('number')) ||
        pType._isEqual(getSystemType('float'))) {
        return Number;
    }
    else if (pType._isEqual(getSystemType('bool'))) {
        return 'Boolean';
    }
    else if (pType._isEqual(getSystemType('float2')) ||
        pType._isEqual(getSystemType('bool2')) ||
        pType._isEqual(getSystemType('int2'))) {
        return 'Vec2';
    }
    else if (pType._isEqual(getSystemType('float3')) ||
        pType._isEqual(getSystemType('bool3')) ||
        pType._isEqual(getSystemType('int3'))) {
        return 'Vec3';
    }
    else if (pType._isEqual(getSystemType('float4')) ||
        pType._isEqual(getSystemType('bool4')) ||
        pType._isEqual(getSystemType('int4'))) {
        return 'Vec4';
    }
    else if (pType._isEqual(getSystemType('float2x2')) ||
        pType._isEqual(getSystemType('bool2x2')) ||
        pType._isEqual(getSystemType('int2x2'))) {
        return 'Vec2';
    }
    else if (pType._isEqual(getSystemType('float3x3')) ||
        pType._isEqual(getSystemType('bool3x3')) ||
        pType._isEqual(getSystemType('int3x3'))) {
        return 'Mat3';
    }
    else if (pType._isEqual(getSystemType('float4x4')) ||
        pType._isEqual(getSystemType('bool4x4')) ||
        pType._isEqual(getSystemType('int4x4'))) {
        return 'Mat4';
    }
    else {
        return null;
    }
}

export function isMatrixType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('float2x2')) ||
        pType._isEqual(getSystemType('float3x3')) ||
        pType._isEqual(getSystemType('float4x4')) ||
        pType._isEqual(getSystemType('int2x2')) ||
        pType._isEqual(getSystemType('int3x3')) ||
        pType._isEqual(getSystemType('int4x4')) ||
        pType._isEqual(getSystemType('bool2x2')) ||
        pType._isEqual(getSystemType('bool3x3')) ||
        pType._isEqual(getSystemType('bool4x4'));
}

export function isVectorType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('float2')) ||
        pType._isEqual(getSystemType('float3')) ||
        pType._isEqual(getSystemType('float4')) ||
        pType._isEqual(getSystemType('bool2')) ||
        pType._isEqual(getSystemType('bool3')) ||
        pType._isEqual(getSystemType('bool4')) ||
        pType._isEqual(getSystemType('int2')) ||
        pType._isEqual(getSystemType('int3')) ||
        pType._isEqual(getSystemType('int4'));
}

export function isScalarType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('bool')) ||
        pType._isEqual(getSystemType('number')) ||
        pType._isEqual(getSystemType('ptr')) ||
        pType._isEqual(getSystemType('float'));
}

export function isFloatBasedType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('float')) ||
        pType._isEqual(getSystemType('float2')) ||
        pType._isEqual(getSystemType('float3')) ||
        pType._isEqual(getSystemType('float4')) ||
        pType._isEqual(getSystemType('float2x2')) ||
        pType._isEqual(getSystemType('float3x3')) ||
        pType._isEqual(getSystemType('float4x4')) ||
        pType._isEqual(getSystemType('ptr'));
}

export function isIntBasedType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('number')) ||
        pType._isEqual(getSystemType('int2')) ||
        pType._isEqual(getSystemType('int3')) ||
        pType._isEqual(getSystemType('int4')) ||
        pType._isEqual(getSystemType('int2x2')) ||
        pType._isEqual(getSystemType('int3x3')) ||
        pType._isEqual(getSystemType('int4x4'));
}

export function isBoolBasedType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('bool')) ||
        pType._isEqual(getSystemType('bool2')) ||
        pType._isEqual(getSystemType('bool3')) ||
        pType._isEqual(getSystemType('bool4')) ||
        pType._isEqual(getSystemType('bool2x2')) ||
        pType._isEqual(getSystemType('bool3x3')) ||
        pType._isEqual(getSystemType('bool4x4'));
}

export function isSamplerType(pType: IAFXTypeInstruction): boolean {
    return pType._isEqual(getSystemType('sampler')) ||
        pType._isEqual(getSystemType('sampler2D')) ||
        pType._isEqual(getSystemType('samplerCUBE')) ||
        pType._isEqual(getSystemType('video_buffer'));
}


function generateSystemFunction(sName: string, sTranslationExpr: string,
    sReturnTypeName: string,
    pArgumentsTypes: string[],
    pTemplateTypes: string[],
    isForVertex: boolean = true, isForPixel: boolean = true): void {

    var pExprTranslator: ExprTemplateTranslator = new ExprTemplateTranslator(sTranslationExpr);
    var pSystemFunctions: IMap<SystemFunctionInstruction[]> = pSystemFunctionsMap;
    var pTypes: IAFXTypeInstruction[] = null;
    var sFunctionHash: string = "";
    var pReturnType: IAFXTypeInstruction = null;
    var pFunction: SystemFunctionInstruction = null;

    if (!isNull(pTemplateTypes)) {
        for (var i: number = 0; i < pTemplateTypes.length; i++) {
            pTypes = [];
            sFunctionHash = sName + "(";
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

            if (pSystemFunctionHashMap[sFunctionHash]) {
                _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: sFunctionHash });
            }

            pFunction = new SystemFunctionInstruction(sName, pReturnType, pExprTranslator, pTypes);

            if (!isDef(pSystemFunctions[sName])) {
                pSystemFunctions[sName] = [];
            }

            pFunction._setForVertex(isForVertex);
            pFunction._setForPixel(isForPixel);

            pSystemFunctions[sName].push(pFunction);
            pFunction._setBuiltIn(true);
        }
    }
    else {

        if (sReturnTypeName === TEMPLATE_TYPE) {
            logger.critical("Bad return type(TEMPLATE_TYPE) for system function '" + sName + "'.");
        }

        pReturnType = getSystemType(sReturnTypeName);
        pTypes = [];
        sFunctionHash = sName + "(";

        for (var i: number = 0; i < pArgumentsTypes.length; i++) {
            if (pArgumentsTypes[i] === TEMPLATE_TYPE) {
                logger.critical("Bad argument type(TEMPLATE_TYPE) for system function '" + sName + "'.");
            }
            else {
                pTypes.push(getSystemType(pArgumentsTypes[i]));
                sFunctionHash += pArgumentsTypes[i] + ",";
            }
        }

        sFunctionHash += ")";

        if (pSystemFunctionHashMap[sFunctionHash]) {
            _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: sFunctionHash });
        }

        pFunction = new SystemFunctionInstruction(sName, pReturnType, pExprTranslator, pTypes);

        pFunction._setForVertex(isForVertex);
        pFunction._setForPixel(isForPixel);

        if (!isDef(pSystemFunctions[sName])) {
            pSystemFunctions[sName] = [];
        }

        pSystemFunctions[sName].push(pFunction);
        pFunction._setBuiltIn(true);
    }

}

function generateNotBuiltInSystemFuction(sName: string, sDefenition: string, sImplementation: string,
    sReturnType: string,
    pUsedTypes: string[],
    pUsedFunctions: string[]): void {

    if (isDef(pSystemFunctionsMap[sName])) {
        return;
    }

    let pReturnType: IAFXTypeInstruction = getSystemType(sReturnType);
    let pFunction: SystemFunctionInstruction = new SystemFunctionInstruction(sName, pReturnType, null, null);

    pFunction.setDeclCode(sDefenition, sImplementation);

    let pUsedExtSystemTypes: IAFXTypeDeclInstruction[] = [];
    let pUsedExtSystemFunctions: IAFXFunctionDeclInstruction[] = [];

    if (!isNull(pUsedTypes)) {
        for (let i: number = 0; i < pUsedTypes.length; i++) {
            let pTypeDecl: IAFXTypeDeclInstruction = <IAFXTypeDeclInstruction>getSystemType(pUsedTypes[i])._getParent();
            if (!isNull(pTypeDecl)) {
                pUsedExtSystemTypes.push(pTypeDecl);
            }
        }
    }

    if (!isNull(pUsedFunctions)) {
        for (let i: number = 0; i < pUsedFunctions.length; i++) {
            let pFindFunction: IAFXFunctionDeclInstruction = findSystemFunction(pUsedFunctions[i], null);
            pUsedExtSystemFunctions.push(pFindFunction);
        }
    }

    pFunction.setUsedSystemData(pUsedExtSystemTypes, pUsedExtSystemFunctions);
    pFunction.closeSystemDataInfo();
    pFunction._setBuiltIn(false);

    pSystemFunctionsMap[sName] = [pFunction];
}


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
    console.assert(isNull(pSystemTypes));

    addSystemTypeScalar();
    addSystemTypeVector();
    addSystemTypeMatrix();

    generateBaseVertexOutput();
}


function initSystemFunctions(): void {
    console.assert(isNull(pSystemFunctionsMap));
    addSystemFunctions();
}


function generateSystemVariable(sName: string, sRealName: string, sTypeName: string,
    isForVertex: boolean, isForPixel: boolean, isOnlyRead: boolean): void {

    if (isDef(pSystemVariables[sName])) {
        return;
    }

    let pVariableDecl: IAFXVariableDeclInstruction = new VariableDeclInstruction(null);
    let pName: IAFXIdInstruction = new IdInstruction(null);
    let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction(null);

    pName._setName(sName);
    pName._setRealName(sRealName);

    pType._pushType(getSystemType(sTypeName));

    if (isOnlyRead) {
        pType._canWrite(false);
    }

    pVariableDecl._setForVertex(isForVertex);
    pVariableDecl._setForPixel(isForPixel);

    pVariableDecl._push(pType, true);
    pVariableDecl._push(pName, true);

    pSystemVariables[sName] = pVariableDecl;

    pVariableDecl._setBuiltIn(true);
}


function generatePassEngineVariable(): void {
    let pVariableDecl: IAFXVariableDeclInstruction = new VariableDeclInstruction(null);
    let pName: IAFXIdInstruction = new IdInstruction(null);
    let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction(null);

    pType._canWrite(false);

    pType._markAsUnverifiable(true);
    pName._setName('engine');
    pName._setRealName('engine');

    pVariableDecl._push(pType, true);
    pVariableDecl._push(pName, true);

    pSystemVariables['engine'] = pVariableDecl;
}


function addSystemVariables(): void {
    generateSystemVariable('fragColor', 'gl_FragColor', 'float4', false, true, true);
    generateSystemVariable('fragCoord', 'gl_FragCoord', 'float4', false, true, true);
    generateSystemVariable('frontFacing', 'gl_FrontFacing', 'bool', false, true, true);
    generateSystemVariable('pointCoord', 'gl_PointCoord', 'float2', false, true, true);
    generateSystemVariable('resultAFXColor', 'resultAFXColor', 'float4', false, true, true);

    //Engine variable for passes
    generatePassEngineVariable();
}


function initSystemVariables(): void {
    console.assert(isNull(pSystemVariables))
    addSystemVariables();
}


function findSystemFunction(sFunctionName: string,
    pArguments: IAFXTypedInstruction[]): IAFXFunctionDeclInstruction {
    let pSystemFunctions: SystemFunctionInstruction[] = pSystemFunctionsMap[sFunctionName];

    if (!isDef(pSystemFunctions)) {
        return null;
    }

    if (isNull(pArguments)) {
        for (let i: number = 0; i < pSystemFunctions.length; i++) {
            if (pSystemFunctions[i]._getNumNeededArguments() === 0) {
                return <IAFXFunctionDeclInstruction>pSystemFunctions[i];
            }
        }
    }

    for (let i: number = 0; i < pSystemFunctions.length; i++) {
        if (pArguments.length !== pSystemFunctions[i]._getNumNeededArguments()) {
            continue;
        }

        let pTestedArguments: IAFXTypedInstruction[] = pSystemFunctions[i]._getArguments();

        let isOk: boolean = true;

        for (let j: number = 0; j < pArguments.length; j++) {
            isOk = false;

            if (!pArguments[j]._getType()._isEqual(pTestedArguments[j]._getType())) {
                break;
            }

            isOk = true;
        }

        if (isOk) {
            return <IAFXFunctionDeclInstruction>pSystemFunctions[i];
        }
    }
    return null;
}


function findFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IAFXExprInstruction[]): IAFXFunctionDeclInstruction;
function findFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IAFXVariableDeclInstruction[]): IAFXFunctionDeclInstruction;
function findFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IAFXTypedInstruction[]): IAFXFunctionDeclInstruction {
    return findSystemFunction(sFunctionName, pArguments) ||
        pScope._getFunction(sFunctionName, pArguments);
}


function findConstructor(pType: IAFXTypeInstruction,
    pArguments: IAFXExprInstruction[]): IAFXVariableTypeInstruction {

    let pVariableType: IAFXVariableTypeInstruction = new VariableTypeInstruction(null);
    pVariableType._pushType(pType);

    return pVariableType;
}


function findShaderFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IAFXExprInstruction[]): IAFXFunctionDeclInstruction {
    return pScope._getShaderFunction(sFunctionName, pArguments);
}


function findFunctionByDef(pScope: ProgramScope, pDef: FunctionDefInstruction): IAFXFunctionDeclInstruction {
    return findFunction(pScope, pDef._getName(), pDef.getArguments());
}


export function getBaseVertexOutType(): ComplexTypeInstruction {
    return pSystemVertexOut;
}


export function getSystemType(sTypeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    return pSystemTypes[sTypeName] || null;
}


export function getSystemVariable(sName: string): IAFXVariableDeclInstruction {
    return pSystemVariables[sName] || null;
}


function getVariable(pScope: ProgramScope, sName: string): IAFXVariableDeclInstruction {
    return getSystemVariable(sName) || pScope._getVariable(sName);
}

function getType(pScope: ProgramScope, sTypeName: string): IAFXTypeInstruction {
    return getSystemType(sTypeName) || pScope._getType(sTypeName);
}

function isSystemFunction(pFunction: IAFXFunctionDeclInstruction): boolean {
    return false;
}

function isSystemVariable(pVariable: IAFXVariableDeclInstruction): boolean {
    return false;
}

function isSystemType(pType: IAFXTypeDeclInstruction): boolean {
    return false;
}






function _error(pContext: Context, pNode: IParseNode, eCode: number, pInfo: IEffectErrorInfo = {}): void {
    let pLocation: ISourceLocation = <ISourceLocation>{ file: pContext? pContext.analyzedFileName: null, line: 0 };
    let pLineColumn: { line: number; column: number; } = getNodeSourceLocation(pNode);

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


function analyzeUseDecl(scope: ProgramScope): void {
    scope._setStrictModeOn();
}


function analyzeComplexName(pNode: IParseNode): string {
    const pChildren: IParseNode[] = pNode.children;
    let sName: string = '';

    for (let i: number = pChildren.length - 1; i >= 0; i--) {
        sName += pChildren[i].value;
    }

    return sName;
}


function analyzeGlobalUseDecls(scope: ProgramScope, parseTree: IParseTree): void {
    let pChildren: IParseNode[] = parseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'UseDecl') {
            analyzeUseDecl(scope); // << always 'use strict' by default!
        }
    }
}


function analyzeProvideDecl(pContext: Context, pNode: IParseNode): void {
    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 2) {
        pContext.provideNameSpace = analyzeComplexName(pChildren[0]);
    }
    else {
        _error(pContext, pNode, EEffectTempErrors.UNSUPPORTED_PROVIDE_AS);
        return;
    }
}


function analyzeGlobalProvideDecls(pContext: Context, scope: ProgramScope, parseTree: IParseTree): void {
    let pChildren: IParseNode[] = parseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'ProvideDecl') {
            analyzeProvideDecl(pContext, pChildren[i]);
        }
    }
}


function analyzeInitExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXInitExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pInitExpr: IAFXInitExprInstruction = new InitExprInstruction();

    if (pChildren.length === 1) {
        pInitExpr._push(analyzeExpr(pContext, pScope, pChildren[0]), true);
    }
    else {
        for (let i: number = 0; i < pChildren.length; i++) {
            if (pChildren[i].name === 'InitExpr') {
                pInitExpr._push(analyzeInitExpr(pContext, pScope, pChildren[i]), true);
            }
        }
    }

    return pInitExpr;
}



function _errorFromInstruction(pContext: Context, pNode: IParseNode, pError: IAFXInstructionError): void {
    _error(pContext, pNode, pError.code, isNull(pError.info) ? {} : pError.info);
}


function checkInstruction(pContext: Context, pInst: IAFXInstruction, eStage: ECheckStage): void {
    if (!pInst._check(eStage)) {
        _errorFromInstruction(pContext, pInst._getSourceNode(), pInst._getLastError());
    }
}


function addVariableDecl(pContext: Context, pScope: ProgramScope, pVariable: IAFXVariableDeclInstruction): void {
    if (isSystemVariable(pVariable)) {
        _error(pContext, pVariable._getSourceNode(), EEffectErrors.REDEFINE_SYSTEM_VARIABLE, { varName: pVariable._getName() });
    }

    let isVarAdded: boolean = pScope._addVariable(pVariable);

    if (!isVarAdded) {
        let eScopeType: EScopeType = pScope._getScopeType();

        switch (eScopeType) {
            case EScopeType.k_Default:
                _error(pContext, pVariable._getSourceNode(), EEffectErrors.REDEFINE_VARIABLE, { varName: pVariable._getName() });
                break;
            case EScopeType.k_Struct:
                _error(pContext, pVariable._getSourceNode(), EEffectErrors.BAD_NEW_FIELD_FOR_STRUCT_NAME, { fieldName: pVariable._getName() });
                break;
            case EScopeType.k_Annotation:
                _error(pContext, pVariable._getSourceNode(), EEffectErrors.BAD_NEW_ANNOTATION_VAR, { varName: pVariable._getName() });
                break;
        }
    }

    if (pVariable._getName() === 'Out' && !isNull(pContext.currentFunction)) {
        let isOk: boolean = pContext.currentFunction._addOutVariable(pVariable);
        if (!isOk) {
            _error(pContext, pVariable._getSourceNode(), EEffectErrors.BAD_OUT_VARIABLE_IN_FUNCTION);
        }
    }
}


function addTypeDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pType: IAFXTypeDeclInstruction): void {
    if (isSystemType(pType)) {
        _error(pContext, pNode, EEffectErrors.REDEFINE_SYSTEM_TYPE, { typeName: pType._getName() });
    }

    let isTypeAdded: boolean = pScope._addType(pType);

    if (!isTypeAdded) {
        _error(pContext, pNode, EEffectErrors.REDEFINE_TYPE, { typeName: pType._getName() });
    }
}


function addFunctionDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pFunction: IAFXFunctionDeclInstruction): void {
    if (isSystemFunction(pFunction)) {
        _error(pContext, pNode, EEffectErrors.REDEFINE_SYSTEM_FUNCTION, { funcName: pFunction._getName() });
    }

    let isFunctionAdded: boolean = pScope._addFunction(pFunction);

    if (!isFunctionAdded) {
        _error(pContext, pNode, EEffectErrors.REDEFINE_FUNCTION, { funcName: pFunction._getName() });
    }
}


function addTechnique(pContext: Context, pNode: IParseNode, pTechnique: IAFXTechniqueInstruction): void {
    let sName: string = pTechnique._getName();

    if (isDef(pContext.techniqueMap[sName])) {
        _error(pContext, pNode, EEffectErrors.BAD_TECHNIQUE_REDEFINE_NAME, { techName: sName });
        return;
    }

    pContext.techniqueMap[sName] = pTechnique;
    pContext.techniqueList.push(pTechnique);
}


function checkFunctionsForRecursion(pContext: Context): void {
    let pFunctionList: IAFXFunctionDeclInstruction[] = pContext.functionWithImplementationList;
    let isNewAdd: boolean = true;
    let isNewDelete: boolean = true;

    while (isNewAdd || isNewDelete) {
        isNewAdd = false;
        isNewDelete = false;

        mainFor:
        for (let i: number = 0; i < pFunctionList.length; i++) {
            let pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
            let pUsedFunctionList: IAFXFunctionDeclInstruction[] = pTestedFunction._getUsedFunctionList();

            if (!pTestedFunction._isUsed()) {
                //logger.warn("Unused function '" + pTestedFunction._getStringDef() + "'.");
                continue mainFor;
            }
            if (pTestedFunction._isBlackListFunction()) {
                continue mainFor;
            }

            if (isNull(pUsedFunctionList)) {
                continue mainFor;
            }

            for (let j: number = 0; j < pUsedFunctionList.length; j++) {
                let pAddedUsedFunctionList: IAFXFunctionDeclInstruction[] = pUsedFunctionList[j]._getUsedFunctionList();

                if (isNull(pAddedUsedFunctionList)) {
                    continue;
                }

                for (let k: number = 0; k < pAddedUsedFunctionList.length; k++) {
                    let pAddedFunction: IAFXFunctionDeclInstruction = pAddedUsedFunctionList[k];
                    let pNode = pAddedFunction._getSourceNode();

                    if (pTestedFunction === pAddedFunction) {
                        pTestedFunction._addToBlackList();
                        isNewDelete = true;
                        _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_USAGE_RECURSION, { funcDef: pTestedFunction._getStringDef() });
                        continue mainFor;
                    }

                    if (pAddedFunction._isBlackListFunction() ||
                        !pAddedFunction._canUsedAsFunction()) {
                        pTestedFunction._addToBlackList();
                        _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_USAGE_BLACKLIST, { funcDef: pTestedFunction._getStringDef() });
                        isNewDelete = true;
                        continue mainFor;
                    }

                    if (pTestedFunction._addUsedFunction(pAddedFunction)) {
                        isNewAdd = true;
                    }
                }
            }
        }
    }
}

function checkFunctionForCorrectUsage(pContext: Context): void {
    let pFunctionList: IAFXFunctionDeclInstruction[] = pContext.functionWithImplementationList;
    let isNewUsageSet: boolean = true;
    let isNewDelete: boolean = true;

    while (isNewUsageSet || isNewDelete) {
        isNewUsageSet = false;
        isNewDelete = false;

        mainFor:
        for (let i: number = 0; i < pFunctionList.length; i++) {
            let pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
            let pUsedFunctionList: IAFXFunctionDeclInstruction[] = pTestedFunction._getUsedFunctionList();

            if (!pTestedFunction._isUsed()) {
                //logger.warn("Unused function '" + pTestedFunction._getStringDef() + "'.");
                continue mainFor;
            }
            if (pTestedFunction._isBlackListFunction()) {
                continue mainFor;
            }

            if (!pTestedFunction._checkVertexUsage()) {
                _error(pContext, pTestedFunction._getSourceNode(), EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction._getStringDef() });
                pTestedFunction._addToBlackList();
                isNewDelete = true;
                continue mainFor;
            }

            if (!pTestedFunction._checkPixelUsage()) {
                _error(pContext, pTestedFunction._getSourceNode(), EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction._getStringDef() });
                pTestedFunction._addToBlackList();
                isNewDelete = true;
                continue mainFor;
            }

            if (isNull(pUsedFunctionList)) {
                continue mainFor;
            }

            for (let j: number = 0; j < pUsedFunctionList.length; j++) {
                let pUsedFunction: IAFXFunctionDeclInstruction = pUsedFunctionList[j];

                if (pTestedFunction._isUsedInVertex()) {
                    if (!pUsedFunction._isForVertex()) {
                        _error(pContext, pUsedFunction._getSourceNode(), EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction._getStringDef() });
                        pTestedFunction._addToBlackList();
                        isNewDelete = true;
                        continue mainFor;
                    }

                    if (!pUsedFunction._isUsedInVertex()) {
                        pUsedFunction._markUsedInVertex();
                        isNewUsageSet = true;
                    }

                }

                if (pTestedFunction._isUsedInPixel()) {
                    if (!pUsedFunction._isForPixel()) {
                        _error(pContext, pUsedFunction._getSourceNode(), EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction._getStringDef() });
                        pTestedFunction._addToBlackList();
                        isNewDelete = true;
                        continue mainFor;
                    }

                    if (!pUsedFunction._isUsedInPixel()) {
                        pUsedFunction._markUsedInPixel();
                        isNewUsageSet = true;
                    }
                }
            }
        }
    }
}


function generateInfoAboutUsedData(pContext: Context): void {
    let pFunctionList: IAFXFunctionDeclInstruction[] = pContext.functionWithImplementationList;

    for (let i: number = 0; i < pFunctionList.length; i++) {
        pFunctionList[i]._generateInfoAboutUsedData();
    }
}


function generateShadersFromFunctions(pContext: Context): void {
    let pFunctionList: IAFXFunctionDeclInstruction[] = pContext.functionWithImplementationList;

    for (let i: number = 0; i < pFunctionList.length; i++) {
        // let pShader: IAFXFunctionDeclInstruction = null;

        if (pFunctionList[i]._isUsedAsVertex()) {
            // pShader = pFunctionList[i]._convertToVertexShader();
        }
        if (pFunctionList[i]._isUsedAsPixel()) {
            // pShader = pFunctionList[i]._convertToPixelShader();
        }

        if (pFunctionList[i]._isErrorOccured()) {
            _errorFromInstruction(pContext, pFunctionList[i]._getSourceNode(), pFunctionList[i]._getLastError());
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
 * @pLeftType {IAFXVariableTypeInstruction} Тип левой части выражения
 * @pRightType {IAFXVariableTypeInstruction} Тип правой части выражения
 */
function checkTwoOperandExprTypes(
    pContext: Context,
    sOperator: string,
    pLeftType: IAFXVariableTypeInstruction,
    pRightType: IAFXVariableTypeInstruction): IAFXVariableTypeInstruction {
    if (pLeftType._isUnverifiable()) {
        return pLeftType;
    }

    if (pRightType._isUnverifiable()) {
        return pRightType;
    }

    const isComplex: boolean = pLeftType._isComplex() || pRightType._isComplex();
    const isArray: boolean = pLeftType._isNotBaseArray() || pRightType._isNotBaseArray();
    const isSampler: boolean = isSamplerType(pLeftType) || isSamplerType(pRightType);
    const pBoolType: IAFXVariableTypeInstruction = getSystemType('bool').getVariableType();

    if (isArray || isSampler) {
        return null;
    }

    if (sOperator === '%' || sOperator === '%=') {
        return null;
    }

    if (isAssignmentOperator(sOperator)) {
        if (!pLeftType._isWritable()) {
            _error(pContext, pLeftType._getSourceNode(), EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        if (!pRightType._isReadable()) {
            _error(pContext, pRightType._getSourceNode(),EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (sOperator !== '=' && !pLeftType._isReadable()) {
            _error(pContext, pLeftType._getSourceNode(), EEffectErrors.BAD_TYPE_FOR_READ);
        }
    }
    else {
        if (!pLeftType._isReadable()) {
            _error(pContext, pLeftType._getSourceNode(), EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!pRightType._isReadable()) {
            _error(pContext, pRightType._getSourceNode(), EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }
    }

    if (isComplex) {
        if (sOperator === '=' && pLeftType._isEqual(pRightType)) {
            return <IAFXVariableTypeInstruction>pLeftType;
        }
        else if (isEqualOperator(sOperator) && !pLeftType._containArray() && !pLeftType._containSampler()) {
            return pBoolType;
        }
        else {
            return null;
        }
    }

    // let pReturnType: IAFXVariableTypeInstruction = null;
    const pLeftBaseType: IAFXVariableTypeInstruction = (<SystemTypeInstruction>pLeftType._getBaseType()).getVariableType();
    const pRightBaseType: IAFXVariableTypeInstruction = (<SystemTypeInstruction>pRightType._getBaseType()).getVariableType();


    if (pLeftType._isConst() && isAssignmentOperator(sOperator)) {
        return null;
    }

    if (pLeftType._isEqual(pRightType)) {
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
                pLeftType._getLength() === pRightType._getLength()) {
                return pRightBaseType;
            }
            else if (isMatrixType(pRightType) && isVectorType(pLeftType) &&
                pLeftType._getLength() === pRightType._getLength()) {
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
 * @pLeftType {IAFXVariableTypeInstruction} Тип операнда
 */
function checkOneOperandExprType(pContext: Context, pNode: IParseNode, sOperator: string,
    pType: IAFXVariableTypeInstruction): IAFXVariableTypeInstruction {

    if (pType._isUnverifiable === undefined) {
        // debug.log(pType);
        throw new Error(pType as any);
    }
    if (pType._isUnverifiable()) {
        return pType;
    }

    const isComplex: boolean = pType._isComplex();
    const isArray: boolean = pType._isNotBaseArray();
    const isSampler: boolean = isSamplerType(pType);

    if (isComplex || isArray || isSampler) {
        return null;
    }

    if (!pType._isReadable()) {
        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }


    if (sOperator === '++' || sOperator === '--') {
        if (!pType._isWritable()) {
            _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        return pType;
    }

    if (sOperator === '!') {
        const pBoolType: IAFXVariableTypeInstruction = getSystemType('bool').getVariableType();

        if (pType._isEqual(pBoolType)) {
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
            return (<SystemTypeInstruction>pType._getBaseType()).getVariableType();
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


function analyzeVariableDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pInstruction: IAFXInstruction = null): void {
    let pChildren: IParseNode[] = pNode.children;
    let pGeneralType: IAFXVariableTypeInstruction = null;
    let pVariable: IAFXVariableDeclInstruction = null;
    let i: number = 0;

    pGeneralType = analyzeUsageType(pContext, pScope, pChildren[pChildren.length - 1]);

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'Variable') {
            pVariable = analyzeVariable(pContext, pScope, pChildren[i], pGeneralType);

            if (!isNull(pInstruction)) {
                pInstruction._push(pVariable, true);
                if (pInstruction._getInstructionType() === EAFXInstructionTypes.k_DeclStmtInstruction) {
                    let pVariableSubDecls: IAFXVariableDeclInstruction[] = pVariable._getSubVarDecls();
                    if (!isNull(pVariableSubDecls)) {
                        for (let j: number = 0; j < pVariableSubDecls.length; j++) {
                            pInstruction._push(pVariableSubDecls[j], false);
                        }
                    }
                }
            }
        }
    }
}


function analyzeUsageType(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXVariableTypeInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let i: number = 0;
    let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction(pNode);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'Type') {
            let pMainType: IAFXTypeInstruction = analyzeType(pContext, pScope, pChildren[i]);
            pType._pushType(pMainType);
        }
        else if (pChildren[i].name === 'Usage') {
            let sUsage: string = analyzeUsage(pChildren[i]);
            pType._addUsage(sUsage);
        }
    }

    checkInstruction(pContext, pType, ECheckStage.CODE_TARGET_SUPPORT);
    return pType;
}


function analyzeType(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXTypeInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pType: IAFXTypeInstruction = null;

    switch (pNode.name) {
        case 'T_TYPE_ID':
            pType = getType(pScope, pNode.value);

            if (isNull(pType)) {
                _error(pContext, pNode, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: pNode.value });
            }
            break;

        case 'Struct':
            pType = analyzeStruct(pContext, pScope, pNode);
            break;

        case 'T_KW_VOID':
            pType = getSystemType('void');
            break;

        case 'ScalarType':
        case 'ObjectType':
            pType = getType(pScope, pChildren[pChildren.length - 1].value);

            if (isNull(pType)) {
                _error(pContext, pNode, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: pChildren[pChildren.length - 1].value });
            }

            break;

        case 'VectorType':
        case 'MatrixType':
            _error(pContext, pNode, EEffectErrors.BAD_TYPE_VECTOR_MATRIX);
            break;

        case 'BaseType':
        case 'Type':
            return analyzeType(pContext, pScope, pChildren[0]);
    }

    return pType;
}


function analyzeUsage(pNode: IParseNode): string {
    pNode = pNode.children[0];
    return pNode.value;
}


function analyzeVariable(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pGeneralType: IAFXVariableTypeInstruction): IAFXVariableDeclInstruction {
    let pChildren: IParseNode[] = pNode.children;

    let pVarDecl: IAFXVariableDeclInstruction = new VariableDeclInstruction(pNode);
    let pVariableType: IAFXVariableTypeInstruction = new VariableTypeInstruction(pNode);
    let pAnnotation: IAFXAnnotationInstruction = null;
    let sSemantic: string = '';
    let pInitExpr: IAFXInitExprInstruction = null;

    pVarDecl._push(pVariableType, true);
    pVariableType._pushType(pGeneralType);
    pVarDecl._setScope(pScope._getScope());

    analyzeVariableDim(pChildren[pChildren.length - 1], pVarDecl);

    let i: number = 0;
    for (i = pChildren.length - 2; i >= 0; i--) {
        if (pChildren[i].name === 'Annotation') {
            pAnnotation = analyzeAnnotation(pChildren[i]);
            pVarDecl._setAnnotation(pAnnotation);
        }
        else if (pChildren[i].name === 'Semantic') {
            sSemantic = analyzeSemantic(pChildren[i]);
            pVarDecl._setSemantic(sSemantic);
            pVarDecl._getNameId()._setRealName(sSemantic);
        }
        else if (pChildren[i].name === 'Initializer') {
            pInitExpr = analyzeInitializer(pChildren[i]);
            if (!pInitExpr._optimizeForVariableType(pVariableType)) {
                _error(pContext, pNode, EEffectErrors.BAD_VARIABLE_INITIALIZER, { varName: pVarDecl._getName() });
                return null;
            }
            pVarDecl._push(pInitExpr, true);
        }
    }

    checkInstruction(pContext, pVarDecl, ECheckStage.CODE_TARGET_SUPPORT);
    addVariableDecl(pContext, pScope, pVarDecl);
    pVarDecl._getNameIndex();

    return pVarDecl;
}


function analyzeVariableDim(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pVariableDecl: IAFXVariableDeclInstruction): void {
    let pChildren: IParseNode[] = pNode.children;
    let pVariableType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pVariableDecl._getType();

    if (pChildren.length === 1) {
        let pName: IAFXIdInstruction = new IdInstruction(pNode);
        pName._setName(pChildren[0].value);
        pVariableDecl._push(pName, true);
        return;
    }

    analyzeVariableDim(pContext, pScope, pChildren[pChildren.length - 1], pVariableDecl);

    if (pChildren.length === 3) {
        pVariableType._addPointIndex(true);
    }
    else {
        if (pVariableType._isPointer()) {
            //TODO: add support for v[][10]
            _error(pContext, pNode, EEffectTempErrors.BAD_ARRAY_OF_POINTERS);
        }

        let pIndexExpr: IAFXExprInstruction = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 3]);
        pVariableType._addArrayIndex(pIndexExpr);
    }
}


function analyzeAnnotation(pNode: IParseNode): IAFXAnnotationInstruction {
    // todo
    return null;
}


function analyzeSemantic(pNode: IParseNode): string {
    let sSemantic: string = pNode.children[0].value;
    // let pDecl: IAFXDeclInstruction = <IAFXDeclInstruction>_pCurrentInstruction;
    // pDecl._setSemantic(sSemantic);
    return sSemantic;
}

function analyzeInitializer(pNode: IParseNode): IAFXInitExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pInitExpr: IAFXInitExprInstruction = new InitExprInstruction(pNode);

    if (pChildren.length === 2) {
        pInitExpr._push(analyzeExpr(pChildren[0]), true);
    }
    else {
        for (let i: number = pChildren.length - 3; i >= 1; i--) {
            if (pChildren[i].name === 'InitExpr') {
                pInitExpr._push(analyzeInitExpr(pChildren[i]), true);
            }
        }
    }

    return pInitExpr;
}

function analyzeFromExpr(pNode: IParseNode): IAFXVariableDeclInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pBuffer: IAFXVariableDeclInstruction = null;

    if (pChildren[1].name === 'T_NON_TYPE_ID') {
        pBuffer = getVariable(pChildren[1].value);
    }
    else {
        pBuffer = (<MemExprInstruction>analyzeMemExpr(pChildren[1])).getBuffer();
    }

    return pBuffer;
}


function analyzeExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXExprInstruction {
    let sName: string = pNode.name;

    switch (sName) {
        case 'ObjectExpr':
            return analyzeObjectExpr(pContext, pScope, pNode);
        case 'ComplexExpr':
            return analyzeComplexExpr(pNode);
        case 'PrimaryExpr':
            return analyzePrimaryExpr(pNode);
        case 'PostfixExpr':
            return analyzePostfixExpr(pNode);
        case 'UnaryExpr':
            return analyzeUnaryExpr(pNode);
        case 'CastExpr':
            return analyzeCastExpr(pNode);
        case 'ConditionalExpr':
            return analyzeConditionalExpr(pNode);
        case 'MulExpr':
        case 'AddExpr':
            return analyzeArithmeticExpr(pNode);
        case 'RelationalExpr':
        case 'EqualityExpr':
            return analyzeRelationExpr(pNode);
        case 'AndExpr':
        case 'OrExpr':
            return analyzeLogicalExpr(pNode);
        case 'AssignmentExpr':
            return analyzeAssignmentExpr(pNode);
        case 'T_NON_TYPE_ID':
            return analyzeIdExpr(pNode);
        case 'T_STRING':
        case 'T_UINT':
        case 'T_FLOAT':
        case 'T_KW_TRUE':
        case 'T_KW_FALSE':
            return analyzeSimpleExpr(pNode);
        case 'MemExpr':
            return analyzeMemExpr(pNode);
        default:
            _error(pContext, pNode, EEffectErrors.UNSUPPORTED_EXPR, { exprName: sName });
            break;
    }

    return null;
}

function analyzeObjectExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXExprInstruction {
    let sName: string = pNode.children[pNode.children.length - 1].name;

    switch (sName) {
        case 'T_KW_COMPILE':
            return analyzeCompileExpr(pContext, pScope, pNode);
        case 'T_KW_SAMPLER_STATE':
            return analyzeSamplerStateBlock(pContext, pNode);
        default:
    }
    return null;
}

function analyzeCompileExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pExpr: CompileExprInstruction = new CompileExprInstruction(pNode);
    let pExprType: IAFXVariableTypeInstruction;
    let pArguments: IAFXExprInstruction[] = null;
    let sShaderFuncName: string = pChildren[pChildren.length - 2].value;
    let pShaderFunc: IAFXFunctionDeclInstruction = null;
    let i: number = 0;

    pArguments = [];

    if (pChildren.length > 4) {
        let pArgumentExpr: IAFXExprInstruction;

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(pContext, pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pShaderFunc = findShaderFunction(pScope, sShaderFuncName, pArguments);

    if (isNull(pShaderFunc)) {
        _error(pContext, pNode, EEffectErrors.BAD_COMPILE_NOT_FUNCTION, { funcName: sShaderFuncName });
        return null;
    }

    pExprType = (<IAFXVariableTypeInstruction>pShaderFunc._getType())._wrap();

    pExpr._setType(pExprType);
    pExpr._setOperator('complile');
    pExpr._push(pShaderFunc._getNameId(), false);

    if (!isNull(pArguments)) {
        for (i = 0; i < pArguments.length; i++) {
            pExpr._push(pArguments[i], true);
        }
    }

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeSamplerStateBlock(pContext: Context, pNode: IParseNode): IAFXExprInstruction {
    pNode = pNode.children[0];

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: SamplerStateBlockInstruction = new SamplerStateBlockInstruction(pNode);
    let i: number = 0;

    pExpr._setOperator('sample_state');

    for (i = pChildren.length - 2; i >= 1; i--) {
        analyzeSamplerState(pChildren[i], pExpr);
    }

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeSamplerState(pNode: IParseNode, pSamplerStates: SamplerStateBlockInstruction): void {

    let pChildren: IParseNode[] = pNode.children;
    if (pChildren[pChildren.length - 2].name === 'StateIndex') {
        _error(EEffectErrors.NOT_SUPPORT_STATE_INDEX);
        return;
    }

    let pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
    let pSubStateExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
    let sStateType: string = pChildren[pChildren.length - 1].value.toUpperCase();
    let sStateValue: string = '';
    // let isTexture: boolean = false;

    if (isNull(pSubStateExprNode.value)) {
        _error(EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
        return;
    }
    let pTexture: IAFXVariableDeclInstruction = null;

    switch (sStateType) {
        case 'TEXTURE':
            // let pTexture: IAFXVariableDeclInstruction = null;
            if (pStateExprNode.children.length !== 3 || pSubStateExprNode.value === '{') {
                _error(EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return;
            }
            let sTextureName: string = pStateExprNode.children[1].value;
            if (isNull(sTextureName) || !hasVariable(sTextureName)) {
                _error(EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return;
            }

            pTexture = getVariable(sTextureName);
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
        pSamplerStates.setTexture(pTexture);
    }
}


function analyzeComplexExpr(pNode: IParseNode): IAFXExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'T_NON_TYPE_ID':
            return analyzeFunctionCallExpr(pNode);
        case 'BaseType':
        case 'T_TYPE_ID':
            return analyzeConstructorCallExpr(pNode);
        default:
            return analyzeSimpleComplexExpr(pNode);
    }
}


function analyzeFunctionCallExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pExpr: IAFXExprInstruction = null;
    let pExprType: IAFXVariableTypeInstruction = null;
    let pArguments: IAFXExprInstruction[] = null;
    let sFuncName: string = pChildren[pChildren.length - 1].value;
    let pFunction: IAFXFunctionDeclInstruction = null;
    let pFunctionId: IAFXIdExprInstruction = null;
    let i: number = 0;
    let pCurrentAnalyzedFunction: IAFXFunctionDeclInstruction = pContext.currentFunction;

    if (pChildren.length > 3) {
        let pArgumentExpr: IAFXExprInstruction;

        pArguments = [];

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(pContext, pScope, pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pFunction = findFunction(pScope, sFuncName, pArguments);

    if (isNull(pFunction)) {
        _error(pContext, pNode, EEffectErrors.BAD_COMPLEX_NOT_FUNCTION, { funcName: sFuncName });
        return null;
    }

    if (!isDef(pFunction)) {
        _error(pContext, pNode, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: sFuncName });
        return null;
    }

    if (!isNull(pCurrentAnalyzedFunction)) {
        if (!pFunction._isForPixel()) {
            pCurrentAnalyzedFunction._setForPixel(false);
        }

        if (!pFunction._isForVertex()) {
            pCurrentAnalyzedFunction._setForVertex(false);
        }
    }

    if (pFunction._getInstructionType() === EAFXInstructionTypes.k_FunctionDeclInstruction) {
        let pFunctionCallExpr: FunctionCallInstruction = new FunctionCallInstruction();

        pFunctionId = new IdExprInstruction();
        pFunctionId._push(pFunction._getNameId(), false);

        pExprType = (<IAFXVariableTypeInstruction>pFunction._getType())._wrap();

        pFunctionCallExpr._setType(pExprType);
        pFunctionCallExpr._push(pFunctionId, true);

        if (!isNull(pArguments)) {
            for (i = 0; i < pArguments.length; i++) {
                pFunctionCallExpr._push(pArguments[i], true);
            }

            let pFunctionArguments: IAFXVariableDeclInstruction[] = (<FunctionDeclInstruction>pFunction)._getArguments();
            for (i = 0; i < pArguments.length; i++) {
                if (pFunctionArguments[i]._getType()._hasUsage('out')) {
                    if (!pArguments[i]._getType()._isWritable()) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }

                    if (pArguments[i]._getType()._isStrongEqual(getSystemType('ptr'))) {
                        pContext.pointerForExtractionList.push(pArguments[i]._getType()._getParentVarDecl());
                    }
                }
                else if (pFunctionArguments[i]._getType()._hasUsage('inout')) {
                    if (!pArguments[i]._getType()._isWritable()) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }

                    if (!pArguments[i]._getType()._isReadable()) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }

                    if (pArguments[i]._getType()._isStrongEqual(getSystemType('ptr'))) {
                        pContext.pointerForExtractionList.push(pArguments[i]._getType()._getParentVarDecl());
                    }
                }
                else {
                    if (!pArguments[i]._getType()._isReadable()) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }
                }
            }

            for (i = pArguments.length; i < pFunctionArguments.length; i++) {
                pFunctionCallExpr._push(pFunctionArguments[i]._getInitializeExpr(), false);
            }

        }

        if (!isNull(pCurrentAnalyzedFunction)) {
            pCurrentAnalyzedFunction._addUsedFunction(pFunction);
        }

        pFunction._markUsedAs(EFunctionType.k_Function);

        pExpr = pFunctionCallExpr;
    }
    else {
        let pSystemCallExpr: SystemCallInstruction = new SystemCallInstruction();

        pSystemCallExpr.setSystemCallFunction(pFunction);
        pSystemCallExpr.fillByArguments(pArguments);

        if (!isNull(pCurrentAnalyzedFunction)) {
            for (i = 0; i < pArguments.length; i++) {
                if (!pArguments[i]._getType()._isReadable()) {
                    _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
                    return null;
                }
            }
        }

        pExpr = pSystemCallExpr;

        if (!pFunction._isBuiltIn() && !isNull(pCurrentAnalyzedFunction)) {
            pCurrentAnalyzedFunction._addUsedFunction(pFunction);
        }
    }

    checkInstruction(pContext, pNode, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeConstructorCallExpr(pNode: IParseNode): IAFXExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pExpr: ConstructorCallInstruction = new ConstructorCallInstruction();
    let pExprType: IAFXVariableTypeInstruction = null;
    let pArguments: IAFXExprInstruction[] = null;
    let pConstructorType: IAFXTypeInstruction = null;
    let i: number = 0;

    pConstructorType = analyzeType(pChildren[pChildren.length - 1]);

    if (isNull(pConstructorType)) {
        _error(EEffectErrors.BAD_COMPLEX_NOT_TYPE);
        return null;
    }

    if (pChildren.length > 3) {
        let pArgumentExpr: IAFXExprInstruction = null;

        pArguments = [];

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pExprType = findConstructor(pConstructorType, pArguments);

    if (isNull(pExprType)) {
        _error(EEffectErrors.BAD_COMPLEX_NOT_CONSTRUCTOR, { typeName: pConstructorType.toString() });
        return null;
    }

    pExpr._setType(pExprType);
    pExpr._push(pConstructorType, false);

    if (!isNull(pArguments)) {
        for (i = 0; i < pArguments.length; i++) {
            if (!pArguments[i]._getType()._isReadable()) {
                _error(EEffectErrors.BAD_TYPE_FOR_READ);
                return null;
            }

            pExpr._push(pArguments[i], true);
        }
    }

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSimpleComplexExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: ComplexExprInstruction = new ComplexExprInstruction();
    let pComplexExpr: IAFXExprInstruction;
    let pExprType: IAFXVariableTypeInstruction;

    pComplexExpr = analyzeExpr(pChildren[1]);
    pExprType = <IAFXVariableTypeInstruction>pComplexExpr._getType();

    pExpr._setType(pExprType);
    pExpr._push(pComplexExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzePrimaryExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: PrimaryExprInstruction = new PrimaryExprInstruction();
    let pPrimaryExpr: IAFXExprInstruction;
    let pPointer: IAFXVariableDeclInstruction = null;
    let pPrimaryExprType: IAFXVariableTypeInstruction;

    pPrimaryExpr = analyzeExpr(pChildren[0]);
    pPrimaryExprType = <IAFXVariableTypeInstruction>pPrimaryExpr._getType();

    pPointer = pPrimaryExprType._getPointer();

    if (isNull(pPointer)) {
        _error(EEffectErrors.BAD_PRIMARY_NOT_POINT, { typeName: pPrimaryExprType._getHash() });
        return null;
    }

    // let pPointerVarType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pPrimaryExprType._getParent();
    if (!pPrimaryExprType._isStrictPointer()) {
        getCurrentAnalyzedFunction()._setForPixel(false);
        getCurrentAnalyzedFunction()._notCanUsedAsFunction();
        pPrimaryExprType._setPointerToStrict();
    }

    pExpr._setType(pPointer._getType());
    pExpr._setOperator('@');
    pExpr._push(pPointer._getNameId(), false);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzePostfixExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sSymbol: string = pChildren[pChildren.length - 2].value;

    switch (sSymbol) {
        case '[':
            return analyzePostfixIndex(pNode);
        case '.':
            return analyzePostfixPoint(pNode);
        case '++':
        case '--':
            return analyzePostfixArithmetic(pNode);
    }

    return null;
}

function analyzePostfixIndex(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: PostfixIndexInstruction = new PostfixIndexInstruction();
    let pPostfixExpr: IAFXExprInstruction = null;
    let pIndexExpr: IAFXExprInstruction = null;
    let pExprType: IAFXVariableTypeInstruction = null;
    let pPostfixExprType: IAFXVariableTypeInstruction = null;
    let pIndexExprType: IAFXVariableTypeInstruction = null;
    let pIntType: IAFXTypeInstruction = null;

    pPostfixExpr = analyzeExpr(pChildren[pChildren.length - 1]);
    pPostfixExprType = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

    if (!pPostfixExprType._isArray()) {
        _error(EEffectErrors.BAD_POSTIX_NOT_ARRAY, { typeName: pPostfixExprType.toString() });
        return null;
    }

    pIndexExpr = analyzeExpr(pChildren[pChildren.length - 3]);
    pIndexExprType = <IAFXVariableTypeInstruction>pIndexExpr._getType();

    pIntType = getSystemType('number');

    if (!pIndexExprType._isEqual(pIntType)) {
        _error(EEffectErrors.BAD_POSTIX_NOT_INT_INDEX, { typeName: pIndexExprType.toString() });
        return null;
    }

    pExprType = <IAFXVariableTypeInstruction>(pPostfixExprType._getArrayElementType());

    pExpr._setType(pExprType);
    pExpr._push(pPostfixExpr, true);
    pExpr._push(pIndexExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzePostfixPoint(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: PostfixPointInstruction = new PostfixPointInstruction();
    let pPostfixExpr: IAFXExprInstruction = null;
    let sFieldName: string = '';
    let pFieldNameExpr: IAFXIdExprInstruction = null;
    let pExprType: IAFXVariableTypeInstruction = null;
    let pPostfixExprType: IAFXVariableTypeInstruction = null;

    pPostfixExpr = analyzeExpr(pChildren[pChildren.length - 1]);
    pPostfixExprType = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

    sFieldName = pChildren[pChildren.length - 3].value;

    pFieldNameExpr = pPostfixExprType._getFieldExpr(sFieldName);

    if (isNull(pFieldNameExpr)) {
        _error(EEffectErrors.BAD_POSTIX_NOT_FIELD, {
            typeName: pPostfixExprType.toString(),
            fieldName: sFieldName
        });
        return null;
    }

    pExprType = <IAFXVariableTypeInstruction>pFieldNameExpr._getType();

    if (pChildren.length === 4) {
        if (!pExprType._isPointer()) {
            _error(EEffectErrors.BAD_POSTIX_NOT_POINTER, { typeName: pExprType.toString() });
            return null;
        }

        let pBuffer: IAFXVariableDeclInstruction = analyzeFromExpr(pChildren[0]);
        pExprType._setVideoBuffer(pBuffer);
    }

    pExpr._setType(pExprType);
    pExpr._push(pPostfixExpr, true);
    pExpr._push(pFieldNameExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzePostfixArithmetic(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pChildren[0].value;
    let pExpr: PostfixArithmeticInstruction = new PostfixArithmeticInstruction();
    let pPostfixExpr: IAFXExprInstruction;
    let pExprType: IAFXVariableTypeInstruction;
    let pPostfixExprType: IAFXVariableTypeInstruction;

    pPostfixExpr = analyzeExpr(pChildren[1]);
    pPostfixExprType = <IAFXVariableTypeInstruction>pPostfixExpr._getType();

    pExprType = checkOneOperandExprType(sOperator, pPostfixExprType);

    if (isNull(pExprType)) {
        _error(EEffectErrors.BAD_POSTIX_ARITHMETIC, {
            operator: sOperator,
            typeName: pPostfixExprType.toString()
        });
        return null;
    }

    pExpr._setType(pExprType);
    pExpr._setOperator(sOperator);
    pExpr._push(pPostfixExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeUnaryExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pChildren[1].value;
    let pExpr: UnaryExprInstruction = new UnaryExprInstruction();
    let pUnaryExpr: IAFXExprInstruction;
    let pExprType: IAFXVariableTypeInstruction;
    let pUnaryExprType: IAFXVariableTypeInstruction;

    pUnaryExpr = analyzeExpr(pChildren[0]);
    pUnaryExprType = <IAFXVariableTypeInstruction>pUnaryExpr._getType();

    pExprType = checkOneOperandExprType(sOperator, pUnaryExprType);

    if (isNull(pExprType)) {
        _error(EEffectErrors.BAD_UNARY_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            tyepName: pUnaryExprType.toString()
        });
        return null;
    }

    pExpr._setOperator(sOperator);
    pExpr._setType(pExprType);
    pExpr._push(pUnaryExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeCastExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: CastExprInstruction = new CastExprInstruction();
    let pExprType: IAFXVariableTypeInstruction;
    let pCastedExpr: IAFXExprInstruction;

    pExprType = analyzeConstTypeDim(pChildren[2]);
    pCastedExpr = analyzeExpr(pChildren[0]);

    if (!(<IAFXVariableTypeInstruction>pCastedExpr._getType())._isReadable()) {
        _error(EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr._setType(pExprType);
    pExpr._push(pExprType, true);
    pExpr._push(pCastedExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeConditionalExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: ConditionalExprInstruction = new ConditionalExprInstruction();
    let pConditionExpr: IAFXExprInstruction;
    let pTrueExpr: IAFXExprInstruction;
    let pFalseExpr: IAFXExprInstruction;
    let pConditionType: IAFXVariableTypeInstruction;
    let pTrueExprType: IAFXVariableTypeInstruction;
    let pFalseExprType: IAFXVariableTypeInstruction;
    // let pExprType: IAFXVariableTypeInstruction;
    let pBoolType: IAFXTypeInstruction;

    pConditionExpr = analyzeExpr(pChildren[pChildren.length - 1]);
    pTrueExpr = analyzeExpr(pChildren[pChildren.length - 3]);
    pFalseExpr = analyzeExpr(pChildren[0]);

    pConditionType = <IAFXVariableTypeInstruction>pConditionExpr._getType();
    pTrueExprType = <IAFXVariableTypeInstruction>pTrueExpr._getType();
    pFalseExprType = <IAFXVariableTypeInstruction>pFalseExpr._getType();

    pBoolType = getSystemType('bool');

    if (!pConditionType._isEqual(pBoolType)) {
        _error(EEffectErrors.BAD_CONDITION_TYPE, { typeName: pConditionType.toString() });
        return null;
    }

    if (!pTrueExprType._isEqual(pFalseExprType)) {
        _error(EEffectErrors.BAD_CONDITION_VALUE_TYPES, <IEffectErrorInfo>{
            leftTypeName: pTrueExprType.toString(),
            rightTypeName: pFalseExprType.toString()
        });
        return null;
    }

    if (!pConditionType._isReadable()) {
        _error(EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pTrueExprType._isReadable()) {
        _error(EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pFalseExprType._isReadable()) {
        _error(EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr._setType(pTrueExprType);
    pExpr._push(pConditionExpr, true);
    pExpr._push(pTrueExpr, true);
    pExpr._push(pFalseExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeArithmeticExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pNode.children[1].value;
    let pExpr: ArithmeticExprInstruction = new ArithmeticExprInstruction();
    let pLeftExpr: IAFXExprInstruction = null;
    let pRightExpr: IAFXExprInstruction = null;
    let pLeftType: IAFXVariableTypeInstruction = null;
    let pRightType: IAFXVariableTypeInstruction = null;
    let pExprType: IAFXVariableTypeInstruction = null;

    pLeftExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
    pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

    pExprType = checkTwoOperandExprTypes(pContext, sOperator, pLeftType, pRightType);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_ARITHMETIC_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            leftTypeName: pLeftType.toString(),
            rightTypeName: pRightType.toString()
        });
        return null;
    }

    pExpr._setOperator(sOperator);
    pExpr._setType(pExprType);
    pExpr._push(pLeftExpr, true);
    pExpr._push(pRightExpr, true);

    checkInstruction(pContext, pNode, pExpr, ECheckStage.CODE_TARGET_SUPPORT);
    return pExpr;
}

function analyzeRelationExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pNode.children[1].value;
    let pExpr: RelationalExprInstruction = new RelationalExprInstruction();
    let pLeftExpr: IAFXExprInstruction;
    let pRightExpr: IAFXExprInstruction;
    let pLeftType: IAFXVariableTypeInstruction;
    let pRightType: IAFXVariableTypeInstruction;
    let pExprType: IAFXVariableTypeInstruction;

    pLeftExpr = analyzeExpr(pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pChildren[0]);

    pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
    pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

    pExprType = checkTwoOperandExprTypes(sOperator, pLeftType, pRightType);

    if (isNull(pExprType)) {
        _error(EEffectErrors.BAD_RELATIONAL_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            leftTypeName: pLeftType._getHash(),
            rightTypeName: pRightType._getHash()
        });
        return null;
    }

    pExpr._setOperator(sOperator);
    pExpr._setType(pExprType);
    pExpr._push(pLeftExpr, true);
    pExpr._push(pRightExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeLogicalExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pNode.children[1].value;
    let pExpr: LogicalExprInstruction = new LogicalExprInstruction();
    let pLeftExpr: IAFXExprInstruction;
    let pRightExpr: IAFXExprInstruction;
    let pLeftType: IAFXVariableTypeInstruction;
    let pRightType: IAFXVariableTypeInstruction;
    let pBoolType: IAFXTypeInstruction;

    pLeftExpr = analyzeExpr(pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pChildren[0]);

    pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
    pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

    pBoolType = getSystemType('bool');

    if (!pLeftType._isEqual(pBoolType)) {
        _error(EEffectErrors.BAD_LOGICAL_OPERATION, {
            operator: sOperator,
            typeName: pLeftType.toString()
        });
        return null;
    }
    if (!pRightType._isEqual(pBoolType)) {
        _error(EEffectErrors.BAD_LOGICAL_OPERATION, {
            operator: sOperator,
            typeName: pRightType.toString()
        });
        return null;
    }

    if (!pLeftType._isReadable()) {
        _error(EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pRightType._isReadable()) {
        _error(EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr._setOperator(sOperator);
    pExpr._setType((<SystemTypeInstruction>pBoolType).getVariableType());
    pExpr._push(pLeftExpr, true);
    pExpr._push(pRightExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeAssignmentExpr(pNode: IParseNode): IAFXExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pChildren[1].value;
    let pExpr: AssignmentExprInstruction = new AssignmentExprInstruction();
    let pLeftExpr: IAFXExprInstruction;
    let pRightExpr: IAFXExprInstruction;
    let pLeftType: IAFXVariableTypeInstruction;
    let pRightType: IAFXVariableTypeInstruction;
    let pExprType: IAFXVariableTypeInstruction;

    pLeftExpr = analyzeExpr(pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pChildren[0]);

    pLeftType = <IAFXVariableTypeInstruction>pLeftExpr._getType();
    pRightType = <IAFXVariableTypeInstruction>pRightExpr._getType();

    if (sOperator !== '=') {
        pExprType = checkTwoOperandExprTypes(sOperator, pLeftType, pRightType);
        if (isNull(pExprType)) {
            _error(EEffectErrors.BAD_ARITHMETIC_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
                operator: sOperator,
                leftTypeName: pLeftType._getHash(),
                rightTypeName: pRightType._getHash()
            });
        }
    }
    else {
        pExprType = pRightType;
    }

    pExprType = checkTwoOperandExprTypes('=', pLeftType, pExprType);

    if (isNull(pExprType)) {
        _error(EEffectErrors.BAD_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
            leftTypeName: pLeftType._getHash(),
            rightTypeName: pRightType._getHash()
        });
    }

    pExpr._setOperator(sOperator);
    pExpr._setType(pExprType);
    pExpr._push(pLeftExpr, true);
    pExpr._push(pRightExpr, true);

    checkInstruction(pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}

function analyzeIdExpr(pNode: IParseNode): IAFXExprInstruction {

    let sName: string = pNode.value;
    let pVariable: IAFXVariableDeclInstruction = getVariable(sName);

    if (isNull(pVariable)) {
        _error(EEffectErrors.UNKNOWN_VARNAME, { varName: sName });
        return null;
    }

    if (pVariable._getType()._isUnverifiable() && !isAnalzeInPass()) {
        _error(EEffectErrors.BAD_USE_OF_ENGINE_VARIABLE);
        return null;
    }

    if (!isNull(getCurrentAnalyzedFunction())) {
        if (!pVariable._isForPixel()) {
            getCurrentAnalyzedFunction()._setForPixel(false);
        }
        if (!pVariable._isForVertex()) {
            getCurrentAnalyzedFunction()._setForVertex(false);
        }
    }

    if (!isNull(getCurrentAnalyzedPass()) && pVariable._getType()._isForeign()) {
        getCurrentAnalyzedPass()._addOwnUsedForignVariable(pVariable);
    }

    let pVarId: IdExprInstruction = new IdExprInstruction();
    pVarId._push(pVariable._getNameId(), false);

    checkInstruction(pVarId, ECheckStage.CODE_TARGET_SUPPORT);

    return pVarId;
}

function analyzeSimpleExpr(pNode: IParseNode): IAFXExprInstruction {

    let pInstruction: IAFXLiteralInstruction = null;
    const sName: string = pNode.name;
    const sValue: string = pNode.value;

    switch (sName) {
        case 'T_UINT':
            pInstruction = new IntInstruction();
            pInstruction._setValue((<number><any>sValue) * 1);
            break;
        case 'T_FLOAT':
            pInstruction = new FloatInstruction();
            pInstruction._setValue((<number><any>sValue) * 1.0);
            break;
        case 'T_STRING':
            pInstruction = new StringInstruction();
            pInstruction._setValue(sValue);
            break;
        case 'T_KW_TRUE':
            pInstruction = new BoolInstruction();
            pInstruction._setValue(true);
            break;
        case 'T_KW_FALSE':
            pInstruction = new BoolInstruction();
            pInstruction._setValue(false);
            break;
    }

    return pInstruction;
}



function analyzeConstTypeDim(pNode: IParseNode): IAFXVariableTypeInstruction {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length > 1) {
        _error(EEffectErrors.BAD_CAST_TYPE_USAGE);
        return null;
    }

    let pType: IAFXVariableTypeInstruction;

    pType = <IAFXVariableTypeInstruction>(analyzeType(pChildren[0]));

    if (!pType._isBase()) {
        _error(EEffectErrors.BAD_CAST_TYPE_NOT_BASE, { typeName: pType.toString() });
    }

    checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}

function analyzeVarStructDecl(pNode: IParseNode, pInstruction: IAFXInstruction = null): void {

    const pChildren: IParseNode[] = pNode.children;
    let pUsageType: IAFXVariableTypeInstruction = null;
    let pVariable: IAFXVariableDeclInstruction = null;
    let i: number = 0;

    pUsageType = analyzeUsageStructDecl(pChildren[pChildren.length - 1]);

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'Variable') {
            pVariable = analyzeVariable(pChildren[i], pUsageType);

            if (!isNull(pInstruction)) {
                pInstruction._push(pVariable, true);
            }
        }
    }
}

function analyzeUsageStructDecl(pNode: IParseNode): IAFXVariableTypeInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let i: number = 0;
    let pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'StructDecl') {
            const pMainType: IAFXTypeInstruction = analyzeStructDecl(pChildren[i]);
            pType._pushType(pMainType);

            const pTypeDecl: IAFXTypeDeclInstruction = new TypeDeclInstruction();
            pTypeDecl._push(pMainType, true);

            addTypeDecl(pTypeDecl);
        }
        else if (pChildren[i].name === 'Usage') {
            const sUsage: string = analyzeUsage(pChildren[i]);
            pType._addUsage(sUsage);
        }
    }

    checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}


function analyzeStruct(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXTypeInstruction {
    const pChildren: IParseNode[] = pNode.children;

    const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction();
    const pFieldCollector: IAFXInstruction = new InstructionCollector();

    pScope._newScope(EScopeType.k_Struct);

    let i: number = 0;
    for (i = pChildren.length - 4; i >= 1; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(pChildren[i], pFieldCollector);
        }
    }

    pScope._endScope();
    pStruct.addFields(pFieldCollector, true);

    checkInstruction(pContext, pNode, pStruct, ECheckStage.CODE_TARGET_SUPPORT);
    return pStruct;
}

function analyzeFunctionDeclOnlyDefinition(pNode: IParseNode): IAFXFunctionDeclInstruction {

    const pChildren: IParseNode[] = pNode.children;
    let pFunction: FunctionDeclInstruction = null;
    let pFunctionDef: FunctionDefInstruction = null;
    // let pStmtBlock: StmtBlockInstruction = null;
    let pAnnotation: IAFXAnnotationInstruction = null;
    const sLastNodeValue: string = pChildren[0].value;
    let bNeedAddFunction: boolean = false;

    pFunctionDef = analyzeFunctionDef(pChildren[pChildren.length - 1]);

    pFunction = <FunctionDeclInstruction>findFunctionByDef(pFunctionDef);

    if (!isDef(pFunction)) {
        _error(EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: pFunction._getNameId().toString() });
        return null;
    }

    if (!isNull(pFunction) && pFunction._hasImplementation()) {
        _error(EEffectErrors.BAD_REDEFINE_FUNCTION, { funcName: pFunction._getNameId().toString() });
        return null;
    }

    if (isNull(pFunction)) {
        pFunction = new FunctionDeclInstruction();
        bNeedAddFunction = true;
    }
    else {
        if (!pFunction._getReturnType()._isEqual(pFunctionDef.getReturnType())) {
            _error(EEffectErrors.BAD_FUNCTION_DEF_RETURN_TYPE, { funcName: pFunction._getNameId().toString() });
            return null;
        }

        bNeedAddFunction = false;
    }

    pFunction._setFunctionDef(<IAFXDeclInstruction>pFunctionDef);

    resumeScope();

    if (pChildren.length === 3) {
        pAnnotation = analyzeAnnotation(pChildren[1]);
        pFunction._setAnnotation(pAnnotation);
    }

    if (sLastNodeValue !== ';') {
        pFunction._setImplementationScope(getScope());
        _pFunctionWithImplementationList.push(pFunction);
    }

    endScope();

    if (bNeedAddFunction) {
        addFunctionDecl(pFunction);
    }

    return pFunction;
}


function resumeFunctionAnalysis(pContext: Context, pScope: ProgramScope, pAnalzedFunction: IAFXFunctionDeclInstruction): void {
    const pFunction: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
    const pNode: IParseNode = pFunction._getSourceNode();

    pScope._setScope(pFunction._getImplementationScope());

    const pChildren: IParseNode[] = pNode.children;
    let pStmtBlock: StmtBlockInstruction = null;

    setCurrentAnalyzedFunction(pFunction);

    pStmtBlock = <StmtBlockInstruction>analyzeStmtBlock(pChildren[0]);
    pFunction._setImplementation(<IAFXStmtInstruction>pStmtBlock);

    if (!pFunction._getReturnType()._isEqual(getSystemType('void')) && !pContext.haveCurrentFunctionReturnOccur) {
        _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_DONT_HAVE_RETURN_STMT, { funcName: pFunction._getNameId().toString() })
    }

    setCurrentAnalyzedFunction(null);

    pScope._endScope();

    checkInstruction(pContext, pNode, pFunction, ECheckStage.CODE_TARGET_SUPPORT);
}


function analyzeFunctionDef(pContext: Context, pScope: ProgramScope, pNode: IParseNode): FunctionDefInstruction {
    const pChildren: IParseNode[] = pNode.children;
    const pFunctionDef: FunctionDefInstruction = new FunctionDefInstruction();
    let pReturnType: IAFXVariableTypeInstruction = null;
    let pFuncName: IAFXIdInstruction = null;
    const pNameNode = pChildren[pChildren.length - 2];
    const sFuncName: string = pNameNode.value;

    const pRetTypeNode = pChildren[pChildren.length - 1];
    pReturnType = analyzeUsageType(pContext, pScope, pRetTypeNode);

    if (pReturnType._isPointer() || pReturnType._containSampler() || pReturnType._containPointer()) {
        _error(pContext, pRetTypeNode, EEffectErrors.BAD_RETURN_TYPE_FOR_FUNCTION, { funcName: sFuncName });
        return null;
    }

    pFuncName = new IdInstruction(pNameNode);
    pFuncName._setName(sFuncName);
    pFuncName._setRealName(sFuncName + '_' + '0000'); // TODO: use uniq guid <<

    pFunctionDef.setReturnType(pReturnType);
    pFunctionDef.setFunctionName(pFuncName);

    if (pChildren.length === 4) {
        const sSemantic: string = analyzeSemantic(pChildren[0]);
        pFunctionDef._setSemantic(sSemantic);
    }

    pScope._newScope(EScopeType.k_Default);

    analyzeParamList(pChildren[pChildren.length - 3], pFunctionDef);

    pScope._endScope();

    checkInstruction(pContext, pNode, pFunctionDef, ECheckStage.CODE_TARGET_SUPPORT);

    return pFunctionDef;
}


function analyzeParamList(pNode: IParseNode, pFunctionDef: FunctionDefInstruction): void {

    const pChildren: IParseNode[] = pNode.children;
    let pParameter: IAFXVariableDeclInstruction;

    let i: number = 0;

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'ParameterDecl') {
            pParameter = analyzeParameterDecl(pChildren[i]);
            pParameter._setScope(getScope());
            pFunctionDef.addParameter(pParameter, isStrictMode());
        }
    }
}

function analyzeParameterDecl(pNode: IParseNode): IAFXVariableDeclInstruction {

    const pChildren: IParseNode[] = pNode.children;
    let pType: IAFXVariableTypeInstruction = null;
    let pParameter: IAFXVariableDeclInstruction = null;

    pType = analyzeParamUsageType(pChildren[1]);
    pParameter = analyzeVariable(pChildren[0], pType);

    return pParameter;
}

function analyzeParamUsageType(pNode: IParseNode): IAFXVariableTypeInstruction {
    const pChildren: IParseNode[] = pNode.children;
    let i: number = 0;
    const pType: IAFXVariableTypeInstruction = new VariableTypeInstruction();

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'Type') {
            const pMainType: IAFXTypeInstruction = analyzeType(pChildren[i]);
            pType._pushType(pMainType);
        }
        else if (pChildren[i].name === 'ParamUsage') {
            const sUsage: string = analyzeUsage(pChildren[i]);
            pType._addUsage(sUsage);
        }
    }

    checkInstruction(pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}

function analyzeStmtBlock(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pStmtBlock: StmtBlockInstruction = new StmtBlockInstruction();
    let pStmt: IAFXStmtInstruction;
    let i: number = 0;

    pStmtBlock._setScope(getScope());

    newScope();

    for (i = pChildren.length - 2; i > 0; i--) {
        pStmt = analyzeStmt(pChildren[i]);
        if (!isNull(pStmt)) {
            pStmtBlock._push(pStmt);
        }

        addExtactionStmts(pStmtBlock);
    }

    endScope();

    checkInstruction(pStmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

    return pStmtBlock;
}

function analyzeStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(pChildren[0]);
        case 'UseDecl':
            analyzeUseDecl(pChildren[0]);
            return null;
        case 'T_KW_WHILE':
            return analyzeWhileStmt(pNode);
        case 'T_KW_FOR':
            return analyzeForStmt(pNode);
        case 'T_KW_IF':
            return analyzeIfStmt(pNode);
    }
    return null;
}

function analyzeSimpleStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'T_KW_RETURN':
            return analyzeReturnStmt(pNode);

        case 'T_KW_DO':
            return analyzeWhileStmt(pNode);

        case 'StmtBlock':
            return analyzeStmtBlock(pChildren[0]);

        case 'T_KW_DISCARD':
        case 'T_KW_BREAK':
        case 'T_KW_CONTINUE':
            return analyzeBreakStmt(pNode);

        case 'TypeDecl':
        case 'VariableDecl':
        case 'VarStructDecl':
            return analyzeDeclStmt(pChildren[0]);

        default:
            if (pChildren.length === 2) {
                return analyzeExprStmt(pNode);
            }
            else {
                return (new SemicolonStmtInstruction());
            }
    }
}

function analyzeReturnStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pReturnStmtInstruction: ReturnStmtInstruction = new ReturnStmtInstruction();

    const pFunctionReturnType: IAFXVariableTypeInstruction = getCurrentAnalyzedFunction()._getReturnType();

    _bHaveCurrentFunctionReturnOccur = true;

    if (pFunctionReturnType._isEqual(getSystemType('void')) && pChildren.length === 3) {
        _error(EEffectErrors.BAD_RETURN_STMT_VOID);
        return null;
    }
    else if (!pFunctionReturnType._isEqual(getSystemType('void')) && pChildren.length === 2) {
        _error(EEffectErrors.BAD_RETURN_STMT_EMPTY);
        return null;
    }

    if (pChildren.length === 3) {
        const pExprInstruction: IAFXExprInstruction = analyzeExpr(pChildren[1]);
        const pOutVar: IAFXVariableDeclInstruction = getCurrentAnalyzedFunction()._getOutVariable();

        if (!isNull(pOutVar) && pOutVar._getType() !== pExprInstruction._getType()) {
            _error(EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
            return null;
        }

        if (!pFunctionReturnType._isEqual(pExprInstruction._getType())) {
            _error(EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
            return null;
        }
        pReturnStmtInstruction._push(pExprInstruction, true);
    }

    checkInstruction(pReturnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pReturnStmtInstruction;
}

function analyzeBreakStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pBreakStmtInstruction: BreakStmtInstruction = new BreakStmtInstruction();
    const sOperatorName: string = pChildren[1].value;

    pBreakStmtInstruction._setOperator(sOperatorName);

    if (sOperatorName === 'discard' && !isNull(getCurrentAnalyzedFunction())) {
        getCurrentAnalyzedFunction()._setForVertex(false);
    }

    checkInstruction(pBreakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pBreakStmtInstruction;
}

function analyzeDeclStmt(pNode: IParseNode): IAFXStmtInstruction {

    // let pChildren: IParseNode[] = pNode.children;
    const sNodeName: string = pNode.name;
    const pDeclStmtInstruction: DeclStmtInstruction = new DeclStmtInstruction();

    switch (sNodeName) {
        case 'TypeDecl':
            analyzeTypeDecl(pNode, pDeclStmtInstruction);
            break;
        case 'VariableDecl':
            analyzeVariableDecl(pNode, pDeclStmtInstruction);
            break;
        case 'VarStructDecl':
            analyzeVarStructDecl(pNode, pDeclStmtInstruction);
            break;
    }

    checkInstruction(pDeclStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pDeclStmtInstruction;
}

function analyzeExprStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pExprStmtInstruction: ExprStmtInstruction = new ExprStmtInstruction();
    const pExprInstruction: IAFXExprInstruction = analyzeExpr(pChildren[1]);

    pExprStmtInstruction._push(pExprInstruction, true);

    checkInstruction(pExprStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pExprStmtInstruction;
}

function analyzeWhileStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const isDoWhile: boolean = (pChildren[pChildren.length - 1].value === 'do');
    const isNonIfStmt: boolean = (pNode.name === 'NonIfStmt') ? true : false;

    const pWhileStmt: WhileStmtInstruction = new WhileStmtInstruction();
    let pCondition: IAFXExprInstruction = null;
    let pConditionType: IAFXVariableTypeInstruction = null;
    const pBoolType: IAFXTypeInstruction = getSystemType('bool');
    let pStmt: IAFXStmtInstruction = null;

    if (isDoWhile) {
        pWhileStmt._setOperator('do_while');
        pCondition = analyzeExpr(pChildren[2]);
        pConditionType = <IAFXVariableTypeInstruction>pCondition._getType();

        if (!pConditionType._isEqual(pBoolType)) {
            _error(EEffectErrors.BAD_DO_WHILE_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        pStmt = analyzeStmt(pChildren[0]);
    }
    else {
        pWhileStmt._setOperator('while');
        pCondition = analyzeExpr(pChildren[2]);
        pConditionType = <IAFXVariableTypeInstruction>pCondition._getType();

        if (!pConditionType._isEqual(pBoolType)) {
            _error(EEffectErrors.BAD_WHILE_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        if (isNonIfStmt) {
            pStmt = analyzeNonIfStmt(pChildren[0]);
        }
        else {
            pStmt = analyzeStmt(pChildren[0]);
        }

        pWhileStmt._push(pCondition, true);
        pWhileStmt._push(pStmt, true);
    }

    checkInstruction(pWhileStmt, ECheckStage.CODE_TARGET_SUPPORT);

    return pWhileStmt;
}

function analyzeIfStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const isIfElse: boolean = (pChildren.length === 7);

    const pIfStmtInstruction: IfStmtInstruction = new IfStmtInstruction();
    const pCondition: IAFXExprInstruction = analyzeExpr(pChildren[pChildren.length - 3]);
    const pConditionType: IAFXVariableTypeInstruction = <IAFXVariableTypeInstruction>pCondition._getType();
    const pBoolType: IAFXTypeInstruction = getSystemType('bool');

    let pIfStmt: IAFXStmtInstruction = null;
    let pElseStmt: IAFXStmtInstruction = null;

    if (!pConditionType._isEqual(pBoolType)) {
        _error(EEffectErrors.BAD_IF_CONDITION, { typeName: pConditionType.toString() });
        return null;
    }

    pIfStmtInstruction._push(pCondition, true);

    if (isIfElse) {
        pIfStmtInstruction._setOperator('if_else');
        pIfStmt = analyzeNonIfStmt(pChildren[2]);
        pElseStmt = analyzeStmt(pChildren[0]);

        pIfStmtInstruction._push(pIfStmt, true);
        pIfStmtInstruction._push(pElseStmt, true);
    }
    else {
        pIfStmtInstruction._setOperator('if');
        pIfStmt = analyzeNonIfStmt(pChildren[0]);

        pIfStmtInstruction._push(pIfStmt, true);
    }

    checkInstruction(pIfStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pIfStmtInstruction;
}

function analyzeNonIfStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(pChildren[0]);
        case 'T_KW_WHILE':
            return analyzeWhileStmt(pNode);
        case 'T_KW_FOR':
            return analyzeForStmt(pNode);
    }
    return null;
}

function analyzeForStmt(pNode: IParseNode): IAFXStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const isNonIfStmt: boolean = (pNode.name === 'NonIfStmt');
    const pForStmtInstruction: ForStmtInstruction = new ForStmtInstruction();
    let pStmt: IAFXStmtInstruction = null;

    newScope();

    analyzeForInit(pChildren[pChildren.length - 3], pForStmtInstruction);
    analyzeForCond(pChildren[pChildren.length - 4], pForStmtInstruction);

    if (pChildren.length === 7) {
        analyzeForStep(pChildren[2], pForStmtInstruction);
    }
    else {
        pForStmtInstruction._push(null);
    }


    if (isNonIfStmt) {
        pStmt = analyzeNonIfStmt(pChildren[0]);
    }
    else {
        pStmt = analyzeStmt(pChildren[0]);
    }

    pForStmtInstruction._push(pStmt, true);

    endScope();

    checkInstruction(pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pForStmtInstruction;
}

function analyzeForInit(pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'VariableDecl':
            analyzeVariableDecl(pChildren[0], pForStmtInstruction);
            break;
        case 'Expr':
            const pExpr: IAFXExprInstruction = analyzeExpr(pChildren[0]);
            pForStmtInstruction._push(pExpr, true);
            break;
        default:
            // ForInit : ';'
            pForStmtInstruction._push(null);
            break;
    }

    return;
}

function analyzeForCond(pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 1) {
        pForStmtInstruction._push(null);
        return;
    }

    const pConditionExpr: IAFXExprInstruction = analyzeExpr(pChildren[1]);

    pForStmtInstruction._push(pConditionExpr, true);
    return;
}

function analyzeForStep(pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = pNode.children;
    const pStepExpr: IAFXExprInstruction = analyzeExpr(pChildren[0]);

    pForStmtInstruction._push(pStepExpr, true);

    return;
}




function analyzeTechniqueForImport(pNode: IParseNode): void {

    const pChildren: IParseNode[] = pNode.children;
    const pTechnique: IAFXTechniqueInstruction = new TechniqueInstruction();
    const sTechniqueName: string = analyzeComplexName(pChildren[pChildren.length - 2]);
    const isComplexName: boolean = pChildren[pChildren.length - 2].children.length !== 1;

    pTechnique._setName(sTechniqueName, isComplexName);

    for (let i: number = pChildren.length - 3; i >= 0; i--) {
        if (pChildren[i].name === 'Annotation') {
            const pAnnotation: IAFXAnnotationInstruction = analyzeAnnotation(pChildren[i]);
            pTechnique._setAnnotation(pAnnotation);
        }
        else if (pChildren[i].name === 'Semantic') {
            const sSemantic: string = analyzeSemantic(pChildren[i]);
            pTechnique._setSemantic(sSemantic);
        }
        else {
            analyzeTechniqueBodyForImports(pChildren[i], pTechnique);
        }
    }

    addTechnique(pTechnique);
}



function analyzeTechniqueBodyForImports(pContext: Context, pNode: IParseNode, pTechnique: IAFXTechniqueInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassDeclForImports(pContext, pChildren[i], pTechnique);
    }
}

function analyzePassDeclForImports(pContext: Context, pNode: IParseNode, pTechnique: IAFXTechniqueInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren[0].name === 'ImportDecl') {
        analyzeImportDecl(pContext, pChildren[0], pTechnique);
    }
    else if (pChildren.length > 1) {
        const pPass: IAFXPassInstruction = new PassInstruction(pNode);
        //TODO: add annotation and id
        analyzePassStateBlockForShaders(pChildren[0], pPass);

        pTechnique._addPass(pPass);
    }
}

function analyzePassStateBlockForShaders(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassStateForShader(pChildren[i], pPass);
    }
}

function analyzePassStateForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 1) {
        pPass._markAsComplex(true);

        if (pChildren[0].name === 'StateIf') {
            analyzePassStateIfForShader(pChildren[0], pPass);
        }
        else if (pChildren[0].name === 'StateSwitch') {
            analyzePassStateSwitchForShader(pChildren[0], pPass);
        }

        return;
    }

    const sType: string = pChildren[pChildren.length - 1].value.toUpperCase();
    let eShaderType: EFunctionType = EFunctionType.k_Vertex;

    if (sType === 'VERTEXSHADER') {
        eShaderType = EFunctionType.k_Vertex
    }
    else if (sType === 'PIXELSHADER') {
        eShaderType = EFunctionType.k_Pixel;
    }
    else {
        return;
    }

    pNode.isAnalyzed = true;

    const pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
    const pExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
    const pCompileExpr: CompileExprInstruction = <CompileExprInstruction>analyzeExpr(pExprNode);
    const pShaderFunc: IAFXFunctionDeclInstruction = pCompileExpr.getFunction();

    if (eShaderType === EFunctionType.k_Vertex) {
        if (!pShaderFunc._checkDefenitionForVertexUsage()) {
            _error(EEffectErrors.BAD_FUNCTION_VERTEX_DEFENITION, { funcDef: pShaderFunc._getStringDef() });
        }
    }
    else {
        if (!pShaderFunc._checkDefenitionForPixelUsage()) {
            _error(EEffectErrors.BAD_FUNCTION_PIXEL_DEFENITION, { funcDef: pShaderFunc._getStringDef() });
        }
    }

    pShaderFunc._markUsedAs(eShaderType);

    pPass._addFoundFunction(pNode, pShaderFunc, eShaderType);
}

function analyzePassStateIfForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 5) {
        analyzePassStateBlockForShaders(pChildren[0], pPass);
    }
    else if (pChildren.length === 7 && pChildren[0].name === 'PassStateBlock') {
        analyzePassStateBlockForShaders(pChildren[2], pPass);
        analyzePassStateBlockForShaders(pChildren[0], pPass);
    }
    else {
        analyzePassStateBlockForShaders(pChildren[2], pPass);
        analyzePassStateIfForShader(pChildren[0], pPass);
    }
}

function analyzePassStateSwitchForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    analyzePassCaseBlockForShader(pChildren[0], pPass);
}

function analyzePassCaseBlockForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'CaseState') {
            analyzePassCaseStateForShader(pChildren[i], pPass);
        }
        else if (pChildren[i].name === 'DefaultState') {
            analyzePassDefaultStateForShader(pChildren[i], pPass);
        }
    }
}

function analyzePassCaseStateForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 4; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pChildren[i], pPass);
        }
    }
}

function analyzePassDefaultStateForShader(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 3; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pChildren[i], pPass);
        }
    }
}

function resumeTechniqueAnalysis(pTechnique: IAFXTechniqueInstruction): void {
    const pPassList: IAFXPassInstruction[] = pTechnique._getPassList();

    for (let i: number = 0; i < pPassList.length; i++) {
        resumePassAnalysis(pPassList[i]);
    }
}

function resumePassAnalysis(pPass: IAFXPassInstruction): void {
    const pNode: IParseNode = pPass._getParseNode();


    const pChildren: IParseNode[] = pNode.children;

    setCurrentAnalyzedPass(pPass);
    setAnalyzeInPass(true);
    analyzePassStateBlock(pChildren[0], pPass);
    setAnalyzeInPass(false);
    setCurrentAnalyzedPass(null);

    pPass._finalizePass();
}

function analyzePassStateBlock(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    pPass._addCodeFragment('{');

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassState(pChildren[i], pPass);
    }

    pPass._addCodeFragment('}');
}

function analyzePassState(pNode: IParseNode, pPass: IAFXPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 1) {
        if (pChildren[0].name === 'StateIf') {
            analyzePassStateIf(pChildren[0], pPass);
        }
        else if (pChildren[0].name === 'StateSwitch') {
            analyzePassStateSwitch(pChildren[0], pPass);
        }

        return;
    }

    if (pNode.isAnalyzed) {
        const pFunc: IAFXFunctionDeclInstruction = pPass._getFoundedFunction(pNode);
        const eShaderType: EFunctionType = pPass._getFoundedFunctionType(pNode);
        let pShader: IAFXFunctionDeclInstruction = null;

        if (eShaderType === EFunctionType.k_Vertex) {
            pShader = pFunc._getVertexShader();
        }
        else {
            pShader = pFunc._getPixelShader();
        }

        pPass._addShader(pShader);
    }
    else {
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
                    pPass._setState(ERenderStates.SRCBLENDCOLOR, pValues[0]);
                    pPass._setState(ERenderStates.SRCBLENDALPHA, pValues[0]);
                    pPass._setState(ERenderStates.DESTBLENDCOLOR, pValues[1]);
                    pPass._setState(ERenderStates.DESTBLENDALPHA, pValues[1]);
                    break;

                case ERenderStates.BLENDFUNCSEPARATE:
                    if (pValues.length !== 4) {
                        logger.warn('So pass state are incorrect');
                        return;
                    }
                    pPass._setState(ERenderStates.SRCBLENDCOLOR, pValues[0]);
                    pPass._setState(ERenderStates.SRCBLENDALPHA, pValues[2]);
                    pPass._setState(ERenderStates.DESTBLENDCOLOR, pValues[1]);
                    pPass._setState(ERenderStates.DESTBLENDALPHA, pValues[3]);
                    break;

                case ERenderStates.BLENDEQUATIONSEPARATE:
                    if (pValues.length !== 2) {
                        logger.warn('So pass state are incorrect');
                        return;
                    }
                    pPass._setState(ERenderStates.BLENDEQUATIONCOLOR, pValues[0]);
                    pPass._setState(ERenderStates.BLENDEQUATIONALPHA, pValues[1]);
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
                        pPass._setState(ERenderStates.SRCBLENDCOLOR, eValue);
                        pPass._setState(ERenderStates.SRCBLENDALPHA, eValue);
                        break;
                    case ERenderStates.DESTBLEND:
                        pPass._setState(ERenderStates.DESTBLENDCOLOR, eValue);
                        pPass._setState(ERenderStates.DESTBLENDALPHA, eValue);
                        break;
                    case ERenderStates.BLENDEQUATION:
                        pPass._setState(ERenderStates.BLENDEQUATIONCOLOR, eValue);
                        pPass._setState(ERenderStates.BLENDEQUATIONALPHA, eValue);
                        break;
                    default:
                        pPass._setState(eType, eValue);
                        break;
                }
            }
        }
    }

}


function analyzePassStateIf(pNode: IParseNode, pPass: IAFXPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    const pIfExpr: IAFXExprInstruction = analyzeExpr(pChildren[pChildren.length - 3]);
    pIfExpr._prepareFor(EFunctionType.k_PassFunction);

    pPass._addCodeFragment('if(' + pIfExpr._toFinalCode() + ')');

    analyzePassStateBlock(pChildren[pChildren.length - 5], pPass);

    if (pChildren.length > 5) {
        pPass._addCodeFragment('else');

        if (pChildren[0].name === 'PassStateBlock') {
            analyzePassStateBlock(pChildren[0], pPass);
        }
        else {
            pPass._addCodeFragment(' ');
            analyzePassStateIf(pChildren[0], pPass);
        }
    }
}

function analyzePassStateSwitch(pNode: IParseNode, pPass: IAFXPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    // let sCodeFragment: string = "switch";
    const pSwitchExpr: IAFXExprInstruction = analyzeExpr(pChildren[pChildren.length - 3]);
    pSwitchExpr._prepareFor(EFunctionType.k_PassFunction);

    pPass._addCodeFragment('(' + pSwitchExpr._toFinalCode() + ')');

    analyzePassCaseBlock(pChildren[0], pPass);
}

function analyzePassCaseBlock(pNode: IParseNode, pPass: IAFXPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    pPass._addCodeFragment('{');

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'CaseState') {
            analyzePassCaseState(pChildren[i], pPass);
        }
        else if (pChildren[i].name === 'DefaultState') {
            analyzePassDefault(pChildren[i], pPass);
        }
    }

    pPass._addCodeFragment('}');
}


function analyzePassCaseState(pNode: IParseNode, pPass: IAFXPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    const pCaseStateExpr: IAFXExprInstruction = analyzeExpr(pChildren[pChildren.length - 2]);
    pCaseStateExpr._prepareFor(EFunctionType.k_PassFunction);

    pPass._addCodeFragment('case ' + pCaseStateExpr._toFinalCode() + ': ');

    for (let i: number = pChildren.length - 4; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pChildren[i], pPass);
        }
        else {
            pPass._addCodeFragment(pChildren[i].value);
        }
    }
}

function analyzePassDefault(pNode: IParseNode, pPass: IAFXPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    pPass._addCodeFragment('default: ');

    for (let i: number = pChildren.length - 3; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pChildren[i], pPass);
        }
        else {
            pPass._addCodeFragment(pChildren[i].value);
        }
    }
}

function analyzeImportDecl(pContext: Context, pNode: IParseNode, pTechnique: IAFXTechniqueInstruction = null): void {
    const pChildren: IParseNode[] = pNode.children;
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
        if (pContext.provideNameSpace !== '') {
            // sShortedComponentName = sComponentName.replace(_sProvideNameSpace + ".", "");
        }

        throw null;
        // let pTechniqueFromSameEffect: IAFXTechniqueInstruction = _pTechniqueMap[sComponentName] || _pTechniqueMap[sShortedComponentName];
        // if (isDefAndNotNull(pTechniqueFromSameEffect)) {
        //     pTechnique._addTechniqueFromSameEffect(pTechniqueFromSameEffect, iShift);
        //     return;
        // }
    }

    const pSourceTechnique: IAFXTechniqueInstruction = fx.techniques[sComponentName];
    if (!pSourceTechnique) {
        _error(pContext, pNode, EEffectErrors.BAD_IMPORTED_COMPONENT_NOT_EXIST, { componentName: sComponentName });
        return;
    }

    throw null;
}


function analyzeStructDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IAFXTypeInstruction {
    const pChildren: IParseNode[] = pNode.children;

    const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction();
    const pFieldCollector: IAFXInstruction = new InstructionCollector();

    const sName: string = pChildren[pChildren.length - 2].value;

    pStruct._setName(sName);

    pScope._newScope(EScopeType.k_Struct);

    let i: number = 0;
    for (i = pChildren.length - 4; i >= 1; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(pContext, pScope, pChildren[i], pFieldCollector);
        }
    }

    pScope._endScope();

    pStruct.addFields(pFieldCollector, true);

    checkInstruction(pContext, pStruct, ECheckStage.CODE_TARGET_SUPPORT);
    return pStruct;
}


function analyzeTypeDecl(pContext: Context, pNode: IParseNode, pParentInstruction: IAFXInstruction = null): IAFXTypeDeclInstruction {
    let pChildren: IParseNode[] = pNode.children;

    let pTypeDeclInstruction: IAFXTypeDeclInstruction = new TypeDeclInstruction(pNode);

    if (pChildren.length === 2) {
        const pStructInstruction: ComplexTypeInstruction = <ComplexTypeInstruction>analyzeStructDecl(pChildren[1]);
        pTypeDeclInstruction._push(pStructInstruction, true);
    }
    else {
        _error(pContext, pNode, EEffectErrors.UNSUPPORTED_TYPEDECL);
    }

    checkInstruction(pTypeDeclInstruction, ECheckStage.CODE_TARGET_SUPPORT);
    addTypeDecl(pTypeDeclInstruction);

    pNode.isAnalyzed = true;

    if (!isNull(pParentInstruction)) {
        pParentInstruction._push(pTypeDeclInstruction, true);
    }

    return pTypeDeclInstruction;
}


function analyzeGlobalTypeDecls(pContext: Context, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'TypeDecl') {
            analyzeTypeDecl(pContext, pChildren[i]);
        }
    }
}


function analyzeFunctionDefinitions(pContext: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'FunctionDecl') {
            analyzeFunctionDeclOnlyDefinition(pChildren[i]);
        }
    }
}


function analyzeGlobalImports(pContext: Context, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'ImportDecl') {
            analyzeImportDecl(pContext, pChildren[i], null);
        }
    }
}


function analyzeTechniqueImports(pContext: Context, scope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'TechniqueDecl') {
            analyzeTechniqueForImport(pChildren[i]);
        }
    }
}


function analyzeVariableDecls(pContext: Context, pScope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(pContext, pScope, pChildren[i]);
        }
        else if (pChildren[i].name === 'VarStructDecl') {
            analyzeVarStructDecl(pChildren[i]);
        }
    }
}


function analyzeFunctionDecls(pContext: Context, pScope: ProgramScope): void {
    for (let i: number = 0; i < pContext.functionWithImplementationList.length; i++) {
        resumeFunctionAnalysis(pContext, pScope, pContext.functionWithImplementationList[i]);
    }

    checkFunctionsForRecursion(pContext);
    checkFunctionForCorrectUsage();
    generateInfoAboutUsedData();
    generateShadersFromFunctions();
}


function analyzeTechniques(pContext: Context): void {
    for (let i: number = 0; i < pContext.techniqueList.length; i++) {
        resumeTechniqueAnalysis(pContext.techniqueList[i]);
    }
}



initSystemTypes();
initSystemFunctions();
initSystemVariables();


class Context {
    public currentFunction: IAFXFunctionDeclInstruction | null = null;
    public currentPass: IAFXPassInstruction | null = null;
    public haveCurrentFunctionReturnOccur: boolean = false;
    public analyzedFileName: string | null = null;
    public isAnalyzeInPass: boolean = false;
    public pointerForExtractionList: IAFXVariableDeclInstruction[] | null = null;
    public functionWithImplementationList: IAFXFunctionDeclInstruction[] = [];
    public techniqueList: IAFXTechniqueInstruction[] = [];
    public techniqueMap: IMap<IAFXTechniqueInstruction> = {};
    public provideNameSpace: string | null = null;

    constructor(filename: string) {
        analyzedFileName = filename;
    }

    function setCurrentAnalyzedFunction(pFunction: IAFXFunctionDeclInstruction): void {
    _pCurrentFunction = pFunction;
    _bHaveCurrentFunctionReturnOccur = false;
}
}

function analyze(sAnalyzedFileName: string, pTree: IParseTree): boolean {
    const pContext: Context = new Context(sAnalyzedFileName);

    const scope: ProgramScope = new ProgramScope();

    let iParseTime: number = time();

    try {
        scope._newScope(EScopeType.k_Default);

        analyzeGlobalUseDecls(state);
        analyzeGlobalProvideDecls(state);
        analyzeGlobalTypeDecls(state);
        analyzeFunctionDefinitions(state);
        analyzeGlobalImports(state);
        analyzeTechniqueImports(state);
        analyzeVariableDecls(state);
        analyzeFunctionDecls(state);
        analyzeTechniques(state);

        scope._endScope();
    }
    catch (e) {
        throw e;
    }

    console.log('analyze time: ', time() - iParseTime);

    return true;
}


