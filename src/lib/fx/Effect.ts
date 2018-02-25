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


function getNodeSourceLocation(pNode: IParseNode): { line: number; column: number; } | null {
    if (!isDefAndNotNull(pNode)) {
        return null;
    }
    if (isDef(pNode.loc)) {
        return { line: pNode.loc.start.line, column: pNode.loc.start.column };
    } else {
        return getNodeSourceLocation(pNode.children[pNode.children.length - 1]);
    }
}


let pSystemTypes: IMap<SystemTypeInstruction> = {};
let pSystemFunctionsMap: IMap<SystemFunctionInstruction[]> = {};
let pSystemVariables: IMap<IVariableDeclInstruction> = {};
let pSystemVertexOut: ComplexTypeInstruction = null;
let pSystemFunctionHashMap: IMap<boolean> = {};

function generateSystemType(
    sName: string,
    sRealName: string,
    iSize: number = 1,
    isArray: boolean = false,
    pElementType: ITypeInstruction = null,
    iLength: number = 1
): ITypeInstruction {

    if (isDef(pSystemTypes[sName])) {
        return null;
    }

    let pSystemType: SystemTypeInstruction = new SystemTypeInstruction();

    pSystemType.name = sName;
    pSystemType.realName = sRealName;
    pSystemType.size = iSize;

    if (isArray) {
        pSystemType.addIndex(pElementType, iLength);
    }

    pSystemTypes[sName] = pSystemType;
    pSystemType.builtIn = true;

    return pSystemType;
}


function addFieldsToVectorFromSuffixObject(pSuffixMap: IMap<boolean>, pType: ITypeInstruction, sBaseType: string) {
    let sSuffix: string = null;

    for (sSuffix in pSuffixMap) {
        let sFieldTypeName: string = sBaseType + ((sSuffix.length > 1) ? sSuffix.length.toString() : '');
        let pFieldType: ITypeInstruction = getSystemType(sFieldTypeName);

        (<SystemTypeInstruction>pType).addField(sSuffix, pFieldType, pSuffixMap[sSuffix]);
    }
}


function generateNotBuildtInSystemType(sName: string, sRealName: string, sDeclString: string,
    iSize: number = 1, isArray: boolean = false,
    pElementType: ITypeInstruction = null, iLength: number = 1
): ITypeInstruction {

    if (isDef(pSystemTypes[sName])) {
        return null;
    }

    let pSystemType: SystemTypeInstruction = new SystemTypeInstruction();
    pSystemType.name = sName;
    pSystemType.realName = (sRealName);
    pSystemType.size = (iSize);
    pSystemType.declString = (sDeclString);

    if (isArray) {
        pSystemType.addIndex(pElementType, iLength);
    }

    pSystemTypes[sName] = pSystemType;
    pSystemType.builtIn = (false);

    let pSystemTypeDecl: ITypeDeclInstruction = new TypeDeclInstruction(null);
    pSystemTypeDecl.push(pSystemType, true);
    pSystemTypeDecl.builtIn = (false);

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
        pType.isEqual(getSystemType('ptr')) ||
        pType.isEqual(getSystemType('float'));
}

export function isFloatBasedType(pType: ITypeInstruction): boolean {
    return pType.isEqual(getSystemType('float')) ||
        pType.isEqual(getSystemType('float2')) ||
        pType.isEqual(getSystemType('float3')) ||
        pType.isEqual(getSystemType('float4')) ||
        pType.isEqual(getSystemType('float2x2')) ||
        pType.isEqual(getSystemType('float3x3')) ||
        pType.isEqual(getSystemType('float4x4')) ||
        pType.isEqual(getSystemType('ptr'));
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


function generateSystemFunction(sName: string, sTranslationExpr: string,
    sReturnTypeName: string,
    pArgumentsTypes: string[],
    pTemplateTypes: string[],
    isForVertex: boolean = true, isForPixel: boolean = true): void {

    var pExprTranslator: ExprTemplateTranslator = new ExprTemplateTranslator(sTranslationExpr);
    var pSystemFunctions: IMap<SystemFunctionInstruction[]> = pSystemFunctionsMap;
    var pTypes: ITypeInstruction[] = null;
    var sFunctionHash: string = "";
    var pReturnType: ITypeInstruction = null;
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

            pFunction.vertex = (isForVertex);
            pFunction.pixel = (isForPixel);

            pSystemFunctions[sName].push(pFunction);
            pFunction.builtIn = (true);
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

        pFunction.vertex = (isForVertex);
        pFunction.pixel = (isForPixel);

        if (!isDef(pSystemFunctions[sName])) {
            pSystemFunctions[sName] = [];
        }

        pSystemFunctions[sName].push(pFunction);
        pFunction.builtIn = (true);
    }

}


function generateNotBuiltInSystemFuction(sName: string, sDefenition: string, sImplementation: string,
    sReturnType: string,
    pUsedTypes: string[],
    pUsedFunctions: string[]): void {

    if (isDef(pSystemFunctionsMap[sName])) {
        return;
    }

    let pReturnType: ITypeInstruction = getSystemType(sReturnType);
    let pFunction: SystemFunctionInstruction = new SystemFunctionInstruction(sName, pReturnType, null, null);

    pFunction.definition = sDefenition;
    pFunction.implementaion = sImplementation;

    let pUsedExtSystemTypes: ITypeDeclInstruction[] = [];
    let pUsedExtSystemFunctions: IFunctionDeclInstruction[] = [];

    if (!isNull(pUsedTypes)) {
        for (let i: number = 0; i < pUsedTypes.length; i++) {
            let pTypeDecl: ITypeDeclInstruction = <ITypeDeclInstruction>getSystemType(pUsedTypes[i]).parent;
            if (!isNull(pTypeDecl)) {
                pUsedExtSystemTypes.push(pTypeDecl);
            }
        }
    }

    if (!isNull(pUsedFunctions)) {
        for (let i: number = 0; i < pUsedFunctions.length; i++) {
            let pFindFunction: IFunctionDeclInstruction = findSystemFunction(pUsedFunctions[i], null);
            pUsedExtSystemFunctions.push(pFindFunction);
        }
    }

    pFunction.setUsedSystemData(pUsedExtSystemTypes, pUsedExtSystemFunctions);
    pFunction.closeSystemDataInfo();
    pFunction.builtIn = (false);

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

    let pVariableDecl: IVariableDeclInstruction = new VariableDeclInstruction(null);
    let pName: IIdInstruction = new IdInstruction(null);
    let pType: IVariableTypeInstruction = new VariableTypeInstruction(null);

    pName.name = sName;
    pName.realName = (sRealName);

    pType.pushType(getSystemType(sTypeName));

    if (isOnlyRead) {
        pType.writable = (false);
    }

    pVariableDecl.vertex = (isForVertex);
    pVariableDecl.pixel = (isForPixel);

    pVariableDecl.push(pType, true);
    pVariableDecl.push(pName, true);

    pSystemVariables[sName] = pVariableDecl;

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
    console.assert(isNull(pSystemVariables))
    addSystemVariables();
}


function findSystemFunction(sFunctionName: string,
    pArguments: ITypedInstruction[]): IFunctionDeclInstruction {
    let pSystemFunctions: SystemFunctionInstruction[] = pSystemFunctionsMap[sFunctionName];

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


function findFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IExprInstruction[]): IFunctionDeclInstruction;
function findFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IVariableDeclInstruction[]): IFunctionDeclInstruction;
function findFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: ITypedInstruction[]): IFunctionDeclInstruction {
    return findSystemFunction(sFunctionName, pArguments) ||
        pScope.getFunction(sFunctionName, pArguments);
}


function findConstructor(pType: ITypeInstruction,
    pArguments: IExprInstruction[]): IVariableTypeInstruction {

    let pVariableType: IVariableTypeInstruction = new VariableTypeInstruction(null);
    pVariableType.pushType(pType);

    return pVariableType;
}


function findShaderFunction(pScope: ProgramScope, sFunctionName: string,
    pArguments: IExprInstruction[]): IFunctionDeclInstruction {
    return pScope.getShaderFunction(sFunctionName, pArguments);
}


function findFunctionByDef(pScope: ProgramScope, pDef: FunctionDefInstruction): IFunctionDeclInstruction {
    return findFunction(pScope, pDef.name, pDef.arguments);
}


export function getBaseVertexOutType(): ComplexTypeInstruction {
    return pSystemVertexOut;
}


export function getSystemType(sTypeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    return pSystemTypes[sTypeName] || null;
}


export function getSystemVariable(sName: string): IVariableDeclInstruction {
    return pSystemVariables[sName] || null;
}


function getVariable(pScope: ProgramScope, sName: string): IVariableDeclInstruction {
    return getSystemVariable(sName) || pScope.getVariable(sName);
}


function getType(pScope: ProgramScope, sTypeName: string): ITypeInstruction {
    return getSystemType(sTypeName) || pScope.getType(sTypeName);
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


function analyzeUseDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode): void {
    pScope.useStrictMode();
}


function analyzeComplexName(pNode: IParseNode): string {
    const pChildren: IParseNode[] = pNode.children;
    let sName: string = '';

    for (let i: number = pChildren.length - 1; i >= 0; i--) {
        sName += pChildren[i].value;
    }

    return sName;
}


function analyzeGlobalUseDecls(pContext: Context, pScope: ProgramScope, pTree: IParseTree): void {
    let pChildren: IParseNode[] = pTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'UseDecl') {
            analyzeUseDecl(pContext, pScope, pChildren[i]); // << always 'use strict' by default!
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


function analyzeGlobalProvideDecls(pContext: Context, pScope: ProgramScope, pTree: IParseTree): void {
    let pChildren: IParseNode[] = pTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'ProvideDecl') {
            analyzeProvideDecl(pContext, pChildren[i]);
        }
    }
}


function analyzeInitExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IInitExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pInitExpr: IInitExprInstruction = new InitExprInstruction(pNode);

    if (pChildren.length === 1) {
        pInitExpr.push(analyzeExpr(pContext, pScope, pChildren[0]), true);
    }
    else {
        for (let i: number = 0; i < pChildren.length; i++) {
            if (pChildren[i].name === 'InitExpr') {
                pInitExpr.push(analyzeInitExpr(pContext, pScope, pChildren[i]), true);
            }
        }
    }

    return pInitExpr;
}



function _errorFromInstruction(pContext: Context, pNode: IParseNode, pError: IInstructionError): void {
    _error(pContext, pNode, pError.code, isNull(pError.info) ? {} : pError.info);
}


function checkInstruction(pContext: Context, pInst: IInstruction, eStage: ECheckStage): void {
    if (!pInst._check(eStage)) {
        _errorFromInstruction(pContext, pInst.sourceNode, pInst._getLastError());
    }
}


function addVariableDecl(pContext: Context, pScope: ProgramScope, pVariable: IVariableDeclInstruction): void {
    if (isSystemVariable(pVariable)) {
        _error(pContext, pVariable.sourceNode, EEffectErrors.REDEFINE_SYSTEM_VARIABLE, { varName: pVariable.name });
    }

    let isVarAdded: boolean = pScope.addVariable(pVariable);

    if (!isVarAdded) {
        let eScopeType: EScopeType = pScope.type;

        switch (eScopeType) {
            case EScopeType.k_Default:
                _error(pContext, pVariable.sourceNode, EEffectErrors.REDEFINE_VARIABLE, { varName: pVariable.name });
                break;
            case EScopeType.k_Struct:
                _error(pContext, pVariable.sourceNode, EEffectErrors.BAD_NEW_FIELD_FOR_STRUCT_NAME, { fieldName: pVariable.name });
                break;
            case EScopeType.k_Annotation:
                _error(pContext, pVariable.sourceNode, EEffectErrors.BAD_NEW_ANNOTATION_VAR, { varName: pVariable.name });
                break;
        }
    }

    if (pVariable.name === 'Out' && !isNull(pContext.currentFunction)) {
        let isOk: boolean = pContext.currentFunction.addOutVariable(pVariable);
        if (!isOk) {
            _error(pContext, pVariable.sourceNode, EEffectErrors.BAD_OUT_VARIABLE_IN_FUNCTION);
        }
    }
}


function addTypeDecl(pContext: Context, pScope: ProgramScope, pType: ITypeDeclInstruction): void {
    if (isSystemType(pType)) {
        _error(pContext, pType.sourceNode, EEffectErrors.REDEFINE_SYSTEM_TYPE, { typeName: pType.name });
    }

    let isTypeAdded: boolean = pScope.addType(pType);

    if (!isTypeAdded) {
        _error(pContext, pType.sourceNode, EEffectErrors.REDEFINE_TYPE, { typeName: pType.name });
    }
}


function addFunctionDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pFunction: IFunctionDeclInstruction): void {
    if (isSystemFunction(pFunction)) {
        _error(pContext, pNode, EEffectErrors.REDEFINE_SYSTEM_FUNCTION, { funcName: pFunction.name });
    }

    let isFunctionAdded: boolean = pScope.addFunction(pFunction);

    if (!isFunctionAdded) {
        _error(pContext, pNode, EEffectErrors.REDEFINE_FUNCTION, { funcName: pFunction.name });
    }
}


function addTechnique(pContext: Context, pScope: ProgramScope, pTechnique: ITechniqueInstruction): void {
    let sName: string = pTechnique.name;

    if (isDef(pContext.techniqueMap[sName])) {
        _error(pContext, pTechnique.sourceNode, EEffectErrors.BAD_TECHNIQUE_REDEFINE_NAME, { techName: sName });
        return;
    }

    pContext.techniqueMap[sName] = pTechnique;
    pContext.techniqueList.push(pTechnique);
}


function checkFunctionsForRecursion(pContext: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = pContext.functionWithImplementationList;
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
                    let pNode = pAddedFunction.sourceNode;

                    if (pTestedFunction === pAddedFunction) {
                        pTestedFunction.addToBlackList();
                        isNewDelete = true;
                        _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_USAGE_RECURSION, { funcDef: pTestedFunction.stringDef });
                        continue mainFor;
                    }

                    if (pAddedFunction.isBlackListFunction() ||
                        !pAddedFunction.canUsedAsFunction()) {
                        pTestedFunction.addToBlackList();
                        _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_USAGE_BLACKLIST, { funcDef: pTestedFunction.stringDef });
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


function checkFunctionForCorrectUsage(pContext: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = pContext.functionWithImplementationList;
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
                _error(pContext, pTestedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction.stringDef });
                pTestedFunction.addToBlackList();
                isNewDelete = true;
                continue mainFor;
            }

            if (!pTestedFunction.checkPixelUsage()) {
                _error(pContext, pTestedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction.stringDef });
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
                        _error(pContext, pUsedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: pTestedFunction.stringDef });
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
                        _error(pContext, pUsedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: pTestedFunction.stringDef });
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


function generateInfoAboutUsedData(pContext: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = pContext.functionWithImplementationList;

    for (let i: number = 0; i < pFunctionList.length; i++) {
        pFunctionList[i].generateInfoAboutUsedData();
    }
}


