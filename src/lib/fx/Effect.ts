import { EScopeType } from '../idl/IScope'
import { IPosition } from "./../idl/parser/IParser";
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
import { VariableDeclInstruction } from './instructions/VariableDeclInstruction';
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
import { FunctionDeclInstruction } from './instructions/FunctionDeclInstruction';
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
import { TypeDeclInstruction } from './instructions/TypeDeclInstruction'
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
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';


const assert = console.assert.bind(console);

const TEMPLATE_TYPE = 'template';


function resolveNodeSourceLocation(node: IParseNode): IPosition | null {
    if (!isDefAndNotNull(node)) {
        return null;
    }

    if (isDef(node.loc)) {
        return { line: node.loc.start.line, column: node.loc.start.column };
    }

    return resolveNodeSourceLocation(node.children[node.children.length - 1]);
}


const systemTypes: IMap<SystemTypeInstruction> = {};
const systemFunctionsMap: IMap<SystemFunctionInstruction[]> = {};
const systemVariables: IMap<IVariableDeclInstruction> = {};
const systemFunctionHashMap: IMap<boolean> = {};


function generateSystemType(name: string, elementType: ITypeInstruction = null, length: number = 1, fields: IVariableDeclInstruction[] = []): SystemTypeInstruction {

    if (getSystemType(name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    let systemType: SystemTypeInstruction = new SystemTypeInstruction({ name, elementType, length, fields });
    systemTypes[name] = systemType;

    return systemType;
}



function addFieldsToVectorFromSuffixObject(fields: IVariableDeclInstruction[], suffixMap: IMap<boolean>, baseType: string) {
    for (let suffix in suffixMap) {
        let fieldTypeName = baseType + ((suffix.length > 1) ? suffix.length.toString() : '');
        let fieldBaseType = getSystemType(fieldTypeName);

        assert(fieldBaseType);

        let fieldId = new IdInstruction({ name: suffix });
        let fieldType = new VariableTypeInstruction({ type: fieldBaseType, writable: suffixMap[suffix] })

        fields.push(new VariableDeclInstruction({ id: fieldId, type: fieldType }));
    }
}


function addSystemTypeScalar(): void {
    generateSystemType('void');
    generateSystemType('int');
    generateSystemType('bool');
    generateSystemType('float');
    generateSystemType('string');
    generateSystemType('texture');
    generateSystemType('sampler');
    generateSystemType('sampler2D');
    generateSystemType('samplerCUBE');
}


function addSystemTypeVector(): void {
    let XYSuffix: IMap<boolean> = <IMap<boolean>>{};
    let XYZSuffix: IMap<boolean> = <IMap<boolean>>{};
    let XYZWSuffix: IMap<boolean> = <IMap<boolean>>{};

    let RGSuffix: IMap<boolean> = <IMap<boolean>>{};
    let RGBSuffix: IMap<boolean> = <IMap<boolean>>{};
    let RGBASuffix: IMap<boolean> = <IMap<boolean>>{};

    let STSuffix: IMap<boolean> = <IMap<boolean>>{};
    let STPSuffix: IMap<boolean> = <IMap<boolean>>{};
    let STPQSuffix: IMap<boolean> = <IMap<boolean>>{};

    generateSuffixLiterals(['x', 'y'], XYSuffix);
    generateSuffixLiterals(['x', 'y', 'z'], XYZSuffix);
    generateSuffixLiterals(['x', 'y', 'z', 'w'], XYZWSuffix);

    generateSuffixLiterals(['r', 'g'], RGSuffix);
    generateSuffixLiterals(['r', 'g', 'b'], RGBSuffix);
    generateSuffixLiterals(['r', 'g', 'b', 'a'], RGBASuffix);

    generateSuffixLiterals(['s', 't'], STSuffix);
    generateSuffixLiterals(['s', 't', 'p'], STPSuffix);
    generateSuffixLiterals(['s', 't', 'p', 'q'], STPQSuffix);


    let float = getSystemType('float');
    let int = getSystemType('int');
    let bool = getSystemType('bool');

    let float2 = generateSystemType('float2', float, 2);
    let float3 = generateSystemType('float3', float, 3);
    let float4 = generateSystemType('float4', float, 4);

    let int2 = generateSystemType('int2', int, 2);
    let int3 = generateSystemType('int3', int, 3);
    let int4 = generateSystemType('int4', int, 4);

    let bool2 = generateSystemType('bool2', bool, 2);
    let bool3 = generateSystemType('bool3', bool, 3);
    let bool4 = generateSystemType('bool4', bool, 4);

    {
        let suf2f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2f, XYSuffix, 'float');
        addFieldsToVectorFromSuffixObject(suf2f, RGSuffix, 'float');
        addFieldsToVectorFromSuffixObject(suf2f, STSuffix, 'float');
        suf2f.forEach(field => float2.addField(field));
    }

    {
        let suf3f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3f, XYZSuffix, 'float');
        addFieldsToVectorFromSuffixObject(suf3f, RGBSuffix, 'float');
        addFieldsToVectorFromSuffixObject(suf3f, STPSuffix, 'float');
        suf3f.forEach(field => float3.addField(field));
    }

    {
        let suf4f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4f, XYZWSuffix, 'float');
        addFieldsToVectorFromSuffixObject(suf4f, RGBASuffix, 'float');
        addFieldsToVectorFromSuffixObject(suf4f, STPQSuffix, 'float');
        suf4f.forEach(field => float4.addField(field));
    }

    {
        let suf2i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2i, XYSuffix, 'int');
        addFieldsToVectorFromSuffixObject(suf2i, RGSuffix, 'int');
        addFieldsToVectorFromSuffixObject(suf2i, STSuffix, 'int');
        suf2i.forEach(field => int2.addField(field));
    }

    {
        let suf3i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3i, XYZSuffix, 'int');
        addFieldsToVectorFromSuffixObject(suf3i, RGBSuffix, 'int');
        addFieldsToVectorFromSuffixObject(suf3i, STPSuffix, 'int');
        suf3i.forEach(field => int3.addField(field));
    }

    {
        let suf4i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4i, XYZWSuffix, 'int');
        addFieldsToVectorFromSuffixObject(suf4i, RGBASuffix, 'int');
        addFieldsToVectorFromSuffixObject(suf4i, STPQSuffix, 'int');
        suf4i.forEach(field => int4.addField(field));
    }

    {
        let suf2b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2b, XYSuffix, 'bool');
        addFieldsToVectorFromSuffixObject(suf2b, RGSuffix, 'bool');
        addFieldsToVectorFromSuffixObject(suf2b, STSuffix, 'bool');
        suf2b.forEach(field => bool2.addField(field));
    }

    {
        let suf3b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3b, XYZSuffix, 'bool');
        addFieldsToVectorFromSuffixObject(suf3b, RGBSuffix, 'bool');
        addFieldsToVectorFromSuffixObject(suf3b, STPSuffix, 'bool');
        suf3b.forEach(field => bool3.addField(field));
    }

    {
        let suf4b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4b, XYZWSuffix, 'bool');
        addFieldsToVectorFromSuffixObject(suf4b, RGBASuffix, 'bool');
        addFieldsToVectorFromSuffixObject(suf4b, STPQSuffix, 'bool');
        suf4b.forEach(field => bool4.addField(field));
    }
}


function addSystemTypeMatrix(): void {
    let float2 = getSystemType('float2');
    let float3 = getSystemType('float3');
    let float4 = getSystemType('float4');

    let int2 = getSystemType('int2');
    let int3 = getSystemType('int3');
    let int4 = getSystemType('int4');

    let bool2 = getSystemType('bool2');
    let bool3 = getSystemType('bool3');
    let bool4 = getSystemType('bool4');

    generateSystemType('float2x2', float2, 2);
    generateSystemType('float2x3', float2, 3);
    generateSystemType('float2x4', float2, 4);

    generateSystemType('float3x2', float3, 2);
    generateSystemType('float3x3', float3, 3);
    generateSystemType('float3x4', float3, 4);

    generateSystemType('float4x2', float4, 2);
    generateSystemType('float4x3', float4, 3);
    generateSystemType('float4x4', float4, 4);

    generateSystemType('int2x2', int2, 2);
    generateSystemType('int2x3', int2, 3);
    generateSystemType('int2x4', int2, 4);

    generateSystemType('int3x2', int3, 2);
    generateSystemType('int3x3', int3, 3);
    generateSystemType('int3x4', int3, 4);

    generateSystemType('int4x2', int4, 2);
    generateSystemType('int4x3', int4, 3);
    generateSystemType('int4x4', int4, 4);

    generateSystemType('bool2x2', bool2, 2);
    generateSystemType('bool2x3', bool2, 3);
    generateSystemType('bool2x4', bool2, 4);

    generateSystemType('bool3x2', bool3, 2);
    generateSystemType('bool3x3', bool3, 3);
    generateSystemType('bool3x4', bool3, 4);

    generateSystemType('bool4x2', bool4, 2);
    generateSystemType('bool4x3', bool4, 3);
    generateSystemType('bool4x4', bool4, 4);
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


export function getExternalType(type: ITypeInstruction): any {
    if (type.isEqual(getSystemType('int')) ||
        type.isEqual(getSystemType('float'))) {
        return Number;
    }
    else if (type.isEqual(getSystemType('bool'))) {
        return 'Boolean';
    }
    else if (type.isEqual(getSystemType('float2')) ||
        type.isEqual(getSystemType('bool2')) ||
        type.isEqual(getSystemType('int2'))) {
        return 'Vec2';
    }
    else if (type.isEqual(getSystemType('float3')) ||
        type.isEqual(getSystemType('bool3')) ||
        type.isEqual(getSystemType('int3'))) {
        return 'Vec3';
    }
    else if (type.isEqual(getSystemType('float4')) ||
        type.isEqual(getSystemType('bool4')) ||
        type.isEqual(getSystemType('int4'))) {
        return 'Vec4';
    }
    else if (type.isEqual(getSystemType('float2x2')) ||
        type.isEqual(getSystemType('bool2x2')) ||
        type.isEqual(getSystemType('int2x2'))) {
        return 'Vec2';
    }
    else if (type.isEqual(getSystemType('float3x3')) ||
        type.isEqual(getSystemType('bool3x3')) ||
        type.isEqual(getSystemType('int3x3'))) {
        return 'Mat3';
    }
    else if (type.isEqual(getSystemType('float4x4')) ||
        type.isEqual(getSystemType('bool4x4')) ||
        type.isEqual(getSystemType('int4x4'))) {
        return 'Mat4';
    }
    else {
        return null;
    }
}


export function isMatrixType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('float2x2')) ||
        type.isEqual(getSystemType('float3x3')) ||
        type.isEqual(getSystemType('float4x4')) ||
        type.isEqual(getSystemType('int2x2')) ||
        type.isEqual(getSystemType('int3x3')) ||
        type.isEqual(getSystemType('int4x4')) ||
        type.isEqual(getSystemType('bool2x2')) ||
        type.isEqual(getSystemType('bool3x3')) ||
        type.isEqual(getSystemType('bool4x4'));
}


export function isVectorType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('float2')) ||
        type.isEqual(getSystemType('float3')) ||
        type.isEqual(getSystemType('float4')) ||
        type.isEqual(getSystemType('bool2')) ||
        type.isEqual(getSystemType('bool3')) ||
        type.isEqual(getSystemType('bool4')) ||
        type.isEqual(getSystemType('int2')) ||
        type.isEqual(getSystemType('int3')) ||
        type.isEqual(getSystemType('int4'));
}


export function isScalarType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('bool')) ||
        type.isEqual(getSystemType('int')) ||
        type.isEqual(getSystemType('float'));
}


export function isFloatBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('float')) ||
        type.isEqual(getSystemType('float2')) ||
        type.isEqual(getSystemType('float3')) ||
        type.isEqual(getSystemType('float4')) ||
        type.isEqual(getSystemType('float2x2')) ||
        type.isEqual(getSystemType('float3x3')) ||
        type.isEqual(getSystemType('float4x4'));
}


export function isIntBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('int')) ||
        type.isEqual(getSystemType('int2')) ||
        type.isEqual(getSystemType('int3')) ||
        type.isEqual(getSystemType('int4')) ||
        type.isEqual(getSystemType('int2x2')) ||
        type.isEqual(getSystemType('int3x3')) ||
        type.isEqual(getSystemType('int4x4'));
}