function generateShadersFromFunctions(pContext: Context): void {
    let pFunctionList: IFunctionDeclInstruction[] = pContext.functionWithImplementationList;

    for (let i: number = 0; i < pFunctionList.length; i++) {
        // let pShader: IFunctionDeclInstruction = null;

        if (pFunctionList[i].isUsedAsVertex()) {
            // pShader = pFunctionList[i]._convertToVertexShader();
        }
        if (pFunctionList[i].isUsedAsPixel()) {
            // pShader = pFunctionList[i]._convertToPixelShader();
        }

        if (pFunctionList[i]._isErrorOccured()) {
            _errorFromInstruction(pContext, pFunctionList[i].sourceNode, pFunctionList[i]._getLastError());
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
    pContext: Context,
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
            _error(pContext, pLeftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        if (!pRightType.readable) {
            _error(pContext, pRightType.sourceNode,EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (sOperator !== '=' && !pLeftType.readable) {
            _error(pContext, pLeftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        }
    }
    else {
        if (!pLeftType.readable) {
            _error(pContext, pLeftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!pRightType.readable) {
            _error(pContext, pRightType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
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
function checkOneOperandExprType(pContext: Context, pNode: IParseNode, sOperator: string,
    pType: IVariableTypeInstruction): IVariableTypeInstruction {

    const isComplex: boolean = pType.isComplex();
    const isArray: boolean = pType.isNotBaseArray();
    const isSampler: boolean = isSamplerType(pType);

    if (isComplex || isArray || isSampler) {
        return null;
    }

    if (!pType.readable) {
        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }


    if (sOperator === '++' || sOperator === '--') {
        if (!pType.writable) {
            _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
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


function analyzeVariableDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pInstruction: IInstruction = null): void {
    let pChildren: IParseNode[] = pNode.children;
    let pGeneralType: IVariableTypeInstruction = null;
    let pVariable: IVariableDeclInstruction = null;
    let i: number = 0;

    pGeneralType = analyzeUsageType(pContext, pScope, pChildren[pChildren.length - 1]);

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'Variable') {
            pVariable = analyzeVariable(pContext, pScope, pChildren[i], pGeneralType);

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


function analyzeUsageType(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IVariableTypeInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let i: number = 0;
    let pType: IVariableTypeInstruction = new VariableTypeInstruction(pNode);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'Type') {
            let pMainType: ITypeInstruction = analyzeType(pContext, pScope, pChildren[i]);
            pType.pushType(pMainType);
        }
        else if (pChildren[i].name === 'Usage') {
            let sUsage: string = analyzeUsage(pChildren[i]);
            pType.addUsage(sUsage);
        }
    }

    checkInstruction(pContext, pType, ECheckStage.CODE_TARGET_SUPPORT);
    return pType;
}


function analyzeType(pContext: Context, pScope: ProgramScope, pNode: IParseNode): ITypeInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pType: ITypeInstruction = null;

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


function analyzeVariable(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pGeneralType: IVariableTypeInstruction): IVariableDeclInstruction {
    let pChildren: IParseNode[] = pNode.children;

    let pVarDecl: IVariableDeclInstruction = new VariableDeclInstruction(pNode);
    let pVariableType: IVariableTypeInstruction = new VariableTypeInstruction(pNode);
    let pAnnotation: IAnnotationInstruction = null;
    let sSemantic: string = '';
    let pInitExpr: IInitExprInstruction = null;

    pVarDecl.push(pVariableType, true);
    pVariableType.pushType(pGeneralType);
    pVarDecl.scope = (pScope.current);

    analyzeVariableDim(pContext, pScope, pChildren[pChildren.length - 1], pVarDecl);

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
            pInitExpr = analyzeInitializer(pContext, pScope, pChildren[i]);
            if (!pInitExpr.optimizeForVariableType(pVariableType)) {
                _error(pContext, pNode, EEffectErrors.BAD_VARIABLE_INITIALIZER, { varName: pVarDecl.name });
                return null;
            }
            pVarDecl.push(pInitExpr, true);
        }
    }

    checkInstruction(pContext, pVarDecl, ECheckStage.CODE_TARGET_SUPPORT);
    addVariableDecl(pContext, pScope, pVarDecl);
    pVarDecl.fillNameIndex();

    return pVarDecl;
}


function analyzeVariableDim(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pVariableDecl: IVariableDeclInstruction): void {
    let pChildren: IParseNode[] = pNode.children;
    let pVariableType: IVariableTypeInstruction = <IVariableTypeInstruction>pVariableDecl.type;

    if (pChildren.length === 1) {
        let pName: IIdInstruction = new IdInstruction(pNode);
        pName.name = (pChildren[0].value);
        pVariableDecl.push(pName, true);
        return;
    }

    analyzeVariableDim(pContext, pScope, pChildren[pChildren.length - 1], pVariableDecl);

    {
        let pIndexExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 3]);
        pVariableType.addArrayIndex(pIndexExpr);
    }
}


function analyzeAnnotation(pNode: IParseNode): IAnnotationInstruction {
    // todo
    return null;
}


function analyzeSemantic(pNode: IParseNode): string {
    let sSemantic: string = pNode.children[0].value;
    // let pDecl: IDeclInstruction = <IDeclInstruction>_pCurrentInstruction;
    // pDecl.semantics = (sSemantic);
    return sSemantic;
}


function analyzeInitializer(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IInitExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pInitExpr: IInitExprInstruction = new InitExprInstruction(pNode);

    if (pChildren.length === 2) {
        pInitExpr.push(analyzeExpr(pContext, pScope, pChildren[0]), true);
    }
    else {
        for (let i: number = pChildren.length - 3; i >= 1; i--) {
            if (pChildren[i].name === 'InitExpr') {
                pInitExpr.push(analyzeInitExpr(pContext, pScope, pChildren[i]), true);
            }
        }
    }

    return pInitExpr;
}


function analyzeExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    let sName: string = pNode.name;

    switch (sName) {
        case 'ObjectExpr':
            return analyzeObjectExpr(pContext, pScope, pNode);
        case 'ComplexExpr':
            return analyzeComplexExpr(pContext, pScope, pNode);
        case 'PostfixExpr':
            return analyzePostfixExpr(pContext, pScope, pNode);
        case 'UnaryExpr':
            return analyzeUnaryExpr(pContext, pScope, pNode);
        case 'CastExpr':
            return analyzeCastExpr(pContext, pScope, pNode);
        case 'ConditionalExpr':
            return analyzeConditionalExpr(pContext, pScope, pNode);
        case 'MulExpr':
        case 'AddExpr':
            return analyzeArithmeticExpr(pContext, pScope, pNode);
        case 'RelationalExpr':
        case 'EqualityExpr':
            return analyzeRelationExpr(pContext, pScope, pNode);
        case 'AndExpr':
        case 'OrExpr':
            return analyzeLogicalExpr(pContext, pScope, pNode);
        case 'AssignmentExpr':
            return analyzeAssignmentExpr(pContext, pScope, pNode);
        case 'T_NON_TYPE_ID':
            return analyzeIdExpr(pContext, pScope, pNode);
        case 'T_STRING':
        case 'T_UINT':
        case 'T_FLOAT':
        case 'T_KW_TRUE':
        case 'T_KW_FALSE':
            return analyzeSimpleExpr(pContext, pScope, pNode);
        default:
            _error(pContext, pNode, EEffectErrors.UNSUPPORTED_EXPR, { exprName: sName });
            break;
    }

    return null;
}


function analyzeObjectExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    let sName: string = pNode.children[pNode.children.length - 1].name;

    switch (sName) {
        case 'T_KW_COMPILE':
            return analyzeCompileExpr(pContext, pScope, pNode);
        case 'T_KW_SAMPLER_STATE':
            return analyzeSamplerStateBlock(pContext, pScope, pNode);
        default:
    }
    return null;
}


function analyzeCompileExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pExpr: CompileExprInstruction = new CompileExprInstruction(pNode);
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
                pArgumentExpr = analyzeExpr(pContext, pScope, pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pShaderFunc = findShaderFunction(pScope, sShaderFuncName, pArguments);

    if (isNull(pShaderFunc)) {
        _error(pContext, pNode, EEffectErrors.BAD_COMPILE_NOT_FUNCTION, { funcName: sShaderFuncName });
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

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSamplerStateBlock(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    pNode = pNode.children[0];

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: SamplerStateBlockInstruction = new SamplerStateBlockInstruction(pNode);
    let i: number = 0;

    pExpr.operator = ('sample_state');

    for (i = pChildren.length - 2; i >= 1; i--) {
        analyzeSamplerState(pContext, pScope, pChildren[i], pExpr);
    }

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSamplerState(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pSamplerStates: SamplerStateBlockInstruction): void {

    let pChildren: IParseNode[] = pNode.children;
    if (pChildren[pChildren.length - 2].name === 'StateIndex') {
        _error(pContext, pNode, EEffectErrors.NOT_SUPPORT_STATE_INDEX);
        return;
    }

    let pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
    let pSubStateExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
    let sStateType: string = pChildren[pChildren.length - 1].value.toUpperCase();
    let sStateValue: string = '';

    if (isNull(pSubStateExprNode.value)) {
        _error(pContext, pSubStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
        return;
    }

    let pTexture: IVariableDeclInstruction = null;

    switch (sStateType) {
        case 'TEXTURE':
            // let pTexture: IVariableDeclInstruction = null;
            if (pStateExprNode.children.length !== 3 || pSubStateExprNode.value === '{') {
                _error(pContext, pSubStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return;
            }
            let sTextureName: string = pStateExprNode.children[1].value;
            if (isNull(sTextureName) || !pScope.hasVariable(sTextureName)) {
                _error(pContext, pStateExprNode.children[1], EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return;
            }

            pTexture = getVariable(pScope, sTextureName);
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


function analyzeComplexExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'T_NON_TYPE_ID':
            return analyzeFunctionCallExpr(pContext, pScope, pNode);
        case 'BaseType':
        case 'T_TYPE_ID':
            return analyzeConstructorCallExpr(pContext, pScope, pNode);
        default:
            return analyzeSimpleComplexExpr(pContext, pScope, pNode);
    }
}


function analyzeFunctionCallExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pExpr: IExprInstruction = null;
    let pExprType: IVariableTypeInstruction = null;
    let pArguments: IExprInstruction[] = null;
    let sFuncName: string = pChildren[pChildren.length - 1].value;
    let pFunction: IFunctionDeclInstruction = null;
    let pFunctionId: IIdExprInstruction = null;
    let i: number = 0;
    let pCurrentAnalyzedFunction: IFunctionDeclInstruction = pContext.currentFunction;

    if (pChildren.length > 3) {
        let pArgumentExpr: IExprInstruction;

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
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }

                    if (pArguments[i].type.isStrongEqual(getSystemType('ptr'))) {
                        pContext.pointerForExtractionList.push(pArguments[i].type.parentVarDecl);
                    }
                }
                else if (pFunctionArguments[i].type.hasUsage('inout')) {
                    if (!pArguments[i].type.writable) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }

                    if (!pArguments[i].type.readable) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }

                    if (pArguments[i].type.isStrongEqual(getSystemType('ptr'))) {
                        pContext.pointerForExtractionList.push(pArguments[i].type.parentVarDecl);
                    }
                }
                else {
                    if (!pArguments[i].type.readable) {
                        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
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
                    _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
                    return null;
                }
            }
        }

        pExpr = pSystemCallExpr;

        if (!pFunction.builtIn && !isNull(pCurrentAnalyzedFunction)) {
            pCurrentAnalyzedFunction.addUsedFunction(pFunction);
        }
    }

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeConstructorCallExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {
    let pChildren: IParseNode[] = pNode.children;
    let pExpr: ConstructorCallInstruction = new ConstructorCallInstruction(pNode);
    let pExprType: IVariableTypeInstruction = null;
    let pArguments: IExprInstruction[] = null;
    let pConstructorType: ITypeInstruction = null;
    let i: number = 0;

    pConstructorType = analyzeType(pContext, pScope, pChildren[pChildren.length - 1]);

    if (isNull(pConstructorType)) {
        _error(pContext, pNode, EEffectErrors.BAD_COMPLEX_NOT_TYPE);
        return null;
    }

    if (pChildren.length > 3) {
        let pArgumentExpr: IExprInstruction = null;

        pArguments = [];

        for (i = pChildren.length - 3; i > 0; i--) {
            if (pChildren[i].value !== ',') {
                pArgumentExpr = analyzeExpr(pContext, pScope,pChildren[i]);
                pArguments.push(pArgumentExpr);
            }
        }
    }

    pExprType = findConstructor(pConstructorType, pArguments);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_COMPLEX_NOT_CONSTRUCTOR, { typeName: pConstructorType.toString() });
        return null;
    }

    pExpr.type = (pExprType);
    pExpr.push(pConstructorType, false);

    if (!isNull(pArguments)) {
        for (i = 0; i < pArguments.length; i++) {
            if (!pArguments[i].type.readable) {
                _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
                return null;
            }

            pExpr.push(pArguments[i], true);
        }
    }

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeSimpleComplexExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: ComplexExprInstruction = new ComplexExprInstruction(pNode);
    let pComplexExpr: IExprInstruction;
    let pExprType: IVariableTypeInstruction;

    pComplexExpr = analyzeExpr(pContext, pScope,pChildren[1]);
    pExprType = <IVariableTypeInstruction>pComplexExpr.type;

    pExpr.type = (pExprType);
    pExpr.push(pComplexExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}



function analyzePostfixExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sSymbol: string = pChildren[pChildren.length - 2].value;

    switch (sSymbol) {
        case '[':
            return analyzePostfixIndex(pContext, pScope,pNode);
        case '.':
            return analyzePostfixPoint(pContext, pScope,pNode);
        case '++':
        case '--':
            return analyzePostfixArithmetic(pContext, pScope,pNode);
    }

    return null;
}


function analyzePostfixIndex(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: PostfixIndexInstruction = new PostfixIndexInstruction(pNode);
    let pPostfixExpr: IExprInstruction = null;
    let pIndexExpr: IExprInstruction = null;
    let pExprType: IVariableTypeInstruction = null;
    let pPostfixExprType: IVariableTypeInstruction = null;
    let pIndexExprType: IVariableTypeInstruction = null;
    let pIntType: ITypeInstruction = null;

    pPostfixExpr = analyzeExpr(pContext, pScope,pChildren[pChildren.length - 1]);
    pPostfixExprType = <IVariableTypeInstruction>pPostfixExpr.type;

    if (!pPostfixExprType.isArray()) {
        _error(pContext, pNode, EEffectErrors.BAD_POSTIX_NOT_ARRAY, { typeName: pPostfixExprType.toString() });
        return null;
    }

    pIndexExpr = analyzeExpr(pContext, pScope,pChildren[pChildren.length - 3]);
    pIndexExprType = <IVariableTypeInstruction>pIndexExpr.type;

    pIntType = getSystemType('number');

    if (!pIndexExprType.isEqual(pIntType)) {
        _error(pContext, pNode, EEffectErrors.BAD_POSTIX_NOT_INT_INDEX, { typeName: pIndexExprType.toString() });
        return null;
    }

    pExprType = <IVariableTypeInstruction>(pPostfixExprType.arrayElementType);

    pExpr.type = (pExprType);
    pExpr.push(pPostfixExpr, true);
    pExpr.push(pIndexExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzePostfixPoint(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: PostfixPointInstruction = new PostfixPointInstruction(pNode);
    let pPostfixExpr: IExprInstruction = null;
    let sFieldName: string = '';
    let pFieldNameExpr: IIdExprInstruction = null;
    let pExprType: IVariableTypeInstruction = null;
    let pPostfixExprType: IVariableTypeInstruction = null;

    pPostfixExpr = analyzeExpr(pContext, pScope,pChildren[pChildren.length - 1]);
    pPostfixExprType = <IVariableTypeInstruction>pPostfixExpr.type;

    sFieldName = pChildren[pChildren.length - 3].value;

    pFieldNameExpr = pPostfixExprType.getFieldExpr(sFieldName);

    if (isNull(pFieldNameExpr)) {
        _error(pContext, pNode, EEffectErrors.BAD_POSTIX_NOT_FIELD, {
            typeName: pPostfixExprType.toString(),
            fieldName: sFieldName
        });
        return null;
    }

    pExprType = <IVariableTypeInstruction>pFieldNameExpr.type;
    pExpr.type = (pExprType);
    pExpr.push(pPostfixExpr, true);
    pExpr.push(pFieldNameExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzePostfixArithmetic(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pChildren[0].value;
    let pExpr: PostfixArithmeticInstruction = new PostfixArithmeticInstruction(pNode);
    let pPostfixExpr: IExprInstruction;
    let pExprType: IVariableTypeInstruction;
    let pPostfixExprType: IVariableTypeInstruction;

    pPostfixExpr = analyzeExpr(pContext, pScope, pChildren[1]);
    pPostfixExprType = <IVariableTypeInstruction>pPostfixExpr.type;

    pExprType = checkOneOperandExprType(pContext, pNode, sOperator, pPostfixExprType);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_POSTIX_ARITHMETIC, {
            operator: sOperator,
            typeName: pPostfixExprType.toString()
        });
        return null;
    }

    pExpr.type = (pExprType);
    pExpr.operator = (sOperator);
    pExpr.push(pPostfixExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeUnaryExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pChildren[1].value;
    let pExpr: UnaryExprInstruction = new UnaryExprInstruction(pNode);
    let pUnaryExpr: IExprInstruction;
    let pExprType: IVariableTypeInstruction;
    let pUnaryExprType: IVariableTypeInstruction;

    pUnaryExpr = analyzeExpr(pContext, pScope,pChildren[0]);
    pUnaryExprType = <IVariableTypeInstruction>pUnaryExpr.type;

    pExprType = checkOneOperandExprType(pContext, pNode, sOperator, pUnaryExprType);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_UNARY_OPERATION, <IEffectErrorInfo>{
            operator: sOperator,
            tyepName: pUnaryExprType.toString()
        });
        return null;
    }

    pExpr.operator = (sOperator);
    pExpr.type = (pExprType);
    pExpr.push(pUnaryExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeCastExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: CastExprInstruction = new CastExprInstruction(pNode);
    let pExprType: IVariableTypeInstruction;
    let pCastedExpr: IExprInstruction;

    pExprType = analyzeConstTypeDim(pContext, pScope, pChildren[2]);
    pCastedExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    if (!(<IVariableTypeInstruction>pCastedExpr.type).readable) {
        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr.type = (pExprType);
    pExpr.push(pExprType, true);
    pExpr.push(pCastedExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeConditionalExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let pExpr: ConditionalExprInstruction = new ConditionalExprInstruction(pNode);
    let pConditionExpr: IExprInstruction;
    let pTrueExpr: IExprInstruction;
    let pFalseExpr: IExprInstruction;
    let pConditionType: IVariableTypeInstruction;
    let pTrueExprType: IVariableTypeInstruction;
    let pFalseExprType: IVariableTypeInstruction;
    let pBoolType: ITypeInstruction;

    pConditionExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 1]);
    pTrueExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 3]);
    pFalseExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    pConditionType = <IVariableTypeInstruction>pConditionExpr.type;
    pTrueExprType = <IVariableTypeInstruction>pTrueExpr.type;
    pFalseExprType = <IVariableTypeInstruction>pFalseExpr.type;

    pBoolType = getSystemType('bool');

    if (!pConditionType.isEqual(pBoolType)) {
        _error(pContext, pConditionExpr.sourceNode, EEffectErrors.BAD_CONDITION_TYPE, { typeName: pConditionType.toString() });
        return null;
    }

    if (!pTrueExprType.isEqual(pFalseExprType)) {
        _error(pContext, pTrueExprType.sourceNode, EEffectErrors.BAD_CONDITION_VALUE_TYPES, <IEffectErrorInfo>{
            leftTypeName: pTrueExprType.toString(),
            rightTypeName: pFalseExprType.toString()
        });
        return null;
    }

    if (!pConditionType.readable) {
        _error(pContext, pConditionType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pTrueExprType.readable) {
        _error(pContext, pTrueExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pFalseExprType.readable) {
        _error(pContext, pFalseExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr.type = (pTrueExprType);
    pExpr.push(pConditionExpr, true);
    pExpr.push(pTrueExpr, true);
    pExpr.push(pFalseExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeArithmeticExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pNode.children[1].value;
    let pExpr: ArithmeticExprInstruction = new ArithmeticExprInstruction(pNode);
    let pLeftExpr: IExprInstruction = null;
    let pRightExpr: IExprInstruction = null;
    let pLeftType: IVariableTypeInstruction = null;
    let pRightType: IVariableTypeInstruction = null;
    let pExprType: IVariableTypeInstruction = null;

    pLeftExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    pExprType = checkTwoOperandExprTypes(pContext, sOperator, pLeftType, pRightType);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_ARITHMETIC_OPERATION, <IEffectErrorInfo>{
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

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);
    return pExpr;
}


function analyzeRelationExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pNode.children[1].value;
    let pExpr: RelationalExprInstruction = new RelationalExprInstruction(pNode);
    let pLeftExpr: IExprInstruction;
    let pRightExpr: IExprInstruction;
    let pLeftType: IVariableTypeInstruction;
    let pRightType: IVariableTypeInstruction;
    let pExprType: IVariableTypeInstruction;

    pLeftExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    pExprType = checkTwoOperandExprTypes(pContext, sOperator, pLeftType, pRightType);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_RELATIONAL_OPERATION, <IEffectErrorInfo>{
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

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeLogicalExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pNode.children[1].value;
    let pExpr: LogicalExprInstruction = new LogicalExprInstruction(pNode);
    let pLeftExpr: IExprInstruction;
    let pRightExpr: IExprInstruction;
    let pLeftType: IVariableTypeInstruction;
    let pRightType: IVariableTypeInstruction;
    let pBoolType: ITypeInstruction;

    pLeftExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    pBoolType = getSystemType('bool');

    if (!pLeftType.isEqual(pBoolType)) {
        _error(pContext, pLeftType.sourceNode, EEffectErrors.BAD_LOGICAL_OPERATION, {
            operator: sOperator,
            typeName: pLeftType.toString()
        });
        return null;
    }
    if (!pRightType.isEqual(pBoolType)) {
        _error(pContext, pRightType.sourceNode, EEffectErrors.BAD_LOGICAL_OPERATION, {
            operator: sOperator,
            typeName: pRightType.toString()
        });
        return null;
    }

    if (!pLeftType.readable) {
        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!pRightType.readable) {
        _error(pContext, pNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    pExpr.operator = (sOperator);
    pExpr.type = ((<SystemTypeInstruction>pBoolType).variableType);
    pExpr.push(pLeftExpr, true);
    pExpr.push(pRightExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeAssignmentExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let sOperator: string = pChildren[1].value;
    let pExpr: AssignmentExprInstruction = new AssignmentExprInstruction(pNode);
    let pLeftExpr: IExprInstruction;
    let pRightExpr: IExprInstruction;
    let pLeftType: IVariableTypeInstruction;
    let pRightType: IVariableTypeInstruction;
    let pExprType: IVariableTypeInstruction;

    pLeftExpr = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 1]);
    pRightExpr = analyzeExpr(pContext, pScope, pChildren[0]);

    pLeftType = <IVariableTypeInstruction>pLeftExpr.type;
    pRightType = <IVariableTypeInstruction>pRightExpr.type;

    if (sOperator !== '=') {
        pExprType = checkTwoOperandExprTypes(pContext, sOperator, pLeftType, pRightType);
        if (isNull(pExprType)) {
            _error(pContext, pNode, EEffectErrors.BAD_ARITHMETIC_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
                operator: sOperator,
                leftTypeName: pLeftType.hash,
                rightTypeName: pRightType.hash
            });
        }
    }
    else {
        pExprType = pRightType;
    }

    pExprType = checkTwoOperandExprTypes(pContext, '=', pLeftType, pExprType);

    if (isNull(pExprType)) {
        _error(pContext, pNode, EEffectErrors.BAD_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
            leftTypeName: pLeftType.hash,
            rightTypeName: pRightType.hash
        });
    }

    pExpr.operator = (sOperator);
    pExpr.type = (pExprType);
    pExpr.push(pLeftExpr, true);
    pExpr.push(pRightExpr, true);

    checkInstruction(pContext, pExpr, ECheckStage.CODE_TARGET_SUPPORT);

    return pExpr;
}


function analyzeIdExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let sName: string = pNode.value;
    let pVariable: IVariableDeclInstruction = getVariable(pScope, sName);

    if (isNull(pVariable)) {
        _error(pContext, pNode, EEffectErrors.UNKNOWN_VARNAME, { varName: sName });
        return null;
    }

    if (!isNull(pContext.currentFunction)) {
        if (!pVariable.pixel) {
            pContext.currentFunction.pixel = (false);
        }
        if (!pVariable.vertex) {
            pContext.currentFunction.vertex = (false);
        }
    }

    let pVarId: IdExprInstruction = new IdExprInstruction(pNode);
    pVarId.push(pVariable.nameID, false);

    checkInstruction(pContext, pVarId, ECheckStage.CODE_TARGET_SUPPORT);

    return pVarId;
}


function analyzeSimpleExpr(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IExprInstruction {

    let pInstruction: ILiteralInstruction = null;
    const sName: string = pNode.name;
    const sValue: string = pNode.value;

    switch (sName) {
        case 'T_UINT':
            pInstruction = new IntInstruction(pNode);
            pInstruction.value = ((<number><any>sValue) * 1);
            break;
        case 'T_FLOAT':
            pInstruction = new FloatInstruction(pNode);
            pInstruction.value = ((<number><any>sValue) * 1.0);
            break;
        case 'T_STRING':
            pInstruction = new StringInstruction(pNode);
            pInstruction.value = (sValue);
            break;
        case 'T_KW_TRUE':
            pInstruction = new BoolInstruction(pNode);
            pInstruction.value = (true);
            break;
        case 'T_KW_FALSE':
            pInstruction = new BoolInstruction(pNode);
            pInstruction.value = (false);
            break;
    }

    return pInstruction;
}



function analyzeConstTypeDim(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IVariableTypeInstruction {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length > 1) {
        _error(pContext, pNode, EEffectErrors.BAD_CAST_TYPE_USAGE);
        return null;
    }

    let pType: IVariableTypeInstruction;

    pType = <IVariableTypeInstruction>(analyzeType(pContext, pScope, pChildren[0]));

    if (!pType.isBase()) {
        _error(pContext, pNode, EEffectErrors.BAD_CAST_TYPE_NOT_BASE, { typeName: pType.toString() });
    }

    checkInstruction(pContext, pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}


function analyzeVarStructDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pInstruction: IInstruction = null): void {

    const pChildren: IParseNode[] = pNode.children;
    let pUsageType: IVariableTypeInstruction = null;
    let pVariable: IVariableDeclInstruction = null;
    let i: number = 0;

    pUsageType = analyzeUsageStructDecl(pContext, pScope, pChildren[pChildren.length - 1]);

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'Variable') {
            pVariable = analyzeVariable(pContext, pScope, pChildren[i], pUsageType);

            if (!isNull(pInstruction)) {
                pInstruction.push(pVariable, true);
            }
        }
    }
}


function analyzeUsageStructDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IVariableTypeInstruction {

    let pChildren: IParseNode[] = pNode.children;
    let i: number = 0;
    let pType: IVariableTypeInstruction = new VariableTypeInstruction(pNode);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'StructDecl') {
            const pMainType: ITypeInstruction = analyzeStructDecl(pContext, pScope, pChildren[i]);
            pType.pushType(pMainType);

            const pTypeDecl: ITypeDeclInstruction = new TypeDeclInstruction(null);
            pTypeDecl.push(pMainType, true);

            addTypeDecl(pContext, pScope, pTypeDecl);
        }
        else if (pChildren[i].name === 'Usage') {
            const sUsage: string = analyzeUsage(pChildren[i]);
            pType.addUsage(sUsage);
        }
    }

    checkInstruction(pContext, pType, ECheckStage.CODE_TARGET_SUPPORT);
    return pType;
}


function analyzeStruct(pContext: Context, pScope: ProgramScope, pNode: IParseNode): ITypeInstruction {
    const pChildren: IParseNode[] = pNode.children;

    const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction(pNode);
    const pFieldCollector: IInstruction = new InstructionCollector();

    pScope.pushScope(EScopeType.k_Struct);

    let i: number = 0;
    for (i = pChildren.length - 4; i >= 1; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(pContext, pScope, pChildren[i], pFieldCollector);
        }
    }

    pScope.popScope();
    pStruct.addFields(pFieldCollector, true);

    checkInstruction(pContext, pStruct, ECheckStage.CODE_TARGET_SUPPORT);
    return pStruct;
}


function analyzeFunctionDeclOnlyDefinition(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IFunctionDeclInstruction {

    const pChildren: IParseNode[] = pNode.children;
    let pFunction: FunctionDeclInstruction = null;
    let pFunctionDef: FunctionDefInstruction = null;
    // let pStmtBlock: StmtBlockInstruction = null;
    let pAnnotation: IAnnotationInstruction = null;
    const sLastNodeValue: string = pChildren[0].value;
    let bNeedAddFunction: boolean = false;

    pFunctionDef = analyzeFunctionDef(pContext, pScope, pChildren[pChildren.length - 1]);

    pFunction = <FunctionDeclInstruction>findFunctionByDef(pScope, pFunctionDef);

    if (!isDef(pFunction)) {
        _error(pContext, pNode, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: pFunction.nameID.toString() });
        return null;
    }

    if (!isNull(pFunction) && pFunction.implementation) {
        _error(pContext, pNode, EEffectErrors.BAD_REDEFINE_FUNCTION, { funcName: pFunction.nameID.toString() });
        return null;
    }

    if (isNull(pFunction)) {
        pFunction = new FunctionDeclInstruction(null);
        bNeedAddFunction = true;
    }
    else {
        if (!pFunction.returnType.isEqual(pFunctionDef.returnType)) {
            _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_DEF_RETURN_TYPE, { funcName: pFunction.nameID.toString() });
            return null;
        }

        bNeedAddFunction = false;
    }

    pFunction.definition = (<IDeclInstruction>pFunctionDef);

    pScope.restoreScope();

    if (pChildren.length === 3) {
        pAnnotation = analyzeAnnotation(pChildren[1]);
        pFunction.annotation = (pAnnotation);
    }

    if (sLastNodeValue !== ';') {
        pFunction.implementationScope = (pScope.current);
        pContext.functionWithImplementationList.push(pFunction);
    }

    pScope.popScope();

    if (bNeedAddFunction) {
        addFunctionDecl(pContext, pScope, pNode, pFunction);
    }

    return pFunction;
}


function resumeFunctionAnalysis(pContext: Context, pScope: ProgramScope, pAnalzedFunction: IFunctionDeclInstruction): void {
    const pFunction: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
    const pNode: IParseNode = pFunction.sourceNode;

    pScope.current = (pFunction.implementationScope);

    const pChildren: IParseNode[] = pNode.children;
    let pStmtBlock: StmtBlockInstruction = null;

    pContext.setCurrentAnalyzedFunction(pFunction);

    pStmtBlock = <StmtBlockInstruction>analyzeStmtBlock(pContext, pScope, pChildren[0]);
    pFunction.implementation = (<IStmtInstruction>pStmtBlock);

    if (!pFunction.returnType.isEqual(getSystemType('void')) && !pContext.haveCurrentFunctionReturnOccur) {
        _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_DONT_HAVE_RETURN_STMT, { funcName: pFunction.nameID.toString() })
    }

    pContext.setCurrentAnalyzedFunction(null);

    pScope.popScope();

    checkInstruction(pContext, pFunction, ECheckStage.CODE_TARGET_SUPPORT);
}


function analyzeFunctionDef(pContext: Context, pScope: ProgramScope, pNode: IParseNode): FunctionDefInstruction {
    const pChildren: IParseNode[] = pNode.children;
    const pFunctionDef: FunctionDefInstruction = new FunctionDefInstruction(pNode);
    let pReturnType: IVariableTypeInstruction = null;
    let pFuncName: IIdInstruction = null;
    const pNameNode = pChildren[pChildren.length - 2];
    const sFuncName: string = pNameNode.value;

    const pRetTypeNode = pChildren[pChildren.length - 1];
    pReturnType = analyzeUsageType(pContext, pScope, pRetTypeNode);

    if (pReturnType.isContainSampler()) {
        _error(pContext, pRetTypeNode, EEffectErrors.BAD_RETURN_TYPE_FOR_FUNCTION, { funcName: sFuncName });
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

    pScope.pushScope(EScopeType.k_Default);

    analyzeParamList(pContext, pScope, pChildren[pChildren.length - 3], pFunctionDef);

    pScope.popScope();

    checkInstruction(pContext, pFunctionDef, ECheckStage.CODE_TARGET_SUPPORT);

    return pFunctionDef;
}


function analyzeParamList(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pFunctionDef: FunctionDefInstruction): void {

    const pChildren: IParseNode[] = pNode.children;
    let pParameter: IVariableDeclInstruction;

    let i: number = 0;

    for (i = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'ParameterDecl') {
            pParameter = analyzeParameterDecl(pContext, pScope, pChildren[i]);
            pParameter.scope = (pScope.current);
            pFunctionDef.addParameter(pParameter, pScope.isStrictMode());
        }
    }
}


function analyzeParameterDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IVariableDeclInstruction {

    const pChildren: IParseNode[] = pNode.children;
    let pType: IVariableTypeInstruction = null;
    let pParameter: IVariableDeclInstruction = null;

    pType = analyzeParamUsageType(pContext, pScope, pChildren[1]);
    pParameter = analyzeVariable(pContext, pScope, pChildren[0], pType);

    return pParameter;
}


function analyzeParamUsageType(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IVariableTypeInstruction {
    const pChildren: IParseNode[] = pNode.children;
    let i: number = 0;
    const pType: IVariableTypeInstruction = new VariableTypeInstruction(pNode);

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'Type') {
            const pMainType: ITypeInstruction = analyzeType(pContext, pScope, pChildren[i]);
            pType.pushType(pMainType);
        }
        else if (pChildren[i].name === 'ParamUsage') {
            const sUsage: string = analyzeUsage(pChildren[i]);
            pType.addUsage(sUsage);
        }
    }

    checkInstruction(pContext, pType, ECheckStage.CODE_TARGET_SUPPORT);

    return pType;
}


function analyzeStmtBlock(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pStmtBlock: StmtBlockInstruction = new StmtBlockInstruction(pNode);
    let pStmt: IStmtInstruction;
    let i: number = 0;

    pStmtBlock.scope = (pScope.current);

    pScope.pushScope(EScopeType.k_Default);

    for (i = pChildren.length - 2; i > 0; i--) {
        pStmt = analyzeStmt(pContext, pScope, pChildren[i]);
        if (!isNull(pStmt)) {
            pStmtBlock.push(pStmt);
        }
    }

    pScope.popScope();

    checkInstruction(pContext, pStmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

    return pStmtBlock;
}


function analyzeStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(pContext, pScope, pChildren[0]);
        case 'UseDecl':
            analyzeUseDecl(pContext, pScope, pChildren[0]);
            return null;
        case 'T_KW_WHILE':
            return analyzeWhileStmt(pContext, pScope, pNode);
        case 'T_KW_FOR':
            return analyzeForStmt(pContext, pScope, pNode);
        case 'T_KW_IF':
            return analyzeIfStmt(pContext, pScope, pNode);
    }
    return null;
}


function analyzeSimpleStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'T_KW_RETURN':
            return analyzeReturnStmt(pContext, pScope, pNode);

        case 'T_KW_DO':
            return analyzeWhileStmt(pContext, pScope, pNode);

        case 'StmtBlock':
            return analyzeStmtBlock(pContext, pScope, pChildren[0]);

        case 'T_KW_DISCARD':
        case 'T_KW_BREAK':
        case 'T_KW_CONTINUE':
            return analyzeBreakStmt(pContext, pScope, pNode);

        case 'TypeDecl':
        case 'VariableDecl':
        case 'VarStructDecl':
            return analyzeDeclStmt(pContext, pScope, pChildren[0]);

        default:
            if (pChildren.length === 2) {
                return analyzeExprStmt(pContext, pScope, pNode);
            }
            else {
                return new SemicolonStmtInstruction(pNode);
            }
    }
}


function analyzeReturnStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pReturnStmtInstruction: ReturnStmtInstruction = new ReturnStmtInstruction(pNode);

    const pFunctionReturnType: IVariableTypeInstruction = pContext.currentFunction.returnType;

    pContext.haveCurrentFunctionReturnOccur = true;

    if (pFunctionReturnType.isEqual(getSystemType('void')) && pChildren.length === 3) {
        _error(pContext, pNode, EEffectErrors.BAD_RETURN_STMT_VOID);
        return null;
    }
    else if (!pFunctionReturnType.isEqual(getSystemType('void')) && pChildren.length === 2) {
        _error(pContext, pNode, EEffectErrors.BAD_RETURN_STMT_EMPTY);
        return null;
    }

    if (pChildren.length === 3) {
        const pExprInstruction: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[1]);
        const pOutVar: IVariableDeclInstruction = pContext.currentFunction.getOutVariable();

        if (!isNull(pOutVar) && pOutVar.type !== pExprInstruction.type) {
            _error(pContext, pNode, EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
            return null;
        }

        if (!pFunctionReturnType.isEqual(pExprInstruction.type)) {
            _error(pContext, pNode, EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
            return null;
        }
        pReturnStmtInstruction.push(pExprInstruction, true);
    }

    checkInstruction(pContext, pReturnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pReturnStmtInstruction;
}


function analyzeBreakStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pBreakStmtInstruction: BreakStmtInstruction = new BreakStmtInstruction(pNode);
    const sOperatorName: string = pChildren[1].value;

    pBreakStmtInstruction.operator = (sOperatorName);

    if (sOperatorName === 'discard' && !isNull(pContext.currentFunction)) {
        pContext.currentFunction.vertex = (false);
    }

    checkInstruction(pContext, pBreakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pBreakStmtInstruction;
}


function analyzeDeclStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    // let pChildren: IParseNode[] = pNode.children;
    const sNodeName: string = pNode.name;
    const pDeclStmtInstruction: DeclStmtInstruction = new DeclStmtInstruction(pNode);

    switch (sNodeName) {
        case 'TypeDecl':
            analyzeTypeDecl(pContext, pScope, pNode, pDeclStmtInstruction);
            break;
        case 'VariableDecl':
            analyzeVariableDecl(pContext, pScope, pNode, pDeclStmtInstruction);
            break;
        case 'VarStructDecl':
            analyzeVarStructDecl(pContext, pScope, pNode, pDeclStmtInstruction);
            break;
    }

    checkInstruction(pContext, pDeclStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pDeclStmtInstruction;
}


function analyzeExprStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const pExprStmtInstruction: ExprStmtInstruction = new ExprStmtInstruction(pNode);
    const pExprInstruction: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[1]);

    pExprStmtInstruction.push(pExprInstruction, true);

    checkInstruction(pContext, pExprStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pExprStmtInstruction;
}


function analyzeWhileStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const isDoWhile: boolean = (pChildren[pChildren.length - 1].value === 'do');
    const isNonIfStmt: boolean = (pNode.name === 'NonIfStmt') ? true : false;

    const pWhileStmt: WhileStmtInstruction = new WhileStmtInstruction(pNode);
    let pCondition: IExprInstruction = null;
    let pConditionType: IVariableTypeInstruction = null;
    const pBoolType: ITypeInstruction = getSystemType('bool');
    let pStmt: IStmtInstruction = null;

    if (isDoWhile) {
        pWhileStmt.operator = ('do_while');
        pCondition = analyzeExpr(pContext, pScope, pChildren[2]);
        pConditionType = <IVariableTypeInstruction>pCondition.type;

        if (!pConditionType.isEqual(pBoolType)) {
            _error(pContext, pNode, EEffectErrors.BAD_DO_WHILE_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        pStmt = analyzeStmt(pContext, pScope, pChildren[0]);
    }
    else {
        pWhileStmt.operator = ('while');
        pCondition = analyzeExpr(pContext, pScope, pChildren[2]);
        pConditionType = <IVariableTypeInstruction>pCondition.type;

        if (!pConditionType.isEqual(pBoolType)) {
            _error(pContext, pNode, EEffectErrors.BAD_WHILE_CONDITION, { typeName: pConditionType.toString() });
            return null;
        }

        if (isNonIfStmt) {
            pStmt = analyzeNonIfStmt(pContext, pScope, pChildren[0]);
        }
        else {
            pStmt = analyzeStmt(pContext, pScope, pChildren[0]);
        }

        pWhileStmt.push(pCondition, true);
        pWhileStmt.push(pStmt, true);
    }

    checkInstruction(pContext, pWhileStmt, ECheckStage.CODE_TARGET_SUPPORT);

    return pWhileStmt;
}


function analyzeIfStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const isIfElse: boolean = (pChildren.length === 7);

    const pIfStmtInstruction: IfStmtInstruction = new IfStmtInstruction(pNode);
    const pCondition: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 3]);
    const pConditionType: IVariableTypeInstruction = <IVariableTypeInstruction>pCondition.type;
    const pBoolType: ITypeInstruction = getSystemType('bool');

    let pIfStmt: IStmtInstruction = null;
    let pElseStmt: IStmtInstruction = null;

    if (!pConditionType.isEqual(pBoolType)) {
        _error(pContext, pNode, EEffectErrors.BAD_IF_CONDITION, { typeName: pConditionType.toString() });
        return null;
    }

    pIfStmtInstruction.push(pCondition, true);

    if (isIfElse) {
        pIfStmtInstruction.operator = ('if_else');
        pIfStmt = analyzeNonIfStmt(pContext, pScope, pChildren[2]);
        pElseStmt = analyzeStmt(pContext, pScope, pChildren[0]);

        pIfStmtInstruction.push(pIfStmt, true);
        pIfStmtInstruction.push(pElseStmt, true);
    }
    else {
        pIfStmtInstruction.operator = ('if');
        pIfStmt = analyzeNonIfStmt(pContext, pScope, pChildren[0]);

        pIfStmtInstruction.push(pIfStmt, true);
    }

    checkInstruction(pContext, pIfStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pIfStmtInstruction;
}


function analyzeNonIfStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'SimpleStmt':
            return analyzeSimpleStmt(pContext, pScope, pChildren[0]);
        case 'T_KW_WHILE':
            return analyzeWhileStmt(pContext, pScope, pNode);
        case 'T_KW_FOR':
            return analyzeForStmt(pContext, pScope, pNode);
    }
    return null;
}


function analyzeForStmt(pContext: Context, pScope: ProgramScope, pNode: IParseNode): IStmtInstruction {

    const pChildren: IParseNode[] = pNode.children;
    const isNonIfStmt: boolean = (pNode.name === 'NonIfStmt');
    const pForStmtInstruction: ForStmtInstruction = new ForStmtInstruction(pNode);
    let pStmt: IStmtInstruction = null;

    pScope.pushScope();

    analyzeForInit(pContext, pScope, pChildren[pChildren.length - 3], pForStmtInstruction);
    analyzeForCond(pContext, pScope, pChildren[pChildren.length - 4], pForStmtInstruction);

    if (pChildren.length === 7) {
        analyzeForStep(pContext, pScope, pChildren[2], pForStmtInstruction);
    }
    else {
        pForStmtInstruction.push(null);
    }


    if (isNonIfStmt) {
        pStmt = analyzeNonIfStmt(pContext, pScope, pChildren[0]);
    }
    else {
        pStmt = analyzeStmt(pContext, pScope, pChildren[0]);
    }

    pForStmtInstruction.push(pStmt, true);

    pScope.popScope();

    checkInstruction(pContext, pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

    return pForStmtInstruction;
}


function analyzeForInit(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = pNode.children;
    const sFirstNodeName: string = pChildren[pChildren.length - 1].name;

    switch (sFirstNodeName) {
        case 'VariableDecl':
            analyzeVariableDecl(pContext, pScope, pChildren[0], pForStmtInstruction);
            break;
        case 'Expr':
            const pExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[0]);
            pForStmtInstruction.push(pExpr, true);
            break;
        default:
            // ForInit : ';'
            pForStmtInstruction.push(null);
            break;
    }

    return;
}


function analyzeForCond(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 1) {
        pForStmtInstruction.push(null);
        return;
    }

    const pConditionExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[1]);

    pForStmtInstruction.push(pConditionExpr, true);
    return;
}


function analyzeForStep(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

    const pChildren: IParseNode[] = pNode.children;
    const pStepExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[0]);

    pForStmtInstruction.push(pStepExpr, true);

    return;
}




function analyzeTechniqueForImport(pContext: Context, pScope: ProgramScope, pNode: IParseNode): void {

    const pChildren: IParseNode[] = pNode.children;
    const pTechnique: ITechniqueInstruction = new TechniqueInstruction(pNode);
    const sTechniqueName: string = analyzeComplexName(pChildren[pChildren.length - 2]);
    const isComplexName: boolean = pChildren[pChildren.length - 2].children.length !== 1;

    pTechnique.name = (sTechniqueName);
    pTechnique.complexName = isComplexName;

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
            analyzeTechniqueBodyForImports(pContext, pScope, pChildren[i], pTechnique);
        }
    }

    addTechnique(pContext, pScope, pTechnique);
}



function analyzeTechniqueBodyForImports(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pTechnique: ITechniqueInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassDeclForImports(pContext, pScope, pChildren[i], pTechnique);
    }
}


function analyzePassDeclForImports(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pTechnique: ITechniqueInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren[0].name === 'ImportDecl') {
        analyzeImportDecl(pContext, pChildren[0], pTechnique);
    }
    else if (pChildren.length > 1) {
        const pPass: IPassInstruction = new PassInstruction(pNode);
        //TODO: add annotation and id
        analyzePassStateBlockForShaders(pContext, pScope, pChildren[0], pPass);

        pTechnique.addPass(pPass);
    }
}


function analyzePassStateBlockForShaders(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassStateForShader(pContext, pScope, pChildren[i], pPass);
    }
}


function analyzePassStateForShader(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 1) {
        pPass.complexPass = (true);

        if (pChildren[0].name === 'StateIf') {
            analyzePassStateIfForShader(pContext, pScope, pChildren[0], pPass);
        }
        else if (pChildren[0].name === 'StateSwitch') {
            analyzePassStateSwitchForShader(pContext, pScope, pChildren[0], pPass);
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
        console.error('unknown shader type');
        return;
    }

    pContext.markPassNodeAsAnalyzed(pNode);

    const pStateExprNode: IParseNode = pChildren[pChildren.length - 3];
    const pExprNode: IParseNode = pStateExprNode.children[pStateExprNode.children.length - 1];
    const pCompileExpr: CompileExprInstruction = <CompileExprInstruction>analyzeExpr(pContext, pScope, pExprNode);
    const pShaderFunc: IFunctionDeclInstruction = pCompileExpr.function;

    if (eShaderType === EFunctionType.k_Vertex) {
        if (!pShaderFunc.checkDefenitionForVertexUsage()) {
            _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_VERTEX_DEFENITION, { funcDef: pShaderFunc.stringDef });
        }
    }
    else {
        if (!pShaderFunc.checkDefenitionForPixelUsage()) {
            _error(pContext, pNode, EEffectErrors.BAD_FUNCTION_PIXEL_DEFENITION, { funcDef: pShaderFunc.stringDef });
        }
    }

    pShaderFunc.markUsedAs(eShaderType);

    pPass.addFoundFunction(pNode, pShaderFunc, eShaderType);
}


function analyzePassStateIfForShader(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 5) {
        analyzePassStateBlockForShaders(pContext, pScope, pChildren[0], pPass);
    }
    else if (pChildren.length === 7 && pChildren[0].name === 'PassStateBlock') {
        analyzePassStateBlockForShaders(pContext, pScope, pChildren[2], pPass);
        analyzePassStateBlockForShaders(pContext, pScope, pChildren[0], pPass);
    }
    else {
        analyzePassStateBlockForShaders(pContext, pScope, pChildren[2], pPass);
        analyzePassStateIfForShader(pContext, pScope, pChildren[0], pPass);
    }
}


function analyzePassStateSwitchForShader(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    analyzePassCaseBlockForShader(pContext, pScope, pChildren[0], pPass);
}


function analyzePassCaseBlockForShader(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'CaseState') {
            analyzePassCaseStateForShader(pContext, pScope, pChildren[i], pPass);
        }
        else if (pChildren[i].name === 'DefaultState') {
            analyzePassDefaultStateForShader(pContext, pScope, pChildren[i], pPass);
        }
    }
}


function analyzePassCaseStateForShader(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 4; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pContext, pScope, pChildren[i], pPass);
        }
    }
}


function analyzePassDefaultStateForShader(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    for (let i: number = pChildren.length - 3; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pContext, pScope, pChildren[i], pPass);
        }
    }
}


function resumeTechniqueAnalysis(pContext: Context, pScope: ProgramScope, pTechnique: ITechniqueInstruction): void {
    const pPassList: IPassInstruction[] = pTechnique.passList;

    for (let i: number = 0; i < pPassList.length; i++) {
        resumePassAnalysis(pContext, pScope, pPassList[i]);
    }
}


function resumePassAnalysis(pContext: Context, pScope: ProgramScope, pPass: IPassInstruction): void {
    const pNode: IParseNode = pPass.sourceNode;


    const pChildren: IParseNode[] = pNode.children;

    pContext.currentPass = (pPass);
    pContext.isAnalyzeInPass = (true);
    analyzePassStateBlock(pContext, pScope, pChildren[0], pPass);
    pContext.isAnalyzeInPass = (false);
    pContext.currentPass = (null);

    pPass.finalizePass();
}


function analyzePassStateBlock(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    pPass.addCodeFragment('{');

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        analyzePassState(pContext, pScope, pChildren[i], pPass);
    }

    pPass.addCodeFragment('}');
}