export function isBoolBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('bool')) ||
        type.isEqual(getSystemType('bool2')) ||
        type.isEqual(getSystemType('bool3')) ||
        type.isEqual(getSystemType('bool4')) ||
        type.isEqual(getSystemType('bool2x2')) ||
        type.isEqual(getSystemType('bool3x3')) ||
        type.isEqual(getSystemType('bool4x4'));
}


export function isSamplerType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType('sampler')) ||
        type.isEqual(getSystemType('sampler2D')) ||
        type.isEqual(getSystemType('samplerCUBE'));
}


function generateSystemFunction(name: string,
    translationExpr: string,
    returnTypeName: string,
    argsTypes: string[],
    templateTypes: string[],
    isForVertex: boolean = true,
    isForPixel: boolean = true): void {

    let exprTranslator: ExprTemplateTranslator = new ExprTemplateTranslator(translationExpr);
    let systemFunctions: IMap<SystemFunctionInstruction[]> = systemFunctionsMap;
    let builtIn = true;

    if (!isNull(templateTypes)) {
        for (let i: number = 0; i < templateTypes.length; i++) {
            let argTypes: ITypeInstruction[] = [];
            let functionHash = name + "(";
            let returnType = (returnTypeName === TEMPLATE_TYPE) ?
                getSystemType(templateTypes[i]) :
                getSystemType(returnTypeName);


            for (let j: number = 0; j < argsTypes.length; j++) {
                if (argsTypes[j] === TEMPLATE_TYPE) {
                    argTypes.push(getSystemType(templateTypes[i]));
                    functionHash += templateTypes[i] + ",";
                }
                else {
                    argTypes.push(getSystemType(argsTypes[j]));
                    functionHash += argsTypes[j] + ","
                }
            }

            functionHash += ")";

            if (systemFunctionHashMap[functionHash]) {
                _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: functionHash });
            }

            let id = new IdInstruction({ name });
            let func = new SystemFunctionInstruction({ id, returnType, exprTranslator, argTypes, builtIn });
            // scope: ProgramScope.GLOBAL_SCOPE 

            if (!isDef(systemFunctions[name])) {
                systemFunctions[name] = [];
            }

            func.$makeVertexCompatible(isForVertex);
            func.$makePixelCompatible(isForPixel);

            systemFunctions[name].push(func);
        }
    }
    else {
        if (returnTypeName === TEMPLATE_TYPE) {
            logger.critical("Bad return type(TEMPLATE_TYPE) for system function '" + name + "'.");
        }

        let returnType = getSystemType(returnTypeName);
        let argTypes = [];
        let functionHash = name + "(";

        for (let i: number = 0; i < argsTypes.length; i++) {
            if (argsTypes[i] === TEMPLATE_TYPE) {
                logger.critical("Bad argument type(TEMPLATE_TYPE) for system function '" + name + "'.");
            }
            else {
                argTypes.push(getSystemType(argsTypes[i]));
                functionHash += argsTypes[i] + ",";
            }
        }

        functionHash += ")";

        if (systemFunctionHashMap[functionHash]) {
            _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: functionHash });
        }

        let id = new IdInstruction({ name });
        let func = new SystemFunctionInstruction({ id, returnType, exprTranslator, argTypes, builtIn });

        func.$makeVertexCompatible(isForVertex);
        func.$makePixelCompatible(isForPixel);

        if (!isDef(systemFunctions[name])) {
            systemFunctions[name] = [];
        }

        systemFunctions[name].push(func);
    }
}


function generateNotBuiltInSystemFuction(name: string, definition: string, implementation: string,
    returnTypeName: string,
    usedTypes: string[],
    usedFunctions: string[]): void {

    if (isDef(systemFunctionsMap[name])) {
        console.warn(`Builtin function ${name} already exists.`);
        return;
    }

    let builtIn = false;
    let returnType = getSystemType(returnTypeName);
    let id = new IdInstruction({ name })
    let func = new SystemFunctionInstruction({ id, returnType, definition, implementation, builtIn });

    let usedExtSystemTypes: ITypeDeclInstruction[] = [];
    let usedExtSystemFunctions: IFunctionDeclInstruction[] = [];

    if (!isNull(usedTypes)) {
        for (let i: number = 0; i < usedTypes.length; i++) {
            let typeDecl: ITypeDeclInstruction = <ITypeDeclInstruction>getSystemType(usedTypes[i]).parent;
            if (!isNull(typeDecl)) {
                usedExtSystemTypes.push(typeDecl);
            }
        }
    }

    if (!isNull(usedFunctions)) {
        for (let i: number = 0; i < usedFunctions.length; i++) {
            let pFindFunction: IFunctionDeclInstruction = findSystemFunction(usedFunctions[i], null);
            usedExtSystemFunctions.push(pFindFunction);
        }
    }

    func.$setUsedSystemData(usedExtSystemTypes, usedExtSystemFunctions);
    func.$closeSystemDataInfo();

    systemFunctionsMap[name] = [func];
}


function addSystemFunctions(): void {
    generateSystemFunction('dot', 'dot($1,$2)', 'float', [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'float2', 'float3', 'float4']);
    generateSystemFunction('mul', '$1*$2', TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ['float', 'int', 'float2', 'float3', 'float4']);
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
    assert(Object.keys(systemTypes).length == 0);

    addSystemTypeScalar();
    addSystemTypeVector();
    addSystemTypeMatrix();
}


function initSystemFunctions(): void {
    assert(Object.keys(systemFunctionsMap).length == 0);
    addSystemFunctions();
}


function generateSystemVariable(name: string, typeName: string,
    isForVertex: boolean, isForPixel: boolean, readonly: boolean): void {

    if (isDef(systemVariables[name])) {
        return;
    }

    let id = new IdInstruction({ name });
    let type = new VariableTypeInstruction({ type: getSystemType(typeName), writable: readonly });
    let variableDecl = new VariableDeclInstruction({ id, type, builtIn: true });

    variableDecl.$makeVertexCompatible(isForVertex);
    variableDecl.$makePixelCompatible(isForPixel);

    systemVariables[name] = variableDecl;
}


function addSystemVariables(): void {
    // generateSystemVariable('fragColor', 'gl_FragColor', 'float4', false, true, true);
    // generateSystemVariable('fragCoord', 'gl_FragCoord', 'float4', false, true, true);
    // generateSystemVariable('frontFacing', 'gl_FrontFacing', 'bool', false, true, true);
    // generateSystemVariable('pointCoord', 'gl_PointCoord', 'float2', false, true, true);
}


function initSystemVariables(): void {
    assert(isNull(systemVariables))
    addSystemVariables();
}


function findSystemFunction(functionName: string,
    args: ITypedInstruction[] | IVariableDeclInstruction[]): IFunctionDeclInstruction {
    let systemFunctions = systemFunctionsMap[functionName];

    if (!isDef(systemFunctions)) {
        return null;
    }

    if (isNull(args)) {
        for (let i = 0; i < systemFunctions.length; i++) {
            if (systemFunctions[i].numArgsRequired === 0) {
                return <IFunctionDeclInstruction>systemFunctions[i];
            }
        }
    }

    for (let i = 0; i < systemFunctions.length; i++) {
        if (args.length !== systemFunctions[i].numArgsRequired) {
            continue;
        }

        let testedArguments = systemFunctions[i].arguments;
        let isOk = true;

        for (let j = 0; j < args.length; j++) {
            isOk = false;

            if (!args[j].type.isEqual(testedArguments[j].type)) {
                break;
            }

            isOk = true;
        }

        if (isOk) {
            return <IFunctionDeclInstruction>systemFunctions[i];
        }
    }
    return null;
}


function findFunction(scope: ProgramScope, name: string, args: ITypedInstruction[] | IVariableDeclInstruction[]): IFunctionDeclInstruction {
    return findSystemFunction(name, args) || scope.findFunction(name, <IVariableDeclInstruction[]>args);
}


function findConstructor(type: ITypeInstruction, args: IExprInstruction[]): IVariableTypeInstruction {
    return new VariableTypeInstruction({ type });
}


function findShaderFunction(scope: ProgramScope, functionName: string,
    args: IExprInstruction[]): IFunctionDeclInstruction {
    return scope.getShaderFunction(functionName, args);
}


function findFunctionByDef(scope: ProgramScope, pDef: FunctionDefInstruction): IFunctionDeclInstruction {
    return findFunction(scope, pDef.name, pDef.arguments);
}



export function getSystemType(sTypeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    return systemTypes[sTypeName] || null;
}


export function getSystemVariable(name: string): IVariableDeclInstruction {
    return systemVariables[name] || null;
}


function getVariable(scope: ProgramScope, name: string): IVariableDeclInstruction {
    return getSystemVariable(name) || scope.findVariable(name);
}


function getType(scope: ProgramScope, sTypeName: string): ITypeInstruction {
    return getSystemType(sTypeName) || scope.findType(sTypeName);
}


function isSystemFunction(func: IFunctionDeclInstruction): boolean {
    return false;
}


function isSystemVariable(variable: IVariableDeclInstruction): boolean {
    return false;
}


function isSystemType(type: ITypeDeclInstruction): boolean {
    return false;
}





// todo: rewrite it!
function _error(context: Context, node: IParseNode, code: number, info: IEffectErrorInfo = {}): void {
    let location: ISourceLocation = <ISourceLocation>{ file: context ? context.filename : null, line: 0 };
    let lineColumn: { line: number; column: number; } = resolveNodeSourceLocation(node);

    switch (code) {
        default:
            info.line = lineColumn.line + 1;
            info.column = lineColumn.column + 1;
            location.line = lineColumn.line + 1;
            break;
    }

    let logEntity: ILoggerEntity = <ILoggerEntity>{
        code: code,
        info: info,
        location: location
    };

    logger.critical(logEntity);
    // throw new Error(code.toString());
}


function analyzeUseDecl(context: Context, scope: ProgramScope, node: IParseNode): void {
    scope.useStrictMode();
    // todo: implement it!
}


function analyzeComplexName(node: IParseNode): string {
    const children: IParseNode[] = node.children;
    let name: string = '';

    for (let i: number = children.length - 1; i >= 0; i--) {
        name += children[i].value;
    }

    return name;
}


/**
 * AST example:
 *    UseDecl
 *         T_KW_STRICT = 'strict'
 *         T_KW_USE = 'use'
 */
function analyzeGlobalUseDecls(context: Context, scope: ProgramScope, ast: IParseTree): void {
    let children: IParseNode[] = ast.getRoot().children;
    let i: number = 0;

    for (i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'UseDecl') {
            analyzeUseDecl(context, scope, children[i]); // << always 'use strict' by default!
        }
    }
}


/**
 * AST example:
 *    ProvideDecl
 *         T_PUNCTUATOR_59 = ';'
 *       + ComplexNameOpt 
 *         T_KW_PROVIDE = 'provide'
 */
function analyzeProvideDecl(context: Context, node: IParseNode): void {
    const children: IParseNode[] = node.children;

    if (children.length === 3) {
        let namespace = analyzeComplexName(children[1]);;
        if (!isNull(context.namespace)) {
            console.warn(`Context namespace overriding detected '${context.namespace}' => '${namespace}'`);
        }
        context.namespace = namespace;
        assert(children[2].name === 'T_KW_PROVIDE');
    }
    else {
        _error(context, node, EEffectTempErrors.UNSUPPORTED_PROVIDE_AS);
        return;
    }
}




function analyzeGlobalProvideDecls(context: Context, scope: ProgramScope, ast: IParseTree): void {
    let children: IParseNode[] = ast.getRoot().children;
    let i: number = 0;

    for (i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'ProvideDecl') {
            analyzeProvideDecl(context, children[i]);
        }
    }
}


// function analyzeInitExpr(context: Context, scope: ProgramScope, node: IParseNode): IInitExprInstruction {
//     let children: IParseNode[] = node.children;
//     let initExpr: IInitExprInstruction = new InitExprInstruction(node);

//     if (children.length === 1) {
//         initExpr.push(analyzeExpr(context, scope, children[0]), true);
//     }
//     else {
//         for (let i: number = 0; i < children.length; i++) {
//             if (children[i].name === 'InitExpr') {
//                 initExpr.push(analyzeInitExpr(context, scope, children[i]), true);
//             }
//         }
//     }

//     return initExpr;
// }



// function _errorFromInstruction(context: Context, node: IParseNode, pError: IInstructionError): void {
//     _error(context, node, pError.code, isNull(pError.info) ? {} : pError.info);
// }


// function checkInstruction(context: Context, pInst: IInstruction, eStage: ECheckStage): void {
//     if (!pInst._check(eStage)) {
//         _errorFromInstruction(context, pInst.sourceNode, pInst._getLastError());
//     }
// }


// function addVariableDecl(context: Context, scope: ProgramScope, variable: IVariableDeclInstruction): void {
//     if (isSystemVariable(variable)) {
//         _error(context, variable.sourceNode, EEffectErrors.REDEFINE_SYSTEM_VARIABLE, { varName: variable.name });
//     }

//     let isVarAdded: boolean = scope.addVariable(variable);

//     if (!isVarAdded) {
//         let eScopeType: EScopeType = scope.type;

//         switch (eScopeType) {
//             case EScopeType.k_Default:
//                 _error(context, variable.sourceNode, EEffectErrors.REDEFINE_VARIABLE, { varName: variable.name });
//                 break;
//             case EScopeType.k_Struct:
//                 _error(context, variable.sourceNode, EEffectErrors.BAD_NEW_FIELD_FOR_STRUCT_NAME, { fieldName: variable.name });
//                 break;
//             case EScopeType.k_Annotation:
//                 _error(context, variable.sourceNode, EEffectErrors.BAD_NEW_ANNOTATION_VAR, { varName: variable.name });
//                 break;
//         }
//     }
// }


// function addTypeDecl(context: Context, scope: ProgramScope, type: ITypeDeclInstruction): void {
//     if (isSystemType(type)) {
//         _error(context, type.sourceNode, EEffectErrors.REDEFINE_SYSTEM_TYPE, { typeName: type.name });
//     }

//     let isTypeAdded: boolean = scope.addType(type);

//     if (!isTypeAdded) {
//         _error(context, type.sourceNode, EEffectErrors.REDEFINE_TYPE, { typeName: type.name });
//     }
// }


// function addFunctionDecl(context: Context, scope: ProgramScope, node: IParseNode, func: IFunctionDeclInstruction): void {
//     if (isSystemFunction(func)) {
//         _error(context, node, EEffectErrors.REDEFINE_SYSTEM_FUNCTION, { funcName: func.name });
//     }

//     let isFunctionAdded: boolean = scope.addFunction(func);

//     if (!isFunctionAdded) {
//         _error(context, node, EEffectErrors.REDEFINE_FUNCTION, { funcName: func.name });
//     }
// }


function addTechnique(context: Context, scope: ProgramScope, technique: ITechniqueInstruction): void {
    let name: string = technique.name;

    if (isDef(context.techniqueMap[name])) {
        _error(context, technique.sourceNode, EEffectErrors.BAD_TECHNIQUE_REDEFINE_NAME, { techName: name });
        return;
    }

    context.techniqueMap[name] = technique;
}


// function checkFunctionsForRecursion(context: Context): void {
//     let funcList: IFunctionDeclInstruction[] = context.functionWithImplementationList;
//     let isNewAdd: boolean = true;
//     let isNewDelete: boolean = true;

//     while (isNewAdd || isNewDelete) {
//         isNewAdd = false;
//         isNewDelete = false;

//         mainFor:
//         for (let i: number = 0; i < funcList.length; i++) {
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
//                     let node = addedFunction.sourceNode;

//                     if (testedFunction === addedFunction) {
//                         testedFunction.addToBlackList();
//                         isNewDelete = true;
//                         _error(context, node, EEffectErrors.BAD_FUNCTION_USAGE_RECURSION, { funcDef: testedFunction.stringDef });
//                         continue mainFor;
//                     }

//                     if (addedFunction.isBlackListFunction() ||
//                         !addedFunction.canUsedAsFunction()) {
//                         testedFunction.addToBlackList();
//                         _error(context, node, EEffectErrors.BAD_FUNCTION_USAGE_BLACKLIST, { funcDef: testedFunction.stringDef });
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
//         for (let i: number = 0; i < funcList.length; i++) {
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
//                 _error(context, testedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: testedFunction.stringDef });
//                 testedFunction.addToBlackList();
//                 isNewDelete = true;
//                 continue mainFor;
//             }

//             if (!testedFunction.checkPixelUsage()) {
//                 _error(context, testedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: testedFunction.stringDef });
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
//                         _error(context, usedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_VERTEX, { funcDef: testedFunction.stringDef });
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
//                         _error(context, usedFunction.sourceNode, EEffectErrors.BAD_FUNCTION_USAGE_PIXEL, { funcDef: testedFunction.stringDef });
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

//     for (let i: number = 0; i < funcList.length; i++) {
//         funcList[i].generateInfoAboutUsedData();
//     }
// }


// function generateShadersFromFunctions(context: Context): void {
//     let funcList: IFunctionDeclInstruction[] = context.functionWithImplementationList;

//     for (let i: number = 0; i < funcList.length; i++) {

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


function getRenderStateValue(eState: ERenderStates, value: string): ERenderStateValues {
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
            switch (value) {
                case 'TRUE':
                    eValue = ERenderStateValues.TRUE;
                    break;
                case 'FALSE':
                    eValue = ERenderStateValues.FALSE;
                    break;

                default:
                    logger.warn('Unsupported render state ALPHABLENDENABLE/ZENABLE/ZWRITEENABLE/DITHERENABLE value used: '
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
                    logger.warn('Unsupported render state CULLFACE value used: ' + value + '.');
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
                    logger.warn('Unsupported render state FRONTFACE value used: ' + value + '.');
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
                    logger.warn('Unsupported render state SRCBLEND/DESTBLEND value used: ' + value + '.');
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
                    logger.warn('Unsupported render state BLENDEQUATION/BLENDEQUATIONSEPARATE value used: ' + value + '.');
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
                    logger.warn('Unsupported render state ZFUNC value used: ' +
                        value + '.');
                    return eValue;
            }
            break;
    }

    return eValue;
}






// /**
//  * Проверят возможность использования оператора между двумя типами.
//  * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
//  *
//  * @operator {string} Один из операторов: + - * / % += -= *= /= %= = < > <= >= == != =
//  * @leftType {IVariableTypeInstruction} Тип левой части выражения
//  * @rightType {IVariableTypeInstruction} Тип правой части выражения
//  */
// function checkTwoOperandExprTypes(
//     context: Context,
//     operator: string,
//     leftType: IVariableTypeInstruction,
//     rightType: IVariableTypeInstruction): IVariableTypeInstruction {

//     const isComplex: boolean = leftType.isComplex() || rightType.isComplex();
//     const isArray: boolean = leftType.isNotBaseArray() || rightType.isNotBaseArray();
//     const isSampler: boolean = isSamplerType(leftType) || isSamplerType(rightType);
//     const boolType: IVariableTypeInstruction = getSystemType('bool').variableType;

//     if (isArray || isSampler) {
//         return null;
//     }

//     if (operator === '%' || operator === '%=') {
//         return null;
//     }

//     if (isAssignmentOperator(operator)) {
//         if (!leftType.writable) {
//             _error(context, leftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
//             return null;
//         }

//         if (!rightType.readable) {
//             _error(context, rightType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//             return null;
//         }

//         if (operator !== '=' && !leftType.readable) {
//             _error(context, leftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//         }
//     }
//     else {
//         if (!leftType.readable) {
//             _error(context, leftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//             return null;
//         }

//         if (!rightType.readable) {
//             _error(context, rightType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//             return null;
//         }
//     }

//     if (isComplex) {
//         if (operator === '=' && leftType.isEqual(rightType)) {
//             return <IVariableTypeInstruction>leftType;
//         }
//         else if (isEqualOperator(operator) && !leftType.isContainArray() && !leftType.isContainSampler()) {
//             return boolType;
//         }
//         else {
//             return null;
//         }
//     }

//     // let returnType: IVariableTypeInstruction = null;
//     const pLeftBaseType: IVariableTypeInstruction = (<SystemTypeInstruction>leftType.baseType).variableType;
//     const pRightBaseType: IVariableTypeInstruction = (<SystemTypeInstruction>rightType.baseType).variableType;


//     if (leftType.isConst() && isAssignmentOperator(operator)) {
//         return null;
//     }

//     if (leftType.isEqual(rightType)) {
//         if (isArithmeticalOperator(operator)) {
//             if (!isMatrixType(leftType) || (operator !== '/' && operator !== '/=')) {
//                 return pLeftBaseType;
//             }
//             else {
//                 return null;
//             }
//         }
//         else if (isRelationalOperator(operator)) {
//             if (isScalarType(leftType)) {
//                 return boolType;
//             }
//             else {
//                 return null;
//             }
//         }
//         else if (isEqualOperator(operator)) {
//             return boolType;
//         }
//         else if (operator === '=') {
//             return pLeftBaseType;
//         }
//         else {
//             return null;
//         }

//     }

//     if (isArithmeticalOperator(operator)) {
//         if (isBoolBasedType(leftType) || isBoolBasedType(rightType) ||
//             isFloatBasedType(leftType) !== isFloatBasedType(rightType) ||
//             isIntBasedType(leftType) !== isIntBasedType(rightType)) {
//             return null;
//         }

//         if (isScalarType(leftType)) {
//             return pRightBaseType;
//         }

//         if (isScalarType(rightType)) {
//             return pLeftBaseType;
//         }

//         if (operator === '*' || operator === '*=') {
//             if (isMatrixType(leftType) && isVectorType(rightType) &&
//                 leftType.length === rightType.length) {
//                 return pRightBaseType;
//             }
//             else if (isMatrixType(rightType) && isVectorType(leftType) &&
//                 leftType.length === rightType.length) {
//                 return pLeftBaseType;
//             }
//             else {
//                 return null;
//             }
//         }
//     }

//     return null;
// }


// /**
//  * Проверят возможность использования оператора к типу данных.
//  * Возращает тип получаемый в результате приминения опрератора, или, если применить его невозможно - null.
//  *
//  * @operator {string} Один из операторов: + - ! ++ --
//  * @leftType {IVariableTypeInstruction} Тип операнда
//  */
// function checkOneOperandExprType(context: Context, node: IParseNode, operator: string,
//     type: IVariableTypeInstruction): IVariableTypeInstruction {

//     const isComplex: boolean = type.isComplex();
//     const isArray: boolean = type.isNotBaseArray();
//     const isSampler: boolean = isSamplerType(type);

//     if (isComplex || isArray || isSampler) {
//         return null;
//     }

//     if (!type.readable) {
//         _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }


//     if (operator === '++' || operator === '--') {
//         if (!type.writable) {
//             _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
//             return null;
//         }

//         return type;
//     }

//     if (operator === '!') {
//         const boolType: IVariableTypeInstruction = getSystemType('bool').variableType;

//         if (type.isEqual(boolType)) {
//             return boolType;
//         }
//         else {
//             return null;
//         }
//     }
//     else {
//         if (isBoolBasedType(type)) {
//             return null;
//         }
//         else {
//             return (<SystemTypeInstruction>type.baseType).variableType;
//         }
//     }

//     //return null;
// }


// function isAssignmentOperator(operator: string): boolean {
//     return operator === '+=' || operator === '-=' ||
//         operator === '*=' || operator === '/=' ||
//         operator === '%=' || operator === '=';
// }


// function isArithmeticalOperator(operator: string): boolean {
//     return operator === '+' || operator === '+=' ||
//         operator === '-' || operator === '-=' ||
//         operator === '*' || operator === '*=' ||
//         operator === '/' || operator === '/=';
// }


// function isRelationalOperator(operator: string): boolean {
//     return operator === '>' || operator === '>=' ||
//         operator === '<' || operator === '<=';
// }


// function isEqualOperator(operator: string): boolean {
//     return operator === '==' || operator === '!=';
// }


// function analyzeVariableDecl(context: Context, scope: ProgramScope, node: IParseNode, instruction: IInstruction = null): void {
//     let children: IParseNode[] = node.children;
//     let generalType: IVariableTypeInstruction = null;
//     let variable: IVariableDeclInstruction = null;
//     let i: number = 0;

//     generalType = analyzeUsageType(context, scope, children[children.length - 1]);

//     for (i = children.length - 2; i >= 1; i--) {
//         if (children[i].name === 'Variable') {
//             variable = analyzeVariable(context, scope, children[i], generalType);

//             if (!isNull(instruction)) {
//                 instruction.push(variable, true);
//                 if (instruction.instructionType === EInstructionTypes.k_DeclStmtInstruction) {
//                     let variableSubDecls: IVariableDeclInstruction[] = variable.vars;
//                     if (!isNull(variableSubDecls)) {
//                         for (let j: number = 0; j < variableSubDecls.length; j++) {
//                             instruction.push(variableSubDecls[j], false);
//                         }
//                     }
//                 }
//             }
//         }
//     }
// }