function analyzePassState(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {

    const pChildren: IParseNode[] = pNode.children;

    if (pChildren.length === 1) {
        if (pChildren[0].name === 'StateIf') {
            analyzePassStateIf(pContext, pScope, pChildren[0], pPass);
        }
        else if (pChildren[0].name === 'StateSwitch') {
            analyzePassStateSwitch(pContext, pScope, pChildren[0], pPass);
        }

        return;
    }

    if (pContext.isPassNodeAnalyzed(pNode)) {
        const pFunc: IFunctionDeclInstruction = pPass.getFoundedFunction(pNode);
        const eShaderType: EFunctionType = pPass.getFoundedFunctionType(pNode);
        let pShader: IFunctionDeclInstruction = null;

        if (eShaderType === EFunctionType.k_Vertex) {
            pShader = pFunc.vertexShader;
        }
        else {
            pShader = pFunc.pixelShader;
        }

        pPass.addShader(pShader);
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


function analyzePassStateIf(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    const pIfExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 3]);
    pIfExpr.prepareFor(EFunctionType.k_PassFunction);

    pPass.addCodeFragment('if(' + pIfExpr.toCode() + ')');

    analyzePassStateBlock(pContext, pScope, pChildren[pChildren.length - 5], pPass);

    if (pChildren.length > 5) {
        pPass.addCodeFragment('else');

        if (pChildren[0].name === 'PassStateBlock') {
            analyzePassStateBlock(pContext, pScope, pChildren[0], pPass);
        }
        else {
            pPass.addCodeFragment(' ');
            analyzePassStateIf(pContext, pScope, pChildren[0], pPass);
        }
    }
}


function analyzePassStateSwitch(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    // let sCodeFragment: string = "switch";
    const pSwitchExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 3]);
    pSwitchExpr.prepareFor(EFunctionType.k_PassFunction);

    pPass.addCodeFragment('(' + pSwitchExpr.toCode() + ')');

    analyzePassCaseBlock(pContext, pScope, pChildren[0], pPass);
}


function analyzePassCaseBlock(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    pPass.addCodeFragment('{');

    for (let i: number = pChildren.length - 2; i >= 1; i--) {
        if (pChildren[i].name === 'CaseState') {
            analyzePassCaseState(pContext, pScope, pChildren[i], pPass);
        }
        else if (pChildren[i].name === 'DefaultState') {
            analyzePassDefault(pContext, pScope, pChildren[i], pPass);
        }
    }

    pPass.addCodeFragment('}');
}


function analyzePassCaseState(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    const pCaseStateExpr: IExprInstruction = analyzeExpr(pContext, pScope, pChildren[pChildren.length - 2]);
    pCaseStateExpr.prepareFor(EFunctionType.k_PassFunction);

    pPass.addCodeFragment('case ' + pCaseStateExpr.toCode() + ': ');

    for (let i: number = pChildren.length - 4; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pContext, pScope, pChildren[i], pPass);
        }
        else {
            pPass.addCodeFragment(pChildren[i].value);
        }
    }
}


function analyzePassDefault(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pPass: IPassInstruction): void {
    const pChildren: IParseNode[] = pNode.children;

    pPass.addCodeFragment('default: ');

    for (let i: number = pChildren.length - 3; i >= 0; i--) {
        if (pChildren[i].name === 'PassState') {
            analyzePassStateForShader(pContext, pScope, pChildren[i], pPass);
        }
        else {
            pPass.addCodeFragment(pChildren[i].value);
        }
    }
}


function analyzeImportDecl(pContext: Context, pNode: IParseNode, pTechnique: ITechniqueInstruction = null): void {
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
        // let pTechniqueFromSameEffect: ITechniqueInstruction = _pTechniqueMap[sComponentName] || _pTechniqueMap[sShortedComponentName];
        // if (isDefAndNotNull(pTechniqueFromSameEffect)) {
        //     pTechnique._addTechniqueFromSameEffect(pTechniqueFromSameEffect, iShift);
        //     return;
        // }
    }

    const pSourceTechnique: ITechniqueInstruction = fx.techniques[sComponentName];
    if (!pSourceTechnique) {
        _error(pContext, pNode, EEffectErrors.BAD_IMPORTED_COMPONENT_NOT_EXIST, { componentName: sComponentName });
        return;
    }

    throw null;
}


function analyzeStructDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode): ITypeInstruction {
    const pChildren: IParseNode[] = pNode.children;

    const pStruct: ComplexTypeInstruction = new ComplexTypeInstruction(pNode);
    const pFieldCollector: IInstruction = new InstructionCollector();

    const sName: string = pChildren[pChildren.length - 2].value;

    pStruct.name = sName;

    pScope.pushScope(EScopeType.k_Struct);

    let i: number = 0;
    for (i = pChildren.length - 4; i >= 1; i--) {
        if (pChildren[i].name === 'VariableDecl') {
            analyzeVariableDecl(pContext, pScope, pChildren[i], pFieldCollector);
        }
    }

    pScope.popScope();

    pStruct.addFields(pFieldCollector, true);

    checkInstruction(pContext, pStruct, ECheckStage.CODE_TARGET_SUPPORT);
    return pStruct;
}


function analyzeTypeDecl(pContext: Context, pScope: ProgramScope, pNode: IParseNode, pParentInstruction: IInstruction = null): ITypeDeclInstruction {
    let pChildren: IParseNode[] = pNode.children;

    let pTypeDeclInstruction: ITypeDeclInstruction = new TypeDeclInstruction(pNode);

    if (pChildren.length === 2) {
        const pStructInstruction: ComplexTypeInstruction = <ComplexTypeInstruction>analyzeStructDecl(pContext, pScope, pChildren[1]);
        pTypeDeclInstruction.push(pStructInstruction, true);
    }
    else {
        _error(pContext, pNode, EEffectErrors.UNSUPPORTED_TYPEDECL);
    }

    checkInstruction(pContext, pTypeDeclInstruction, ECheckStage.CODE_TARGET_SUPPORT);
    addTypeDecl(pContext, pScope, pTypeDeclInstruction);

    if (!isNull(pParentInstruction)) {
        pParentInstruction.push(pTypeDeclInstruction, true);
    }

    return pTypeDeclInstruction;
}


function analyzeGlobalTypeDecls(pContext: Context, pScope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'TypeDecl') {
            analyzeTypeDecl(pContext, pScope, pChildren[i]);
        }
    }
}


function analyzeFunctionDefinitions(pContext: Context, pScope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'FunctionDecl') {
            analyzeFunctionDeclOnlyDefinition(pContext, pScope, pChildren[i]);
        }
    }
}


function analyzeGlobalImports(pContext: Context, pScope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'ImportDecl') {
            analyzeImportDecl(pContext, pChildren[i], null);
        }
    }
}


function analyzeTechniqueImports(pContext: Context, pScope: ProgramScope, pParseTree: IParseTree): void {
    let pChildren: IParseNode[] = pParseTree.getRoot().children;
    let i: number = 0;

    for (i = pChildren.length - 1; i >= 0; i--) {
        if (pChildren[i].name === 'TechniqueDecl') {
            analyzeTechniqueForImport(pContext, pScope, pChildren[i]);
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
            analyzeVarStructDecl(pContext, pScope, pChildren[i]);
        }
    }
}


function analyzeFunctionDecls(pContext: Context, pScope: ProgramScope): void {
    for (let i: number = 0; i < pContext.functionWithImplementationList.length; i++) {
        resumeFunctionAnalysis(pContext, pScope, pContext.functionWithImplementationList[i]);
    }

    checkFunctionsForRecursion(pContext);
    checkFunctionForCorrectUsage(pContext);
    generateInfoAboutUsedData(pContext);
    generateShadersFromFunctions(pContext);
}


function analyzeTechniques(pContext: Context, pScope: ProgramScope): void {
    for (let i: number = 0; i < pContext.techniqueList.length; i++) {
        resumeTechniqueAnalysis(pContext, pScope, pContext.techniqueList[i]);
    }
}



initSystemTypes();
initSystemFunctions();
initSystemVariables();

// TODO: refactor context data!
class Context {
    public currentFunction: IFunctionDeclInstruction | null = null;
    public currentPass: IPassInstruction | null = null;
    public haveCurrentFunctionReturnOccur: boolean = false;
    public analyzedFileName: string | null = null;
    public isAnalyzeInPass: boolean = false;
    public pointerForExtractionList: IVariableDeclInstruction[] | null = null;
    public functionWithImplementationList: IFunctionDeclInstruction[] = [];
    public techniqueList: ITechniqueInstruction[] = [];
    public techniqueMap: IMap<ITechniqueInstruction> = {};
    public provideNameSpace: string | null = null;

    private analyzedPassNodes: IParseNode[] = [];

    constructor(filename: string) {
        this.analyzedFileName = filename;
    }

    setCurrentAnalyzedFunction(pFunction: IFunctionDeclInstruction): void {
        this.currentFunction = pFunction;
        this.haveCurrentFunctionReturnOccur = false;
    }

    isPassNodeAnalyzed(pNode: IParseNode): boolean {
        return this.analyzedPassNodes.indexOf(pNode) != -1;
    }

    markPassNodeAsAnalyzed(pNode: IParseNode): void {
        console.assert(this.isPassNodeAnalyzed(pNode) === false);
        this.analyzedPassNodes.push(pNode);
    }
}


function analyze(sAnalyzedFileName: string, pTree: IParseTree): boolean {
    const pContext: Context = new Context(sAnalyzedFileName);

    const pScope: ProgramScope = new ProgramScope();

    let iParseTime: number = time();

    try {
        pScope.pushScope();

        analyzeGlobalUseDecls(pContext, pScope, pTree);
        analyzeGlobalProvideDecls(pContext, pScope, pTree);
        analyzeGlobalTypeDecls(pContext, pScope, pTree);
        analyzeFunctionDefinitions(pContext, pScope, pTree);
        analyzeGlobalImports(pContext, pScope, pTree);
        analyzeTechniqueImports(pContext, pScope, pTree);
        analyzeVariableDecls(pContext, pScope, pTree);
        analyzeFunctionDecls(pContext, pScope);
        analyzeTechniques(pContext, pScope);

        pScope.popScope();
    }
    catch (e) {
        throw e;
    }

    console.log('analyze time: ', time() - iParseTime);

    return true;
}