// function analyzeUsageType(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {
//     let children: IParseNode[] = node.children;
//     let i: number = 0;
//     let type: IVariableTypeInstruction = new VariableTypeInstruction(node);

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'Type') {
//             let mainType: ITypeInstruction = analyzeType(context, scope, children[i]);
//             type.pushType(mainType);
//         }
//         else if (children[i].name === 'Usage') {
//             let usage: string = analyzeUsage(children[i]);
//             type.addUsage(usage);
//         }
//     }

//     checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);
//     return type;
// }


// function analyzeType(context: Context, scope: ProgramScope, node: IParseNode): ITypeInstruction {
//     let children: IParseNode[] = node.children;
//     let type: ITypeInstruction = null;

//     switch (node.name) {
//         case 'T_TYPE_ID':
//             type = getType(scope, node.value);

//             if (isNull(type)) {
//                 _error(context, node, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: node.value });
//             }
//             break;

//         case 'Struct':
//             type = analyzeStruct(context, scope, node);
//             break;

//         case 'T_KW_VOID':
//             type = getSystemType('void');
//             break;

//         case 'ScalarType':
//         case 'ObjectType':
//             type = getType(scope, children[children.length - 1].value);

//             if (isNull(type)) {
//                 _error(context, node, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: children[children.length - 1].value });
//             }

//             break;

//         case 'VectorType':
//         case 'MatrixType':
//             _error(context, node, EEffectErrors.BAD_TYPE_VECTOR_MATRIX);
//             break;

//         case 'BaseType':
//         case 'Type':
//             return analyzeType(context, scope, children[0]);
//     }

//     return type;
// }


// function analyzeUsage(node: IParseNode): string {
//     node = node.children[0];
//     return node.value;
// }


// function analyzeVariable(context: Context, scope: ProgramScope, node: IParseNode, generalType: IVariableTypeInstruction): IVariableDeclInstruction {
//     let children: IParseNode[] = node.children;

//     let varDecl: IVariableDeclInstruction = new VariableDeclInstruction(node);
//     let variableType: IVariableTypeInstruction = new VariableTypeInstruction(node);
//     let annotation: IAnnotationInstruction = null;
//     let semantics: string = '';
//     let initExpr: IInitExprInstruction = null;

//     varDecl.push(variableType, true);
//     variableType.pushType(generalType);
//     varDecl.scope = (scope.current);

//     analyzeVariableDim(context, scope, children[children.length - 1], varDecl);

//     let i: number = 0;
//     for (i = children.length - 2; i >= 0; i--) {
//         if (children[i].name === 'Annotation') {
//             annotation = analyzeAnnotation(children[i]);
//             varDecl.annotation = (annotation);
//         }
//         else if (children[i].name === 'Semantic') {
//             semantics = analyzeSemantic(children[i]);
//             varDecl.semantics = (semantics);
//             varDecl.nameID.realName = (semantics);
//         }
//         else if (children[i].name === 'Initializer') {
//             initExpr = analyzeInitializer(context, scope, children[i]);
//             if (!initExpr.optimizeForVariableType(variableType)) {
//                 _error(context, node, EEffectErrors.BAD_VARIABLE_INITIALIZER, { varName: varDecl.name });
//                 return null;
//             }
//             varDecl.push(initExpr, true);
//         }
//     }

//     checkInstruction(context, varDecl, ECheckStage.CODE_TARGET_SUPPORT);
//     addVariableDecl(context, scope, varDecl);
//     varDecl.fillNameIndex();

//     return varDecl;
// }


// function analyzeVariableDim(context: Context, scope: ProgramScope, node: IParseNode, variableDecl: IVariableDeclInstruction): void {
//     let children: IParseNode[] = node.children;
//     let variableType: IVariableTypeInstruction = <IVariableTypeInstruction>variableDecl.type;

//     if (children.length === 1) {
//         let name: IIdInstruction = new IdInstruction(node);
//         name.name = (children[0].value);
//         variableDecl.push(name, true);
//         return;
//     }

//     analyzeVariableDim(context, scope, children[children.length - 1], variableDecl);

//     {
//         let indexExpr: IExprInstruction = analyzeExpr(context, scope, children[children.length - 3]);
//         variableType.addArrayIndex(indexExpr);
//     }
// }


function analyzeAnnotation(node: IParseNode): IAnnotationInstruction {
    // todo
    return null;
}


function analyzeSemantic(node: IParseNode): string {
    let semantics: string = node.children[0].value;
    // let pDecl: IDeclInstruction = <IDeclInstruction>_pCurrentInstruction;
    // pDecl.semantics = (semantics);
    return semantics;
}


// function analyzeInitializer(context: Context, scope: ProgramScope, node: IParseNode): IInitExprInstruction {
//     let children: IParseNode[] = node.children;
//     let initExpr: IInitExprInstruction = new InitExprInstruction(node);

//     if (children.length === 2) {
//         initExpr.push(analyzeExpr(context, scope, children[0]), true);
//     }
//     else {
//         for (let i: number = children.length - 3; i >= 1; i--) {
//             if (children[i].name === 'InitExpr') {
//                 initExpr.push(analyzeInitExpr(context, scope, children[i]), true);
//             }
//         }
//     }

//     return initExpr;
// }


// function analyzeExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     let name: string = node.name;

//     switch (name) {
//         case 'ObjectExpr':
//             return analyzeObjectExpr(context, scope, node);
//         case 'ComplexExpr':
//             return analyzeComplexExpr(context, scope, node);
//         case 'PostfixExpr':
//             return analyzePostfixExpr(context, scope, node);
//         case 'UnaryExpr':
//             return analyzeUnaryExpr(context, scope, node);
//         case 'CastExpr':
//             return analyzeCastExpr(context, scope, node);
//         case 'ConditionalExpr':
//             return analyzeConditionalExpr(context, scope, node);
//         case 'MulExpr':
//         case 'AddExpr':
//             return analyzeArithmeticExpr(context, scope, node);
//         case 'RelationalExpr':
//         case 'EqualityExpr':
//             return analyzeRelationExpr(context, scope, node);
//         case 'AndExpr':
//         case 'OrExpr':
//             return analyzeLogicalExpr(context, scope, node);
//         case 'AssignmentExpr':
//             return analyzeAssignmentExpr(context, scope, node);
//         case 'T_NON_TYPE_ID':
//             return analyzeIdExpr(context, scope, node);
//         case 'T_STRING':
//         case 'T_UINT':
//         case 'T_FLOAT':
//         case 'T_KW_TRUE':
//         case 'T_KW_FALSE':
//             return analyzeSimpleExpr(context, scope, node);
//         default:
//             _error(context, node, EEffectErrors.UNSUPPORTED_EXPR, { exprName: name });
//             break;
//     }

//     return null;
// }


// function analyzeObjectExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     let name: string = node.children[node.children.length - 1].name;

//     switch (name) {
//         case 'T_KW_COMPILE':
//             return analyzeCompileExpr(context, scope, node);
//         case 'T_KW_SAMPLER_STATE':
//             return analyzeSamplerStateBlock(context, scope, node);
//         default:
//     }
//     return null;
// }


// function analyzeCompileExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     let children: IParseNode[] = node.children;
//     let expr: CompileExprInstruction = new CompileExprInstruction(node);
//     let exprType: IVariableTypeInstruction;
//     let args: IExprInstruction[] = null;
//     let shaderFuncName: string = children[children.length - 2].value;
//     let shaderFunc: IFunctionDeclInstruction = null;
//     let i: number = 0;

//     args = [];

//     if (children.length > 4) {
//         let argumentExpr: IExprInstruction;

//         for (i = children.length - 3; i > 0; i--) {
//             if (children[i].value !== ',') {
//                 argumentExpr = analyzeExpr(context, scope, children[i]);
//                 args.push(argumentExpr);
//             }
//         }
//     }

//     shaderFunc = findShaderFunction(scope, sShaderFuncName, args);

//     if (isNull(shaderFunc)) {
//         _error(context, node, EEffectErrors.BAD_COMPILE_NOT_FUNCTION, { funcName: sShaderFuncName });
//         return null;
//     }

//     exprType = (<IVariableTypeInstruction>shaderFunc.type).wrap();

//     expr.type = (exprType);
//     expr.operator = ('complile');
//     expr.push(shaderFunc.nameID, false);

//     if (!isNull(args)) {
//         for (i = 0; i < args.length; i++) {
//             expr.push(args[i], true);
//         }
//     }

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeSamplerStateBlock(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     node = node.children[0];

//     let children: IParseNode[] = node.children;
//     let expr: SamplerStateBlockInstruction = new SamplerStateBlockInstruction(node);
//     let i: number = 0;

//     expr.operator = ('sample_state');

//     for (i = children.length - 2; i >= 1; i--) {
//         analyzeSamplerState(context, scope, children[i], expr);
//     }

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeSamplerState(context: Context, scope: ProgramScope, node: IParseNode, pSamplerStates: SamplerStateBlockInstruction): void {

//     let children: IParseNode[] = node.children;
//     if (children[children.length - 2].name === 'StateIndex') {
//         _error(context, node, EEffectErrors.NOT_SUPPORT_STATE_INDEX);
//         return;
//     }

//     let stateExprNode: IParseNode = children[children.length - 3];
//     let subStateExprNode: IParseNode = stateExprNode.children[stateExprNode.children.length - 1];
//     let stateType: string = children[children.length - 1].value.toUpperCase();
//     let stateValue: string = '';

//     if (isNull(subStateExprNode.value)) {
//         _error(context, subStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
//         return;
//     }

//     let texture: IVariableDeclInstruction = null;

//     switch (stateType) {
//         case 'TEXTURE':
//             // let texture: IVariableDeclInstruction = null;
//             if (stateExprNode.children.length !== 3 || subStateExprNode.value === '{') {
//                 _error(context, subStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
//                 return;
//             }
//             let textureName: string = stateExprNode.children[1].value;
//             if (isNull(textureName) || !scope.hasVariable(textureName)) {
//                 _error(context, stateExprNode.children[1], EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
//                 return;
//             }

//             texture = getVariable(scope, textureName);
//             stateValue = textureName;
//             break;

//         case 'ADDRESSU': /* WRAP_S */
//         case 'ADDRESSV': /* WRAP_T */
//             stateValue = subStateExprNode.value.toUpperCase();
//             switch (stateValue) {
//                 case 'WRAP':
//                 case 'CLAMP':
//                 case 'MIRROR':
//                     break;
//                 default:
//                     logger.warn('Webgl don`t support this wrapmode: ' + stateValue);
//                     return;
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
//                     logger.warn('Webgl don`t support this texture filter: ' + stateValue);
//                     return;
//             }
//             break;

//         default:
//             logger.warn('Don`t support this texture param: ' + stateType);
//             return;
//     }

//     if (stateType !== 'TEXTURE') {
//         pSamplerStates.addState(stateType, stateValue);
//     }
//     else {
//         pSamplerStates.texture = (texture);
//     }
// }


// function analyzeComplexExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     let children: IParseNode[] = node.children;
//     let firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'T_NON_TYPE_ID':
//             return analyzeFunctionCallExpr(context, scope, node);
//         case 'BaseType':
//         case 'T_TYPE_ID':
//             return analyzeConstructorCallExpr(context, scope, node);
//         default:
//             return analyzeSimpleComplexExpr(context, scope, node);
//     }
// }


// function analyzeFunctionCallExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     let children: IParseNode[] = node.children;
//     let expr: IExprInstruction = null;
//     let exprType: IVariableTypeInstruction = null;
//     let args: IExprInstruction[] = null;
//     let funcName: string = children[children.length - 1].value;
//     let func: IFunctionDeclInstruction = null;
//     let funcId: IIdExprInstruction = null;
//     let i: number = 0;
//     let currentAnalyzedFunction: IFunctionDeclInstruction = context.currentFunction;

//     if (children.length > 3) {
//         let argumentExpr: IExprInstruction;

//         args = [];

//         for (i = children.length - 3; i > 0; i--) {
//             if (children[i].value !== ',') {
//                 argumentExpr = analyzeExpr(context, scope, children[i]);
//                 args.push(argumentExpr);
//             }
//         }
//     }

//     func = findFunction(scope, funcName, args);

//     if (isNull(func)) {
//         _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_FUNCTION, { funcName: funcName });
//         return null;
//     }

//     if (!isDef(func)) {
//         _error(context, node, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: funcName });
//         return null;
//     }

//     if (!isNull(currentAnalyzedFunction)) {
//         if (!func.pixel) {
//             currentAnalyzedFunction.pixel = (false);
//         }

//         if (!func.vertex) {
//             currentAnalyzedFunction.vertex = (false);
//         }
//     }

//     if (func.instructionType === EInstructionTypes.k_FunctionDeclInstruction) {
//         let funcCallExpr: FunctionCallInstruction = new FunctionCallInstruction(null);

//         funcId = new IdExprInstruction(null);
//         funcId.push(func.nameID, false);

//         exprType = (<IVariableTypeInstruction>func.type).wrap();

//         funcCallExpr.type = (exprType);
//         funcCallExpr.push(funcId, true);

//         if (!isNull(args)) {
//             for (i = 0; i < args.length; i++) {
//                 funcCallExpr.push(args[i], true);
//             }

//             let funcArguments: IVariableDeclInstruction[] = (<FunctionDeclInstruction>func).arguments;
//             for (i = 0; i < args.length; i++) {
//                 if (funcArguments[i].type.hausage('out')) {
//                     if (!args[i].type.writable) {
//                         _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
//                         return null;
//                     }
//                 }
//                 else if (funcArguments[i].type.hausage('inout')) {
//                     if (!args[i].type.writable) {
//                         _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
//                         return null;
//                     }

//                     if (!args[i].type.readable) {
//                         _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//                         return null;
//                     }
//                 }
//                 else {
//                     if (!args[i].type.readable) {
//                         _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//                         return null;
//                     }
//                 }
//             }

//             for (i = args.length; i < funcArguments.length; i++) {
//                 funcCallExpr.push(funcArguments[i].initializeExpr, false);
//             }

//         }

//         if (!isNull(currentAnalyzedFunction)) {
//             currentAnalyzedFunction.addUsedFunction(func);
//         }

//         func.markUsedAs(EFunctionType.k_Function);

//         expr = funcCallExpr;
//     }
//     else {
//         let systemCallExpr: SystemCallInstruction = new SystemCallInstruction();

//         systemCallExpr.setSystemCallFunction(func);
//         systemCallExpr.fillByArguments(args);

//         if (!isNull(currentAnalyzedFunction)) {
//             for (i = 0; i < args.length; i++) {
//                 if (!args[i].type.readable) {
//                     _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//                     return null;
//                 }
//             }
//         }

//         expr = systemCallExpr;

//         if (!func.builtIn && !isNull(currentAnalyzedFunction)) {
//             currentAnalyzedFunction.addUsedFunction(func);
//         }
//     }

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeConstructorCallExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {
//     let children: IParseNode[] = node.children;
//     let expr: ConstructorCallInstruction = new ConstructorCallInstruction(node);
//     let exprType: IVariableTypeInstruction = null;
//     let args: IExprInstruction[] = null;
//     let constructorType: ITypeInstruction = null;
//     let i: number = 0;

//     constructorType = analyzeType(context, scope, children[children.length - 1]);

//     if (isNull(constructorType)) {
//         _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_TYPE);
//         return null;
//     }

//     if (children.length > 3) {
//         let argumentExpr: IExprInstruction = null;

//         args = [];

//         for (i = children.length - 3; i > 0; i--) {
//             if (children[i].value !== ',') {
//                 argumentExpr = analyzeExpr(context, scope, children[i]);
//                 args.push(argumentExpr);
//             }
//         }
//     }

//     exprType = findConstructor(constructorType, args);

//     if (isNull(exprType)) {
//         _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_CONSTRUCTOR, { typeName: constructorType.toString() });
//         return null;
//     }

//     expr.type = (exprType);
//     expr.push(constructorType, false);

//     if (!isNull(args)) {
//         for (i = 0; i < args.length; i++) {
//             if (!args[i].type.readable) {
//                 _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//                 return null;
//             }

//             expr.push(args[i], true);
//         }
//     }

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeSimpleComplexExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let expr: ComplexExprInstruction = new ComplexExprInstruction(node);
//     let complexExpr: IExprInstruction;
//     let exprType: IVariableTypeInstruction;

//     complexExpr = analyzeExpr(context, scope, children[1]);
//     exprType = <IVariableTypeInstruction>complexExpr.type;

//     expr.type = (exprType);
//     expr.push(complexExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }



// function analyzePostfixExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let symbol: string = children[children.length - 2].value;

//     switch (symbol) {
//         case '[':
//             return analyzePostfixIndex(context, scope, node);
//         case '.':
//             return analyzePostfixPoint(context, scope, node);
//         case '++':
//         case '--':
//             return analyzePostfixArithmetic(context, scope, node);
//     }

//     return null;
// }


// function analyzePostfixIndex(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let expr: PostfixIndexInstruction = new PostfixIndexInstruction(node);
//     let postfixExpr: IExprInstruction = null;
//     let indexExpr: IExprInstruction = null;
//     let exprType: IVariableTypeInstruction = null;
//     let postfixExprType: IVariableTypeInstruction = null;
//     let indexExprType: IVariableTypeInstruction = null;
//     let intType: ITypeInstruction = null;

//     postfixExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

//     if (!postfixExprType.isArray()) {
//         _error(context, node, EEffectErrors.BAD_POSTIX_NOT_ARRAY, { typeName: postfixExprType.toString() });
//         return null;
//     }

//     indexExpr = analyzeExpr(context, scope, children[children.length - 3]);
//     indexExprType = <IVariableTypeInstruction>indexExpr.type;

//     intType = getSystemType('int');

//     if (!indexExprType.isEqual(intType)) {
//         _error(context, node, EEffectErrors.BAD_POSTIX_NOT_INT_INDEX, { typeName: indexExprType.toString() });
//         return null;
//     }

//     exprType = <IVariableTypeInstruction>(postfixExprType.arrayElementType);

//     expr.type = (exprType);
//     expr.push(postfixExpr, true);
//     expr.push(indexExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzePostfixPoint(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let expr: PostfixPointInstruction = new PostfixPointInstruction(node);
//     let postfixExpr: IExprInstruction = null;
//     let fieldName: string = '';
//     let fieldNameExpr: IIdExprInstruction = null;
//     let exprType: IVariableTypeInstruction = null;
//     let postfixExprType: IVariableTypeInstruction = null;

//     postfixExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

//     fieldName = children[children.length - 3].value;

//     fieldNameExpr = postfixExprType.getFieldExpr(fieldName);

//     if (isNull(fieldNameExpr)) {
//         _error(context, node, EEffectErrors.BAD_POSTIX_NOT_FIELD, {
//             typeName: postfixExprType.toString(),
//             fieldName: fieldName
//         });
//         return null;
//     }

//     exprType = <IVariableTypeInstruction>fieldNameExpr.type;
//     expr.type = (exprType);
//     expr.push(postfixExpr, true);
//     expr.push(fieldNameExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzePostfixArithmetic(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = children[0].value;
//     let expr: PostfixArithmeticInstruction = new PostfixArithmeticInstruction(node);
//     let postfixExpr: IExprInstruction;
//     let exprType: IVariableTypeInstruction;
//     let postfixExprType: IVariableTypeInstruction;

//     postfixExpr = analyzeExpr(context, scope, children[1]);
//     postfixExprType = <IVariableTypeInstruction>postfixExpr.type;

//     exprType = checkOneOperandExprType(context, node, operator, postfixExprType);

//     if (isNull(exprType)) {
//         _error(context, node, EEffectErrors.BAD_POSTIX_ARITHMETIC, {
//             operator: operator,
//             typeName: postfixExprType.toString()
//         });
//         return null;
//     }

//     expr.type = (exprType);
//     expr.operator = (operator);
//     expr.push(postfixExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeUnaryExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = children[1].value;
//     let expr: UnaryExprInstruction = new UnaryExprInstruction(node);
//     let unaryExpr: IExprInstruction;
//     let exprType: IVariableTypeInstruction;
//     let unaryExprType: IVariableTypeInstruction;

//     unaryExpr = analyzeExpr(context, scope, children[0]);
//     unaryExprType = <IVariableTypeInstruction>unaryExpr.type;

//     exprType = checkOneOperandExprType(context, node, operator, unaryExprType);

//     if (isNull(exprType)) {
//         _error(context, node, EEffectErrors.BAD_UNARY_OPERATION, <IEffectErrorInfo>{
//             operator: operator,
//             tyename: unaryExprType.toString()
//         });
//         return null;
//     }

//     expr.operator = (operator);
//     expr.type = (exprType);
//     expr.push(unaryExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeCastExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let expr: CastExprInstruction = new CastExprInstruction(node);
//     let exprType: IVariableTypeInstruction;
//     let castedExpr: IExprInstruction;

//     exprType = analyzeConstTypeDim(context, scope, children[2]);
//     castedExpr = analyzeExpr(context, scope, children[0]);

//     if (!(<IVariableTypeInstruction>castedExpr.type).readable) {
//         _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }

//     expr.type = (exprType);
//     expr.push(exprType, true);
//     expr.push(castedExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeConditionalExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let expr: ConditionalExprInstruction = new ConditionalExprInstruction(node);
//     let conditionExpr: IExprInstruction;
//     let trueExpr: IExprInstruction;
//     let falseExpr: IExprInstruction;
//     let conditionType: IVariableTypeInstruction;
//     let trueExprType: IVariableTypeInstruction;
//     let falseExprType: IVariableTypeInstruction;
//     let boolType: ITypeInstruction;

//     conditionExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     trueExpr = analyzeExpr(context, scope, children[children.length - 3]);
//     falseExpr = analyzeExpr(context, scope, children[0]);

//     conditionType = <IVariableTypeInstruction>conditionExpr.type;
//     trueExprType = <IVariableTypeInstruction>trueExpr.type;
//     falseExprType = <IVariableTypeInstruction>falseExpr.type;

//     boolType = getSystemType('bool');

//     if (!conditionType.isEqual(boolType)) {
//         _error(context, conditionExpr.sourceNode, EEffectErrors.BAD_CONDITION_TYPE, { typeName: conditionType.toString() });
//         return null;
//     }

//     if (!trueExprType.isEqual(falseExprType)) {
//         _error(context, trueExprType.sourceNode, EEffectErrors.BAD_CONDITION_VALUE_TYPES, <IEffectErrorInfo>{
//             leftTypeName: trueExprType.toString(),
//             rightTypeName: falseExprType.toString()
//         });
//         return null;
//     }

//     if (!conditionType.readable) {
//         _error(context, conditionType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }

//     if (!trueExprType.readable) {
//         _error(context, trueExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }

//     if (!falseExprType.readable) {
//         _error(context, falseExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }

//     expr.type = (trueExprType);
//     expr.push(conditionExpr, true);
//     expr.push(trueExpr, true);
//     expr.push(falseExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeArithmeticExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = node.children[1].value;
//     let expr: ArithmeticExprInstruction = new ArithmeticExprInstruction(node);
//     let leftExpr: IExprInstruction = null;
//     let rightExpr: IExprInstruction = null;
//     let leftType: IVariableTypeInstruction = null;
//     let rightType: IVariableTypeInstruction = null;
//     let exprType: IVariableTypeInstruction = null;

//     leftExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, scope, children[0]);

//     leftType = <IVariableTypeInstruction>leftExpr.type;
//     rightType = <IVariableTypeInstruction>rightExpr.type;

//     exprType = checkTwoOperandExprTypes(context, operator, leftType, rightType);

//     if (isNull(exprType)) {
//         _error(context, node, EEffectErrors.BAD_ARITHMETIC_OPERATION, <IEffectErrorInfo>{
//             operator: operator,
//             leftTypeName: leftType.toString(),
//             rightTypeName: rightType.toString()
//         });
//         return null;
//     }

//     expr.operator = (operator);
//     expr.type = (exprType);
//     expr.push(leftExpr, true);
//     expr.push(rightExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);
//     return expr;
// }


// function analyzeRelationExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = node.children[1].value;
//     let expr: RelationalExprInstruction = new RelationalExprInstruction(node);
//     let leftExpr: IExprInstruction;
//     let rightExpr: IExprInstruction;
//     let leftType: IVariableTypeInstruction;
//     let rightType: IVariableTypeInstruction;
//     let exprType: IVariableTypeInstruction;

//     leftExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, scope, children[0]);

//     leftType = <IVariableTypeInstruction>leftExpr.type;
//     rightType = <IVariableTypeInstruction>rightExpr.type;

//     exprType = checkTwoOperandExprTypes(context, operator, leftType, rightType);

//     if (isNull(exprType)) {
//         _error(context, node, EEffectErrors.BAD_RELATIONAL_OPERATION, <IEffectErrorInfo>{
//             operator: operator,
//             leftTypeName: leftType.hash,
//             rightTypeName: rightType.hash
//         });
//         return null;
//     }

//     expr.operator = (operator);
//     expr.type = (exprType);
//     expr.push(leftExpr, true);
//     expr.push(rightExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeLogicalExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = node.children[1].value;
//     let expr: LogicalExprInstruction = new LogicalExprInstruction(node);
//     let leftExpr: IExprInstruction;
//     let rightExpr: IExprInstruction;
//     let leftType: IVariableTypeInstruction;
//     let rightType: IVariableTypeInstruction;
//     let boolType: ITypeInstruction;

//     leftExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, scope, children[0]);

//     leftType = <IVariableTypeInstruction>leftExpr.type;
//     rightType = <IVariableTypeInstruction>rightExpr.type;

//     boolType = getSystemType('bool');

//     if (!leftType.isEqual(boolType)) {
//         _error(context, leftType.sourceNode, EEffectErrors.BAD_LOGICAL_OPERATION, {
//             operator: operator,
//             typeName: leftType.toString()
//         });
//         return null;
//     }
//     if (!rightType.isEqual(boolType)) {
//         _error(context, rightType.sourceNode, EEffectErrors.BAD_LOGICAL_OPERATION, {
//             operator: operator,
//             typeName: rightType.toString()
//         });
//         return null;
//     }

//     if (!leftType.readable) {
//         _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }

//     if (!rightType.readable) {
//         _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
//         return null;
//     }

//     expr.operator = (operator);
//     expr.type = ((<SystemTypeInstruction>boolType).variableType);
//     expr.push(leftExpr, true);
//     expr.push(rightExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeAssignmentExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = children[1].value;
//     let expr: AssignmentExprInstruction = new AssignmentExprInstruction(node);
//     let leftExpr: IExprInstruction;
//     let rightExpr: IExprInstruction;
//     let leftType: IVariableTypeInstruction;
//     let rightType: IVariableTypeInstruction;
//     let exprType: IVariableTypeInstruction;

//     leftExpr = analyzeExpr(context, scope, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, scope, children[0]);

//     leftType = <IVariableTypeInstruction>leftExpr.type;
//     rightType = <IVariableTypeInstruction>rightExpr.type;

//     if (operator !== '=') {
//         exprType = checkTwoOperandExprTypes(context, operator, leftType, rightType);
//         if (isNull(exprType)) {
//             _error(context, node, EEffectErrors.BAD_ARITHMETIC_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
//                 operator: operator,
//                 leftTypeName: leftType.hash,
//                 rightTypeName: rightType.hash
//             });
//         }
//     }
//     else {
//         exprType = rightType;
//     }

//     exprType = checkTwoOperandExprTypes(context, '=', leftType, exprType);

//     if (isNull(exprType)) {
//         _error(context, node, EEffectErrors.BAD_ASSIGNMENT_OPERATION, <IEffectErrorInfo>{
//             leftTypeName: leftType.hash,
//             rightTypeName: rightType.hash
//         });
//     }

//     expr.operator = (operator);
//     expr.type = (exprType);
//     expr.push(leftExpr, true);
//     expr.push(rightExpr, true);

//     checkInstruction(context, expr, ECheckStage.CODE_TARGET_SUPPORT);

//     return expr;
// }


// function analyzeIdExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let name: string = node.value;
//     let variable: IVariableDeclInstruction = getVariable(scope, name);

//     if (isNull(variable)) {
//         _error(context, node, EEffectErrors.UNKNOWN_VARNAME, { varName: name });
//         return null;
//     }

//     if (!isNull(context.currentFunction)) {
//         // TODO: rewrite this!
//         if (!variable.pixel) {
//             context.currentFunction.pixel = false;
//         }
//         if (!variable.vertex) {
//             context.currentFunction.vertex = false;
//         }
//     }

//     let varId: IdExprInstruction = new IdExprInstruction(node);
//     varId.push(variable.nameID, false);

//     checkInstruction(context, varId, ECheckStage.CODE_TARGET_SUPPORT);

//     return varId;
// }


// function analyzeSimpleExpr(context: Context, scope: ProgramScope, node: IParseNode): IExprInstruction {

//     let instruction: ILiteralInstruction = null;
//     const name: string = node.name;
//     const value: string = node.value;

//     switch (name) {
//         case 'T_UINT':
//             instruction = new IntInstruction(node);
//             instruction.value = ((<number><any>value) * 1);
//             break;
//         case 'T_FLOAT':
//             instruction = new FloatInstruction(node);
//             instruction.value = ((<number><any>value) * 1.0);
//             break;
//         case 'T_STRING':
//             instruction = new StringInstruction(node);
//             instruction.value = (value);
//             break;
//         case 'T_KW_TRUE':
//             instruction = new BoolInstruction(node);
//             instruction.value = (true);
//             break;
//         case 'T_KW_FALSE':
//             instruction = new BoolInstruction(node);
//             instruction.value = (false);
//             break;
//     }

//     return instruction;
// }



// function analyzeConstTypeDim(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {

//     const children: IParseNode[] = node.children;

//     if (children.length > 1) {
//         _error(context, node, EEffectErrors.BAD_CAST_TYPE_USAGE);
//         return null;
//     }

//     let type: IVariableTypeInstruction;

//     type = <IVariableTypeInstruction>(analyzeType(context, scope, children[0]));

//     if (!type.isBase()) {
//         _error(context, node, EEffectErrors.BAD_CAST_TYPE_NOT_BASE, { typeName: type.toString() });
//     }

//     checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);

//     return type;
// }


// function analyzeVarStructDecl(context: Context, scope: ProgramScope, node: IParseNode, instruction: IInstruction = null): void {

//     const children: IParseNode[] = node.children;
//     let usageType: IVariableTypeInstruction = null;
//     let variable: IVariableDeclInstruction = null;
//     let i: number = 0;

//     usageType = analyzeUsageStructDecl(context, scope, children[children.length - 1]);

//     for (i = children.length - 2; i >= 1; i--) {
//         if (children[i].name === 'Variable') {
//             variable = analyzeVariable(context, scope, children[i], usageType);

//             if (!isNull(instruction)) {
//                 instruction.push(variable, true);
//             }
//         }
//     }
// }


// function analyzeUsageStructDecl(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {

//     let children: IParseNode[] = node.children;
//     let i: number = 0;
//     let type: IVariableTypeInstruction = new VariableTypeInstruction(node);

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'StructDecl') {
//             const mainType: ITypeInstruction = analyzeStructDecl(context, scope, children[i]);
//             type.pushType(mainType);

//             const typeDecl: ITypeDeclInstruction = new TypeDeclInstruction(null);
//             typeDecl.push(mainType, true);

//             addTypeDecl(context, scope, typeDecl);
//         }
//         else if (children[i].name === 'Usage') {
//             const usage: string = analyzeUsage(children[i]);
//             type.addUsage(usage);
//         }
//     }

//     checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);
//     return type;
// }


// function analyzeStruct(context: Context, scope: ProgramScope, node: IParseNode): ITypeInstruction {
//     const children: IParseNode[] = node.children;

//     const struct: ComplexTypeInstruction = new ComplexTypeInstruction(node);
//     const fieldCollector: IInstruction = new InstructionCollector();

//     scope.push(EScopeType.k_Struct);

//     let i: number = 0;
//     for (i = children.length - 4; i >= 1; i--) {
//         if (children[i].name === 'VariableDecl') {
//             analyzeVariableDecl(context, scope, children[i], fieldCollector);
//         }
//     }

//     scope.pop();
//     struct.addFields(fieldCollector, true);

//     checkInstruction(context, struct, ECheckStage.CODE_TARGET_SUPPORT);
//     return struct;
// }


// function analyzeFunctionDeclOnlyDefinition(context: Context, scope: ProgramScope, node: IParseNode): IFunctionDeclInstruction {

//     const children: IParseNode[] = node.children;
//     let func: FunctionDeclInstruction = null;
//     let funcDef: FunctionDefInstruction = null;
//     let annotation: IAnnotationInstruction = null;
//     const sLastNodeValue: string = children[0].value;
//     let bNeedAddFunction: boolean = false;

//     funcDef = analyzeFunctionDef(context, scope, children[children.length - 1]);
//     func = <FunctionDeclInstruction>findFunctionByDef(scope, funcDef);

//     if (!isDef(func)) {
//         _error(context, node, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: func.nameID.toString() });
//         return null;
//     }

//     if (!isNull(func) && func.implementation) {
//         _error(context, node, EEffectErrors.BAD_REDEFINE_FUNCTION, { funcName: func.nameID.toString() });
//         return null;
//     }

//     if (isNull(func)) {
//         func = new FunctionDeclInstruction(null);
//         bNeedAddFunction = true;
//     }
//     else {
//         if (!func.returnType.isEqual(funcDef.returnType)) {
//             _error(context, node, EEffectErrors.BAD_FUNCTION_DEF_RETURN_TYPE, { funcName: func.nameID.toString() });
//             return null;
//         }

//         bNeedAddFunction = false;
//     }

//     func.definition = (<IDeclInstruction>funcDef);

//     scope.restore();

//     if (children.length === 3) {
//         annotation = analyzeAnnotation(children[1]);
//         func.annotation = (annotation);
//     }

//     if (sLastNodeValue !== ';') {
//         func.implementationScope = (scope.current);
//         context.functionWithImplementationList.push(func);
//     }

//     scope.pop();

//     if (bNeedAddFunction) {
//         addFunctionDecl(context, scope, node, func);
//     }

//     return func;
// }


// function resumeFunctionAnalysis(context: Context, scope: ProgramScope, pAnalzedFunction: IFunctionDeclInstruction): void {
//     const func: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
//     const node: IParseNode = func.sourceNode;

//     scope.current = func.implementationScope;

//     const children: IParseNode[] = node.children;
//     let stmtBlock: StmtBlockInstruction = null;

//     context.currentFunction = func;
//     context.haveCurrentFunctionReturnOccur = false;

//     stmtBlock = <StmtBlockInstruction>analyzeStmtBlock(context, scope, children[0]);
//     func.implementation = <IStmtInstruction>stmtBlock;

//     if (!func.returnType.isEqual(getSystemType('void')) && !context.haveCurrentFunctionReturnOccur) {
//         _error(context, node, EEffectErrors.BAD_FUNCTION_DONT_HAVE_RETURN_STMT, { funcName: func.nameID.toString() })
//     }

//     context.currentFunction = null;
//     context.haveCurrentFunctionReturnOccur = false;

//     scope.pop();

//     checkInstruction(context, func, ECheckStage.CODE_TARGET_SUPPORT);
// }


// function analyzeFunctionDef(context: Context, scope: ProgramScope, node: IParseNode): FunctionDefInstruction {
//     const children: IParseNode[] = node.children;
//     const funcDef: FunctionDefInstruction = new FunctionDefInstruction(node);
//     let returnType: IVariableTypeInstruction = null;
//     let funcName: IIdInstruction = null;
//     const nameNode = children[children.length - 2];
//     const funcName: string = nameNode.value;

//     const pRetTypeNode = children[children.length - 1];
//     returnType = analyzeUsageType(context, scope, pRetTypeNode);

//     if (returnType.isContainSampler()) {
//         _error(context, pRetTypeNode, EEffectErrors.BAD_RETURN_TYPE_FOR_FUNCTION, { funcName: funcName });
//         return null;
//     }

//     funcName = new IdInstruction(nameNode);
//     funcName.name = (funcName);
//     funcName.realName = (funcName + '_' + '0000'); // TODO: use uniq guid <<

//     funcDef.returnType = (returnType);
//     funcDef.functionName = (funcName);

//     if (children.length === 4) {
//         const semantics: string = analyzeSemantic(children[0]);
//         funcDef.semantics = (semantics);
//     }

//     scope.push(EScopeType.k_Default);

//     analyzeParamList(context, scope, children[children.length - 3], funcDef);

//     scope.pop();

//     checkInstruction(context, funcDef, ECheckStage.CODE_TARGET_SUPPORT);

//     return funcDef;
// }


// function analyzeParamList(context: Context, scope: ProgramScope, node: IParseNode, funcDef: FunctionDefInstruction): void {

//     const children: IParseNode[] = node.children;
//     let param: IVariableDeclInstruction;

//     let i: number = 0;

//     for (i = children.length - 2; i >= 1; i--) {
//         if (children[i].name === 'ParameterDecl') {
//             param = analyzeParameterDecl(context, scope, children[i]);
//             param.scope = (scope.current);
//             funcDef.addParameter(param, scope.isStrictMode());
//         }
//     }
// }


// function analyzeParameterDecl(context: Context, scope: ProgramScope, node: IParseNode): IVariableDeclInstruction {

//     const children: IParseNode[] = node.children;
//     let type: IVariableTypeInstruction = null;
//     let param: IVariableDeclInstruction = null;

//     type = analyzeParamUsageType(context, scope, children[1]);
//     param = analyzeVariable(context, scope, children[0], type);

//     return param;
// }


// function analyzeParamUsageType(context: Context, scope: ProgramScope, node: IParseNode): IVariableTypeInstruction {
//     const children: IParseNode[] = node.children;
//     let i: number = 0;
//     const type: IVariableTypeInstruction = new VariableTypeInstruction(node);

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'Type') {
//             const mainType: ITypeInstruction = analyzeType(context, scope, children[i]);
//             type.pushType(mainType);
//         }
//         else if (children[i].name === 'ParamUsage') {
//             const usage: string = analyzeUsage(children[i]);
//             type.addUsage(usage);
//         }
//     }

//     checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);

//     return type;
// }


// function analyzeStmtBlock(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const stmtBlock: StmtBlockInstruction = new StmtBlockInstruction(node);
//     let stmt: IStmtInstruction;
//     let i: number = 0;

//     stmtBlock.scope = (scope.current);

//     scope.push(EScopeType.k_Default);

//     for (i = children.length - 2; i > 0; i--) {
//         stmt = analyzeStmt(context, scope, children[i]);
//         if (!isNull(stmt)) {
//             stmtBlock.push(stmt);
//         }
//     }

//     scope.pop();

//     checkInstruction(context, stmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

//     return stmtBlock;
// }


// function analyzeStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'SimpleStmt':
//             return analyzeSimpleStmt(context, scope, children[0]);
//         case 'UseDecl':
//             analyzeUseDecl(context, scope, children[0]);
//             return null;
//         case 'T_KW_WHILE':
//             return analyzeWhileStmt(context, scope, node);
//         case 'T_KW_FOR':
//             return analyzeForStmt(context, scope, node);
//         case 'T_KW_IF':
//             return analyzeIfStmt(context, scope, node);
//     }
//     return null;
// }


// function analyzeSimpleStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'T_KW_RETURN':
//             return analyzeReturnStmt(context, scope, node);

//         case 'T_KW_DO':
//             return analyzeWhileStmt(context, scope, node);

//         case 'StmtBlock':
//             return analyzeStmtBlock(context, scope, children[0]);

//         case 'T_KW_DISCARD':
//         case 'T_KW_BREAK':
//         case 'T_KW_CONTINUE':
//             return analyzeBreakStmt(context, scope, node);

//         case 'TypeDecl':
//         case 'VariableDecl':
//         case 'VarStructDecl':
//             return analyzeDeclStmt(context, scope, children[0]);

//         default:
//             if (children.length === 2) {
//                 return analyzeExprStmt(context, scope, node);
//             }
//             else {
//                 return new SemicolonStmtInstruction(node);
//             }
//     }
// }


// function analyzeReturnStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const pReturnStmtInstruction: ReturnStmtInstruction = new ReturnStmtInstruction(node);

//     const funcReturnType: IVariableTypeInstruction = context.currentFunction.returnType;

//     context.haveCurrentFunctionReturnOccur = true;

//     if (funcReturnType.isEqual(getSystemType('void')) && children.length === 3) {
//         _error(context, node, EEffectErrors.BAD_RETURN_STMT_VOID);
//         return null;
//     }
//     else if (!funcReturnType.isEqual(getSystemType('void')) && children.length === 2) {
//         _error(context, node, EEffectErrors.BAD_RETURN_STMT_EMPTY);
//         return null;
//     }

//     if (children.length === 3) {
//         const exprInstruction: IExprInstruction = analyzeExpr(context, scope, children[1]);

//         if (!funcReturnType.isEqual(exprInstruction.type)) {
//             _error(context, node, EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
//             return null;
//         }

//         pReturnStmtInstruction.push(exprInstruction, true);
//     }

//     checkInstruction(context, pReturnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pReturnStmtInstruction;
// }


// function analyzeBreakStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const pBreakStmtInstruction: BreakStmtInstruction = new BreakStmtInstruction(node);
//     const sOperatorName: string = children[1].value;

//     pBreakStmtInstruction.operator = (sOperatorName);

//     if (sOperatorName === 'discard' && !isNull(context.currentFunction)) {
//         context.currentFunction.vertex = (false);
//     }

//     checkInstruction(context, pBreakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pBreakStmtInstruction;
// }


// function analyzeDeclStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     // let children: IParseNode[] = node.children;
//     const sNodeName: string = node.name;
//     const pDeclStmtInstruction: DeclStmtInstruction = new DeclStmtInstruction(node);

//     switch (sNodeName) {
//         case 'TypeDecl':
//             analyzeTypeDecl(context, scope, node, pDeclStmtInstruction);
//             break;
//         case 'VariableDecl':
//             analyzeVariableDecl(context, scope, node, pDeclStmtInstruction);
//             break;
//         case 'VarStructDecl':
//             analyzeVarStructDecl(context, scope, node, pDeclStmtInstruction);
//             break;
//     }

//     checkInstruction(context, pDeclStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pDeclStmtInstruction;
// }


// function analyzeExprStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const exprStmtInstruction: ExprStmtInstruction = new ExprStmtInstruction(node);
//     const exprInstruction: IExprInstruction = analyzeExpr(context, scope, children[1]);

//     exprStmtInstruction.push(exprInstruction, true);

//     checkInstruction(context, exprStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return exprStmtInstruction;
// }


// function analyzeWhileStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const isDoWhile: boolean = (children[children.length - 1].value === 'do');
//     const isNonIfStmt: boolean = (node.name === 'NonIfStmt') ? true : false;

//     const whileStmt: WhileStmtInstruction = new WhileStmtInstruction(node);
//     let condition: IExprInstruction = null;
//     let conditionType: IVariableTypeInstruction = null;
//     const boolType: ITypeInstruction = getSystemType('bool');
//     let stmt: IStmtInstruction = null;

//     if (isDoWhile) {
//         whileStmt.operator = ('do_while');
//         condition = analyzeExpr(context, scope, children[2]);
//         conditionType = <IVariableTypeInstruction>condition.type;

//         if (!conditionType.isEqual(boolType)) {
//             _error(context, node, EEffectErrors.BAD_DO_WHILE_CONDITION, { typeName: conditionType.toString() });
//             return null;
//         }

//         stmt = analyzeStmt(context, scope, children[0]);
//     }
//     else {
//         whileStmt.operator = ('while');
//         condition = analyzeExpr(context, scope, children[2]);
//         conditionType = <IVariableTypeInstruction>condition.type;

//         if (!conditionType.isEqual(boolType)) {
//             _error(context, node, EEffectErrors.BAD_WHILE_CONDITION, { typeName: conditionType.toString() });
//             return null;
//         }

//         if (isNonIfStmt) {
//             stmt = analyzeNonIfStmt(context, scope, children[0]);
//         }
//         else {
//             stmt = analyzeStmt(context, scope, children[0]);
//         }

//         whileStmt.push(condition, true);
//         whileStmt.push(stmt, true);
//     }

//     checkInstruction(context, whileStmt, ECheckStage.CODE_TARGET_SUPPORT);

//     return whileStmt;
// }


// function analyzeIfStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const isIfElse: boolean = (children.length === 7);

//     const ifStmtInstruction: IfStmtInstruction = new IfStmtInstruction(node);
//     const condition: IExprInstruction = analyzeExpr(context, scope, children[children.length - 3]);
//     const conditionType: IVariableTypeInstruction = <IVariableTypeInstruction>condition.type;
//     const boolType: ITypeInstruction = getSystemType('bool');

//     let ifStmt: IStmtInstruction = null;
//     let elseStmt: IStmtInstruction = null;

//     if (!conditionType.isEqual(boolType)) {
//         _error(context, node, EEffectErrors.BAD_IF_CONDITION, { typeName: conditionType.toString() });
//         return null;
//     }

//     ifStmtInstruction.push(condition, true);

//     if (isIfElse) {
//         ifStmtInstruction.operator = ('if_else');
//         ifStmt = analyzeNonIfStmt(context, scope, children[2]);
//         elseStmt = analyzeStmt(context, scope, children[0]);

//         ifStmtInstruction.push(ifStmt, true);
//         ifStmtInstruction.push(elseStmt, true);
//     }
//     else {
//         ifStmtInstruction.operator = ('if');
//         ifStmt = analyzeNonIfStmt(context, scope, children[0]);

//         ifStmtInstruction.push(ifStmt, true);
//     }

//     checkInstruction(context, ifStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return ifStmtInstruction;
// }


// function analyzeNonIfStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'SimpleStmt':
//             return analyzeSimpleStmt(context, scope, children[0]);
//         case 'T_KW_WHILE':
//             return analyzeWhileStmt(context, scope, node);
//         case 'T_KW_FOR':
//             return analyzeForStmt(context, scope, node);
//     }
//     return null;
// }


// function analyzeForStmt(context: Context, scope: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children: IParseNode[] = node.children;
//     const isNonIfStmt: boolean = (node.name === 'NonIfStmt');
//     const pForStmtInstruction: ForStmtInstruction = new ForStmtInstruction(node);
//     let stmt: IStmtInstruction = null;

//     scope.push();

//     analyzeForInit(context, scope, children[children.length - 3], pForStmtInstruction);
//     analyzeForCond(context, scope, children[children.length - 4], pForStmtInstruction);

//     if (children.length === 7) {
//         analyzeForStep(context, scope, children[2], pForStmtInstruction);
//     }
//     else {
//         pForStmtInstruction.push(null);
//     }


//     if (isNonIfStmt) {
//         stmt = analyzeNonIfStmt(context, scope, children[0]);
//     }
//     else {
//         stmt = analyzeStmt(context, scope, children[0]);
//     }

//     pForStmtInstruction.push(stmt, true);

//     scope.pop();

//     checkInstruction(context, pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pForStmtInstruction;
// }


// function analyzeForInit(context: Context, scope: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

//     const children: IParseNode[] = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'VariableDecl':
//             analyzeVariableDecl(context, scope, children[0], pForStmtInstruction);
//             break;
//         case 'Expr':
//             const expr: IExprInstruction = analyzeExpr(context, scope, children[0]);
//             pForStmtInstruction.push(expr, true);
//             break;
//         default:
//             // ForInit : ';'
//             pForStmtInstruction.push(null);
//             break;
//     }

//     return;
// }


// function analyzeForCond(context: Context, scope: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

//     const children: IParseNode[] = node.children;

//     if (children.length === 1) {
//         pForStmtInstruction.push(null);
//         return;
//     }

//     const conditionExpr: IExprInstruction = analyzeExpr(context, scope, children[1]);

//     pForStmtInstruction.push(conditionExpr, true);
//     return;
// }


// function analyzeForStep(context: Context, scope: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

//     const children: IParseNode[] = node.children;
//     const pSteexpr: IExprInstruction = analyzeExpr(context, scope, children[0]);

//     pForStmtInstruction.push(pSteexpr, true);

//     return;
// }




function analyzeTechniqueForImport(context: Context, scope: ProgramScope, node: IParseNode): void {
    const children: IParseNode[] = node.children;
    const name: string = analyzeComplexName(children[children.length - 2]);
    // Specifies whether name should be interpreted as globalNamespace.name or just a name;
    const isComplexName: boolean = children[children.length - 2].children.length !== 1;
    const scopeId = scope.current;

    let annotation: IAnnotationInstruction = null;
    let semantics: string = null;
    let passList: IPassInstruction[] = [];

    for (let i: number = children.length - 3; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else {
            // analyzeTechniqueBodyForImports(context, scope, children[i], technique);
        }
    }

    const technique = new TechniqueInstruction({ name, semantics, annotation, passList, scopeId });
    addTechnique(context, scope, technique);
}



// function analyzeTechniqueBodyForImports(context: Context, scope: ProgramScope, node: IParseNode, technique: ITechniqueInstruction): void {

//     const children: IParseNode[] = node.children;

//     for (let i: number = children.length - 2; i >= 1; i--) {
//         analyzePassDeclForImports(context, scope, children[i], technique);
//     }
// }


// function analyzePassDeclForImports(context: Context, scope: ProgramScope, node: IParseNode, technique: ITechniqueInstruction): void {

//     const children: IParseNode[] = node.children;

//     if (children[0].name === 'ImportDecl') {
//         analyzeImportDecl(context, children[0], technique);
//     }
//     else if (children.length > 1) {
//         const pPass: IPassInstruction = new PassInstruction(node);
//         //TODO: add annotation and id
//         analyzePassStateBlockForShaders(context, scope, children[0], pPass);

//         technique.addPass(pPass);
//     }
// }


// function analyzePassStateBlockForShaders(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

//     const children: IParseNode[] = node.children;

//     for (let i: number = children.length - 2; i >= 1; i--) {
//         analyzePassStateForShader(context, scope, children[i], pPass);
//     }
// }


// function analyzePassStateForShader(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

//     const children: IParseNode[] = node.children;

//     const sType: string = children[children.length - 1].value.toUpperCase();
//     let eShaderType: EFunctionType = EFunctionType.k_Vertex;

//     if (sType === 'VERTEXSHADER') {
//         eShaderType = EFunctionType.k_Vertex
//     }
//     else if (sType === 'PIXELSHADER') {
//         eShaderType = EFunctionType.k_Pixel;
//     }
//     else {
//         console.error('unknown shader type');
//         return;
//     }

//     const stateExprNode: IParseNode = children[children.length - 3];
//     const exprNode: IParseNode = stateExprNode.children[stateExprNode.children.length - 1];
//     const pCompileExpr: CompileExprInstruction = <CompileExprInstruction>analyzeExpr(context, scope, exprNode);
//     const shaderFunc: IFunctionDeclInstruction = pCompileExpr.function;

//     if (eShaderType === EFunctionType.k_Vertex) {
//         if (!shaderFunc.checkDefenitionForVertexUsage()) {
//             _error(context, node, EEffectErrors.BAD_FUNCTION_VERTEX_DEFENITION, { funcDef: shaderFunc.toString() });
//         }
//     }
//     else {
//         if (!shaderFunc.checkDefenitionForPixelUsage()) {
//             _error(context, node, EEffectErrors.BAD_FUNCTION_PIXEL_DEFENITION, { funcDef: shaderFunc.toString() });
//         }
//     }

//     shaderFunc.markUsedAs(eShaderType);
// }


// function analyzePassStateIfForShader(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {

//     const children: IParseNode[] = node.children;

//     if (children.length === 5) {
//         analyzePassStateBlockForShaders(context, scope, children[0], pPass);
//     }
//     else if (children.length === 7 && children[0].name === 'PassStateBlock') {
//         analyzePassStateBlockForShaders(context, scope, children[2], pPass);
//         analyzePassStateBlockForShaders(context, scope, children[0], pPass);
//     }
//     else {
//         analyzePassStateBlockForShaders(context, scope, children[2], pPass);
//         analyzePassStateIfForShader(context, scope, children[0], pPass);
//     }
// }



function resumeTechniqueAnalysis(context: Context, scope: ProgramScope, technique: ITechniqueInstruction): void {
    const passList: IPassInstruction[] = technique.passList;
    for (let i = 0; i < passList.length; i++) {
        resumePassAnalysis(context, scope, passList[i]);
    }
}


function resumePassAnalysis(context: Context, scope: ProgramScope, pPass: IPassInstruction): void {
    const node: IParseNode = pPass.sourceNode;
    const children: IParseNode[] = node.children;
    analyzePassStateBlock(context, scope, children[0], pPass);
    pPass.finalizePass(); // << generate info about used variables.
}


function analyzePassStateBlock(context: Context, scope: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {
    const children: IParseNode[] = node.children;
    for (let i = children.length - 2; i >= 1; i--) {
        // analyzePassState(context, scope, children[i], pPass);
    }
}


function analyzePassState(context: Context, scope: ProgramScope, node: IParseNode): IMap<ERenderStateValues> {

    let renderStates: IMap<ERenderStateValues> = {};
    const children: IParseNode[] = node.children;

    const stateType: string = children[children.length - 1].value.toUpperCase();
    const stateName: ERenderStates = getRenderState(stateType);
    const stateExprNode: IParseNode = children[children.length - 3];
    const exprNode: IParseNode = stateExprNode.children[stateExprNode.children.length - 1];

    if (isNull(exprNode.value) || isNull(stateName)) {
        logger.warn('Pass state is incorrect.');
        return {};
    }

    if (exprNode.value === '{' && stateExprNode.children.length > 3) {
        const values: ERenderStateValues[] = new Array(Math.ceil((stateExprNode.children.length - 2) / 2));
        for (let i: number = stateExprNode.children.length - 2, j: number = 0; i >= 1; i -= 2, j++) {
            values[j] = getRenderStateValue(stateName, stateExprNode.children[i].value.toUpperCase());
        }

        switch (stateName) {
            case ERenderStates.BLENDFUNC:
                if (values.length !== 2) {
                    logger.warn('Pass state are incorrect.');
                    return {};
                }
                renderStates[ERenderStates.SRCBLENDCOLOR] = values[0];
                renderStates[ERenderStates.SRCBLENDALPHA] = values[0];
                renderStates[ERenderStates.DESTBLENDCOLOR] = values[1];
                renderStates[ERenderStates.DESTBLENDALPHA] = values[1];
                break;

            case ERenderStates.BLENDFUNCSEPARATE:
                if (values.length !== 4) {
                    logger.warn('Pass state are incorrect.');
                    return {};
                }
                renderStates[ERenderStates.SRCBLENDCOLOR] = values[0];
                renderStates[ERenderStates.SRCBLENDALPHA] = values[2];
                renderStates[ERenderStates.DESTBLENDCOLOR] = values[1];
                renderStates[ERenderStates.DESTBLENDALPHA] = values[3];
                break;

            case ERenderStates.BLENDEQUATIONSEPARATE:
                if (values.length !== 2) {
                    logger.warn('Pass state are incorrect.');
                    return {};
                }
                renderStates[ERenderStates.BLENDEQUATIONCOLOR] = values[0];
                renderStates[ERenderStates.BLENDEQUATIONALPHA] = values[1];
                break;

            default:
                logger.warn('Pass state is incorrect.');
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


function analyzeImportDecl(context: Context, node: IParseNode, technique: ITechniqueInstruction = null): void {
    const children: IParseNode[] = node.children;
    const sComponentName: string = analyzeComplexName(children[children.length - 2]);
    // let iShift: number = 0;

    if (children[0].name === 'ExtOpt') {
        logger.warn('We don`t suppor ext-commands for import');
    }
    if (children.length !== 2) {
        // iShift = analyzeShiftOpt(children[0]);
    }

    if (!isNull(technique)) {
        //We can import techniques from the same file, but on this stage they don`t have component yet.
        //So we need special mehanism to add them on more belated stage
        // let sShortedComponentName: string = sComponentName;
        if (context.namespace !== '') {
            // sShortedComponentName = sComponentName.replace(_sProvideNameSpace + ".", "");
        }

        throw null;
        // let pTechniqueFromSameEffect: ITechniqueInstruction = _pTechniqueMap[sComponentName] || _pTechniqueMap[sShortedComponentName];
        // if (isDefAndNotNull(pTechniqueFromSameEffect)) {
        //     technique._addTechniqueFromSameEffect(pTechniqueFromSameEffect, iShift);
        //     return;
        // }
    }

    const sourceTechnique: ITechniqueInstruction = null;//fx.techniques[sComponentName];
    if (!sourceTechnique) {
        _error(context, node, EEffectErrors.BAD_IMPORTED_COMPONENT_NOT_EXIST, { componentName: sComponentName });
        return;
    }

    throw null;
}


// function analyzeStructDecl(context: Context, scope: ProgramScope, node: IParseNode): ITypeInstruction {
//     const children: IParseNode[] = node.children;

//     const struct: ComplexTypeInstruction = new ComplexTypeInstruction(node);
//     const fieldCollector: IInstruction = new InstructionCollector();

//     const name: string = children[children.length - 2].value;

//     struct.name = name;

//     scope.push(EScopeType.k_Struct);

//     let i: number = 0;
//     for (i = children.length - 4; i >= 1; i--) {
//         if (children[i].name === 'VariableDecl') {
//             analyzeVariableDecl(context, scope, children[i], fieldCollector);
//         }
//     }

//     scope.pop();

//     struct.addFields(fieldCollector, true);

//     checkInstruction(context, struct, ECheckStage.CODE_TARGET_SUPPORT);
//     return struct;
// }


// function analyzeTypeDecl(context: Context, scope: ProgramScope, node: IParseNode, pParentInstruction: IInstruction = null): ITypeDeclInstruction {
//     let children: IParseNode[] = node.children;

//     let typeDeclInstruction: ITypeDeclInstruction = new TypeDeclInstruction(node);

//     if (children.length === 2) {
//         const pStructInstruction: ComplexTypeInstruction = <ComplexTypeInstruction>analyzeStructDecl(context, scope, children[1]);
//         typeDeclInstruction.push(pStructInstruction, true);
//     }
//     else {
//         _error(context, node, EEffectErrors.UNSUPPORTED_TYPEDECL);
//     }

//     checkInstruction(context, typeDeclInstruction, ECheckStage.CODE_TARGET_SUPPORT);
//     addTypeDecl(context, scope, typeDeclInstruction);

//     if (!isNull(pParentInstruction)) {
//         pParentInstruction.push(typeDeclInstruction, true);
//     }

//     return typeDeclInstruction;
// }


// function analyzeGlobalTypeDecls(context: Context, scope: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'TypeDecl') {
//             analyzeTypeDecl(context, scope, children[i]);
//         }
//     }
// }


// function analyzeFunctionDefinitions(context: Context, scope: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'FunctionDecl') {
//             analyzeFunctionDeclOnlyDefinition(context, scope, children[i]);
//         }
//     }
// }


// function analyzeGlobalImports(context: Context, scope: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'ImportDecl') {
//             analyzeImportDecl(context, children[i], null);
//         }
//     }
// }


function analyzeTechniqueImports(context: Context, scope: ProgramScope, ast: IParseTree): void {
    let children: IParseNode[] = ast.getRoot().children;
    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'TechniqueDecl') {
            analyzeTechniqueForImport(context, scope, children[i]);
        }
    }
}


// function analyzeVariableDecls(context: Context, scope: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'VariableDecl') {
//             analyzeVariableDecl(context, scope, children[i]);
//         }
//         else if (children[i].name === 'VarStructDecl') {
//             analyzeVarStructDecl(context, scope, children[i]);
//         }
//     }
// }


// function analyzeFunctionDecls(context: Context, scope: ProgramScope): void {
//     for (let i: number = 0; i < context.functionWithImplementationList.length; i++) {
//         resumeFunctionAnalysis(context, scope, context.functionWithImplementationList[i]);
//     }

//     checkFunctionsForRecursion(context);
//     checkFunctionForCorrectUsage(context);
//     generateInfoAboutUsedData(context);
//     generateShadersFromFunctions(context);
// }


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
    public filename: string | null = null;
    public namespace: string | null = null;
    public functionWithImplementationList: IFunctionDeclInstruction[] = [];
    public techniqueMap: IMap<ITechniqueInstruction> = {};
    
    public currentFunction: IFunctionDeclInstruction | null = null;
    public haveCurrentFunctionReturnOccur: boolean = false;

    constructor(filename: string) {
        this.filename = filename;
    }
}


export function analyze(filename: string, ast: IParseTree): boolean {
    const context: Context = new Context(filename);

    const scope: ProgramScope = new ProgramScope();

    console.time(`analyze(${filename})`);

    try {
        scope.push();

        analyzeGlobalUseDecls(context, scope, ast);
        analyzeGlobalProvideDecls(context, scope, ast);
        // analyzeGlobalTypeDecls(context, scope, ast);
        // analyzeFunctionDefinitions(context, scope, ast);
        // analyzeGlobalImports(context, scope, ast);
        analyzeTechniqueImports(context, scope, ast);
        // analyzeVariableDecls(context, scope, ast);
        // analyzeFunctionDecls(context, scope);
        analyzeTechniques(context, scope);

        scope.pop();
    }
    catch (e) {
        throw e;
    }

    // todo: return false in case of error!

    console.timeEnd(`analyze(${filename})`);

    return true;
}


