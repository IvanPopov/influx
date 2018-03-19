import { IPosition } from "./../idl/parser/IParser";
import { IProvideInstructionSettings, ProvideInstruction } from "./instructions/ProvideInstruction";
import { ISamplerStateInstructionSettings, SamplerStateInstruction } from "./instructions/SamplerStateInstruction";
import { IParseNode, IParseTree } from '../idl/parser/IParser';
import {
    IInstruction, IFunctionDeclInstruction, IPassInstruction, ISimpleInstruction,
    IVariableDeclInstruction, ITechniqueInstruction, ITypedInstruction,
    IVariableTypeInstruction, IIdInstruction, ITypeInstruction, ITypeDeclInstruction,
    IInstructionError, IExprInstruction, EFunctionType, EInstructionTypes, ECheckStage,
    IAnnotationInstruction, IInitExprInstruction, IIdExprInstruction, IStmtInstruction,
    IDeclInstruction, ILiteralInstruction, ISamplerStateInstruction, IInstructionCollector, IProvideInstruction, EScopeType, IFunctionCallInstruction, IConstructorCallInstruction
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
import { ExprTemplateTranslator } from './ExprTemplateTranslator';
import { EEffectErrors, EEffectTempErrors } from '../idl/EEffectErrors';
import { logger } from '../logger';
import { ISourceLocation, ILoggerEntity } from '../idl/ILogger';
import { FunctionDefInstruction } from './instructions/FunctionDefInstruction';
import { InitExprInstruction } from './instructions/InitExprInstruction';
import { CompileExprInstruction } from './instructions/CompileExprInstruction';
import { SamplerStateBlockInstruction, SamplerOperator } from './instructions/SamplerStateBlockInstruction';
import { FunctionCallInstruction } from './instructions/FunctionCallInstruction';
import { IdExprInstruction } from './instructions/IdExprInstruction';
import { FunctionDeclInstruction } from './instructions/FunctionDeclInstruction';
import { SystemCallInstruction } from './instructions/SystemCallInstruction';
import { ComplexExprInstruction } from './instructions/ComplexExprInstruction';
import { ConstructorCallInstruction } from './instructions/ConstructorCallInstruction';
import { PostfixIndexInstruction } from './instructions/PostfixIndexInstruction';
import { PostfixArithmeticInstruction, PostfixOperator } from './instructions/PostfixArithmeticInstruction';
import { UnaryExprInstruction, UnaryOperator } from './instructions/UnaryExprInstruction';
import { ConditionalExprInstruction } from './instructions/ConditionalExprInstruction';
import { ArithmeticExprInstruction, ArithmeticOperator } from './instructions/ArithmeticExprInstruction';
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
import { ProgramScope, Scope } from './ProgramScope';
import { PostfixPointInstruction } from './instructions/PostfixPointInstruction';


const TEMPLATE_TYPE = 'template';


function validate(instr: IInstruction, expectedType: EInstructionTypes) {
    assert(instr.instructionType === expectedType);
}

function resolveNodeSourceLocation(node: IParseNode): IPosition | null {
    if (!isDefAndNotNull(node)) {
        return null;
    }

    if (isDef(node.loc)) {
        return { line: node.loc.start.line, column: node.loc.start.column };
    }

    return resolveNodeSourceLocation(node.children[node.children.length - 1]);
}


const systemScope = new Scope({ type: EScopeType.k_System });
const systemFunctionHashMap: IMap<boolean> = {};


function generateSystemType(name: string, elementType: ITypeInstruction = null,
    length: number = 1, fields: IVariableDeclInstruction[] = []): SystemTypeInstruction {

    if (getSystemType(name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    const scope = systemScope;
    const type = new SystemTypeInstruction({ scope, name, elementType, length, fields });
    const decl = new TypeDeclInstruction({ scope, type: VariableTypeInstruction.wrap(type, scope) });
    systemScope.addType(decl);

    return type;
}



function addFieldsToVectorFromSuffixObject(fields: IVariableDeclInstruction[], suffixMap: IMap<boolean>, baseType: string) {
    for (let suffix in suffixMap) {
        const fieldTypeName = baseType + ((suffix.length > 1) ? suffix.length.toString() : '');
        const fieldBaseType = getSystemType(fieldTypeName);

        assert(fieldBaseType);

        const scope = systemScope;
        const fieldId = new IdInstruction({ scope, name: suffix });
        const fieldType = new VariableTypeInstruction({ scope, type: fieldBaseType, writable: suffixMap[suffix] })

        fields.push(new VariableDeclInstruction({ scope, id: fieldId, type: fieldType }));
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
        for (let i = 0; i < pLiterals.length; i++) {
            pOutput[pLiterals[i]] = true;
        }

        iDepth = 1;
    }

    const pOutputKeys: string[] = Object.keys(pOutput);

    for (let i = 0; i < pLiterals.length; i++) {
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

    const scope = systemScope;
    const exprTranslator = new ExprTemplateTranslator(translationExpr);
    const builtIn = true;

    if (!isNull(templateTypes)) {
        for (let i = 0; i < templateTypes.length; i++) {
            let argTypes: ITypeInstruction[] = [];
            let funcHash = name + "(";
            let returnType = (returnTypeName === TEMPLATE_TYPE) ?
                getSystemType(templateTypes[i]) :
                getSystemType(returnTypeName);


            for (let j: number = 0; j < argsTypes.length; j++) {
                if (argsTypes[j] === TEMPLATE_TYPE) {
                    argTypes.push(getSystemType(templateTypes[i]));
                    funcHash += templateTypes[i] + ",";
                }
                else {
                    argTypes.push(getSystemType(argsTypes[j]));
                    funcHash += argsTypes[j] + ","
                }
            }

            funcHash += ")";

            if (systemFunctionHashMap[funcHash]) {
                _error(null, null, EEffectErrors.BAD_SYSTEM_FUNCTION_REDEFINE, { funcName: funcHash });
            }

            
            let id = new IdInstruction({ scope, name });
            let func = new SystemFunctionInstruction({ scope, id, returnType, exprTranslator, argTypes, builtIn });
            
            func.$makeVertexCompatible(isForVertex);
            func.$makePixelCompatible(isForPixel);
            
            systemFunctionHashMap[funcHash] = true;
            systemScope.addFunction(func);
        }
    }
    else {
        if (returnTypeName === TEMPLATE_TYPE) {
            logger.critical("Bad return type(TEMPLATE_TYPE) for system function '" + name + "'.");
        }

        let returnType = getSystemType(returnTypeName);
        let argTypes = [];
        let functionHash = name + "(";

        for (let i = 0; i < argsTypes.length; i++) {
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

        let id = new IdInstruction({ scope, name });
        let func = new SystemFunctionInstruction({ scope, id, returnType, exprTranslator, argTypes, builtIn });

        func.$makeVertexCompatible(isForVertex);
        func.$makePixelCompatible(isForPixel);

        systemFunctionHashMap[functionHash] = true;
        systemScope.addFunction(func);
    }
}


function generateNotBuiltInSystemFuction(name: string, definition: string, implementation: string,
    returnTypeName: string,
    usedTypes: string[],
    usedFunctions: string[]): void {

    if (systemScope.hasFunction(name)) {
        console.warn(`Builtin function ${name} already exists.`);
        return;
    }

    const scope = systemScope;

    let builtIn = false;
    let returnType = getSystemType(returnTypeName);
    let id = new IdInstruction({ scope, name })
    let func = new SystemFunctionInstruction({ scope, id, returnType, definition, implementation, builtIn });

    let usedExtSystemTypes: ITypeDeclInstruction[] = [];
    let usedExtSystemFunctions: IFunctionDeclInstruction[] = [];

    if (!isNull(usedTypes)) {
        for (let i = 0; i < usedTypes.length; i++) {
            let typeDecl: ITypeDeclInstruction = <ITypeDeclInstruction>getSystemType(usedTypes[i]).parent;
            if (!isNull(typeDecl)) {
                usedExtSystemTypes.push(typeDecl);
            }
        }
    }

    if (!isNull(usedFunctions)) {
        for (let i = 0; i < usedFunctions.length; i++) {
            let pFindFunction: IFunctionDeclInstruction = systemScope.findFunction(usedFunctions[i]);
            usedExtSystemFunctions.push(pFindFunction);
        }
    }

    func.$setUsedSystemData(usedExtSystemTypes, usedExtSystemFunctions);
    func.$closeSystemDataInfo();

    systemScope.addFunction(func);
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
    addSystemTypeScalar();
    addSystemTypeVector();
    addSystemTypeMatrix();
}


function initSystemFunctions(): void {
    addSystemFunctions();
}


function generateSystemVariable(name: string, typeName: string,
    isForVertex: boolean, isForPixel: boolean, readonly: boolean): void {

    const scope = systemScope;

    if (systemScope.hasVariable(name)) {
        return;
    }

    let id = new IdInstruction({ scope, name });
    let type = new VariableTypeInstruction({ scope, type: getSystemType(typeName), writable: readonly });
    let variableDecl = new VariableDeclInstruction({ scope, id, type, builtIn: true });

    variableDecl.$makeVertexCompatible(isForVertex);
    variableDecl.$makePixelCompatible(isForPixel);

    systemScope.addVariable(variableDecl);
}


function addSystemVariables(): void {
    // generateSystemVariable('fragColor', 'gl_FragColor', 'float4', false, true, true);
    // generateSystemVariable('fragCoord', 'gl_FragCoord', 'float4', false, true, true);
    // generateSystemVariable('frontFacing', 'gl_FrontFacing', 'bool', false, true, true);
    // generateSystemVariable('pointCoord', 'gl_PointCoord', 'float2', false, true, true);
}


function initSystemVariables(): void {
    addSystemVariables();
}



function findConstructor(type: ITypeInstruction, args: IExprInstruction[]): IVariableTypeInstruction {
    return new VariableTypeInstruction({ type, scope: null });
}


function findFunctionByDef(program: ProgramScope, pDef: FunctionDefInstruction): IFunctionDeclInstruction {
    return program.findFunction(pDef.name, pDef.paramList);
}



function getSystemType(typeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    let type = systemScope.findType(typeName);
    validate(type, EInstructionTypes.k_SystemTypeInstruction);
    return <SystemTypeInstruction>type;
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


function analyzeUseDecl(context: Context, program: ProgramScope, node: IParseNode): void {
    program.currentScope.strictMode = true;
}


function analyzeComplexName(node: IParseNode): string {
    const children = node.children;
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
function analyzeGlobalUseDecls(context: Context, program: ProgramScope, ast: IParseTree): void {
    let children: IParseNode[] = ast.getRoot().children;
    let i: number = 0;

    for (i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'UseDecl') {
            analyzeUseDecl(context, program, children[i]); // << always 'use strict' by default!
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
function analyzeProvideDecl(context: Context, program: ProgramScope, node: IParseNode): IProvideInstruction {
    const children = node.children;
    const scope = program.currentScope;

    if (children.length === 3) {
        let moduleName = analyzeComplexName(children[1]);;
        if (!isNull(context.moduleName)) {
            console.warn(`Context module overriding detected '${context.moduleName}' => '${module}'`);
        }
        context.moduleName = moduleName;
        assert(children[2].name === 'T_KW_PROVIDE');
        return new ProvideInstruction({ moduleName, scope });
    }
    
    _error(context, node, EEffectTempErrors.UNSUPPORTED_PROVIDE_AS);
    return null;
}




function analyzeGlobalProvideDecls(context: Context, program: ProgramScope, ast: IParseTree): void {
    let children: IParseNode[] = ast.getRoot().children;
    let i: number = 0;

    for (i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'ProvideDecl') {
            analyzeProvideDecl(context, program, children[i]);
        }
    }
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



function _errorFromInstruction(context: Context, node: IParseNode, pError: IInstructionError): void {
    _error(context, node, pError.code, isNull(pError.info) ? {} : pError.info);
}


function checkInstruction<INSTR_T extends IInstruction>(context: Context, inst: INSTR_T, stage: ECheckStage): INSTR_T {
    if (!inst._check(stage)) {
        _errorFromInstruction(context, inst.sourceNode, inst._getLastError());
        return null;
    }
    return inst;
}


// function addVariableDecl(context: Context, program: ProgramScope, variable: IVariableDeclInstruction): void {
//     if (isSystemVariable(variable)) {
//         _error(context, variable.sourceNode, EEffectErrors.REDEFINE_SYSTEM_VARIABLE, { varName: variable.name });
//     }

//     let isVarAdded: boolean = program.addVariable(variable);

//     if (!isVarAdded) {
//         let eScopeType: EScopeType = program.type;

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


// function addTypeDecl(context: Context, program: ProgramScope, type: ITypeDeclInstruction): void {
//     if (isSystemType(type)) {
//         _error(context, type.sourceNode, EEffectErrors.REDEFINE_SYSTEM_TYPE, { typeName: type.name });
//     }

//     let isTypeAdded: boolean = program.addType(type);

//     if (!isTypeAdded) {
//         _error(context, type.sourceNode, EEffectErrors.REDEFINE_TYPE, { typeName: type.name });
//     }
// }


// function addFunctionDecl(context: Context, program: ProgramScope, node: IParseNode, func: IFunctionDeclInstruction): void {
//     if (isSystemFunction(func)) {
//         _error(context, node, EEffectErrors.REDEFINE_SYSTEM_FUNCTION, { funcName: func.name });
//     }

//     let isFunctionAdded: boolean = program.addFunction(func);

//     if (!isFunctionAdded) {
//         _error(context, node, EEffectErrors.REDEFINE_FUNCTION, { funcName: func.name });
//     }
// }


function addTechnique(context: Context, program: ProgramScope, technique: ITechniqueInstruction): void {
    let name: string = technique.name;

    if (program.globalScope.hasTechnique(name)) {
        _error(context, technique.sourceNode, EEffectErrors.BAD_TECHNIQUE_REDEFINE_NAME, { techName: name });
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
    const isSampler = isSamplerType(leftType) || isSamplerType(rightType);
    const boolType = <IVariableTypeInstruction>systemScope.findType('bool');

    if (isArray || isSampler) {
        return null;
    }

    if (operator === '%' || operator === '%=') {
        return null;
    }

    if (isAssignmentOperator(operator)) {
        if (!leftType.writable) {
            _error(context, leftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        if (!rightType.readable) {
            _error(context, rightType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (operator !== '=' && !leftType.readable) {
            _error(context, leftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        }
    }
    else {
        if (!leftType.readable) {
            _error(context, leftType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
            return null;
        }

        if (!rightType.readable) {
            _error(context, rightType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
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

    const leftBaseType: IVariableTypeInstruction = (<SystemTypeInstruction>leftType.baseType).variableType;
    const rightBaseType: IVariableTypeInstruction = (<SystemTypeInstruction>rightType.baseType).variableType;


    if (leftType.isConst() && isAssignmentOperator(operator)) {
        return null;
    }

    if (leftType.isEqual(rightType)) {
        if (isArithmeticalOperator(operator)) {
            if (!isMatrixType(leftType) || (operator !== '/' && operator !== '/=')) {
                return leftBaseType;
            }
            else {
                return null;
            }
        }
        else if (isRelationalOperator(operator)) {
            if (isScalarType(leftType)) {
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
        if (isBoolBasedType(leftType) || isBoolBasedType(rightType) ||
            isFloatBasedType(leftType) !== isFloatBasedType(rightType) ||
            isIntBasedType(leftType) !== isIntBasedType(rightType)) {
            return null;
        }

        if (isScalarType(leftType)) {
            return rightBaseType;
        }

        if (isScalarType(rightType)) {
            return leftBaseType;
        }

        if (operator === '*' || operator === '*=') {
            if (isMatrixType(leftType) && isVectorType(rightType) &&
                leftType.length === rightType.length) {
                return rightBaseType;
            }
            else if (isMatrixType(rightType) && isVectorType(leftType) &&
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
    const isSampler = isSamplerType(type);

    if (isComplex || isArray || isSampler) {
        return null;
    }

    if (!type.readable) {
        _error(context, sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }


    if (operator === '++' || operator === '--') {
        if (!type.writable) {
            _error(context, sourceNode, EEffectErrors.BAD_TYPE_FOR_WRITE);
            return null;
        }

        return type;
    }

    if (operator === '!') {
        const boolType = <IVariableTypeInstruction>systemScope.findType('bool');
        validate(boolType, EInstructionTypes.k_VariableDeclInstruction);

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


function analyzeVariableDecl(context: Context, program: ProgramScope, node: IParseNode, instruction: IInstruction = null): void {
    let children: IParseNode[] = node.children;
    let generalType: IVariableTypeInstruction = null;
    let variable: IVariableDeclInstruction = null;
    let i: number = 0;

    generalType = analyzeUsageType(context, program, children[children.length - 1]);

    for (i = children.length - 2; i >= 1; i--) {
        if (children[i].name === 'Variable') {
            variable = analyzeVariable(context, program, children[i], generalType);

            if (!isNull(instruction)) {
                instruction.push(variable, true);
                if (instruction.instructionType === EInstructionTypes.k_DeclStmtInstruction) {
                    let variableSubDecls: IVariableDeclInstruction[] = variable.vars;
                    if (!isNull(variableSubDecls)) {
                        for (let j: number = 0; j < variableSubDecls.length; j++) {
                            instruction.push(variableSubDecls[j], false);
                        }
                    }
                }
            }
        }
    }
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


function analyzeType(context: Context, program: ProgramScope, sourceNode: IParseNode): ITypeInstruction {
    const children = sourceNode.children;
    const scope = program.currentScope;

    let type: ITypeInstruction = null;

    switch (sourceNode.name) {
        case 'T_TYPE_ID':
            type = scope.findType(sourceNode.value);

            if (isNull(type)) {
                _error(context, sourceNode, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: sourceNode.value });
            }
            break;
        case 'Struct':
            type = analyzeStruct(context, program, sourceNode);
            break;

        case 'T_KW_VOID':
            type = scope.findType('void');
            break;

        case 'ScalarType':
        case 'ObjectType':
            type = scope.findType(children[children.length - 1].value);

            if (isNull(type)) {
                _error(context, sourceNode, EEffectErrors.BAD_TYPE_NAME_NOT_TYPE, { typeName: children[children.length - 1].value });
            }

            break;

        case 'VectorType':
        case 'MatrixType':
            _error(context, sourceNode, EEffectErrors.BAD_TYPE_VECTOR_MATRIX);
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

    let id = analyzeVariableDimId(context, program, children[children.length - 1]);
    let arrayIndex = analyzeVariableDimArrayIndex(context, program, children[children.length - 1]);
    let type = new VariableTypeInstruction({ scope, sourceNode, type: generalType, arrayIndex });

    for (let i = children.length - 2; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else if (children[i].name === 'Initializer') {
            init = analyzeInitializer(context, program, children[i]);
            if (!init.optimizeForVariableType(type)) {
                _error(context, sourceNode, EEffectErrors.BAD_VARIABLE_INITIALIZER, { varName: id.name });
                return null;
            }
        }
    }
    
    const varDecl = new VariableDeclInstruction({ sourceNode, scope, type, init, id, semantics, annotation });
    varDecl.fillNameIndex();
    addVariableDecl(context, program, varDecl);
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
 */
function analyzeVariableDimId(context: Context, program: ProgramScope, sourceNode: IParseNode): IIdInstruction {
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
function analyzeVariableDimArrayIndex(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
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
        for (let i: number = children.length - 3; i >= 1; i--) {
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
            _error(context, sourceNode, EEffectErrors.UNSUPPORTED_EXPR, { exprName: name });
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
function analyzeObjectExpr(context: Context, program: ProgramScope, node: IParseNode): IExprInstruction {
    let name = node.children[node.children.length - 1].name;

    switch (name) {
        case 'T_KW_COMPILE':
            return analyzeCompileExpr(context, program, node);
        case 'T_KW_SAMPLER_STATE':
            return analyzeSamplerStateBlock(context, program, node);
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
        _error(context, sourceNode, EEffectErrors.BAD_COMPILE_NOT_FUNCTION, { funcName: shaderFuncName });
        return null;
    }

    let type =  VariableTypeInstruction.wrap(<IVariableTypeInstruction>shaderFunc.definition.returnType, scope);

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
        _error(context, sourceNode, EEffectErrors.NOT_SUPPORT_STATE_INDEX);
        return null;
    }

    let stateExprNode = children[children.length - 3];
    let subStateExprNode = stateExprNode.children[stateExprNode.children.length - 1];
    let stateType = children[children.length - 1].value.toUpperCase();
    let stateValue = '';
    let scope = program.currentScope;

    if (isNull(subStateExprNode.value)) {
        _error(context, subStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
        return null;
    }

    switch (stateType) {
        case 'TEXTURE':
            if (stateExprNode.children.length !== 3 || subStateExprNode.value === '{') {
                _error(context, subStateExprNode, EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
                return null;
            }

            let texNameNode = stateExprNode.children[1];
            let texName = texNameNode.value;
            if (isNull(texName) || !program.findVariable(texName)) {
                _error(context, stateExprNode.children[1], EEffectErrors.BAD_TEXTURE_FOR_SAMLER);
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
                    logger.warn('Webgl don`t support this wrapmode: ' + stateValue);
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
                    logger.warn('Webgl don`t support this texture filter: ' + stateValue);
                    return null;
            }
            break;

        default:
            // todo: move to erros api
            logger.warn('Don`t support this texture param: ' + stateType);
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


function analyzeFunctionCallExpr(context: Context, program: ProgramScope, node: IParseNode): IFunctionCallInstruction {
    const children = node.children;
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
        _error(context, node, EEffectErrors.BAD_COMPLEX_NOT_FUNCTION, { funcName: funcName });
        return null;
    }

    if (!isDef(func)) {
        _error(context, node, EEffectErrors.BAD_CANNOT_CHOOSE_FUNCTION, { funcName: funcName });
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

    if (func.instructionType === EInstructionTypes.k_FunctionDeclInstruction) {
        if (!isNull(args)) {
        
            const funcArguments = func.definition.paramList;

            for (let i = 0; i < args.length; i++) {
                if (funcArguments[i].type.hasUsage('out')) {
                    if (!args[i].type.writable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }
                } else if (funcArguments[i].type.hasUsage('inout')) {
                    if (!args[i].type.writable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_WRITE);
                        return null;
                    }

                    if (!args[i].type.readable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
                        return null;
                    }
                } else {
                    if (!args[i].type.readable) {
                        _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
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

        // if (!isNull(currentAnalyzedFunction)) 
        {
            for (let i = 0; i < args.length; i++) {
                if (!args[i].type.readable) {
                    _error(context, node, EEffectErrors.BAD_TYPE_FOR_READ);
                    return null;
                }
            }
        }

        // if (!func.builtIn && !isNull(currentAnalyzedFunction)) {
        //     currentAnalyzedFunction.addUsedFunction(func);
        // }

        const systemCallExpr = new SystemCallInstruction({ scope, decl: <SystemFunctionInstruction>func, args  });
        expr = systemCallExpr;
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
        _error(context, sourceNode, EEffectErrors.BAD_COMPLEX_NOT_TYPE);
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

    const exprType = findConstructor(ctorType, args);

    if (isNull(exprType)) {
        _error(context, sourceNode, EEffectErrors.BAD_COMPLEX_NOT_CONSTRUCTOR, { typeName: ctorType.toString() });
        return null;
    }

    if (!isNull(args)) {
        for (let i = 0; i < args.length; i++) {
            if (!args[i].type.readable) {
                _error(context, sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
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
        _error(context, sourceNode, EEffectErrors.BAD_POSTIX_NOT_ARRAY, { typeName: postfixExprType.toString() });
        return null;
    }

    const indexExpr = analyzeExpr(context, program, children[children.length - 3]);
    const indexExprType = <IVariableTypeInstruction>indexExpr.type;

    const intType = systemScope.findType('int');

    if (!indexExprType.isEqual(intType)) {
        _error(context, sourceNode, EEffectErrors.BAD_POSTIX_NOT_INT_INDEX, { typeName: indexExprType.toString() });
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
        _error(context, sourceNode, EEffectErrors.BAD_POSTIX_NOT_FIELD, {
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
        _error(context, sourceNode, EEffectErrors.BAD_POSTIX_ARITHMETIC, {
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
        _error(context, sourceNode, EEffectErrors.BAD_UNARY_OPERATION, <IEffectErrorInfo>{
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
        _error(context, sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
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

    const boolType = systemScope.findType('bool');

    if (!conditionType.isEqual(boolType)) {
        _error(context, conditionExpr.sourceNode, EEffectErrors.BAD_CONDITION_TYPE, { typeName: conditionType.toString() });
        return null;
    }

    if (!leftExprType.isEqual(rightExprType)) {
        _error(context, leftExprType.sourceNode, EEffectErrors.BAD_CONDITION_VALUE_TYPES, <IEffectErrorInfo>{
            leftTypeName: leftExprType.toString(),
            rightTypeName: rightExprType.toString()
        });
        return null;
    }

    if (!conditionType.readable) {
        _error(context, conditionType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!leftExprType.readable) {
        _error(context, leftExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    if (!rightExprType.readable) {
        _error(context, rightExprType.sourceNode, EEffectErrors.BAD_TYPE_FOR_READ);
        return null;
    }

    const condExpr = new ConditionalExprInstruction({ scope, sourceNode, cond: conditionExpr, left: leftExpr, right: rightExpr});
    return  checkInstruction(context, condExpr, ECheckStage.CODE_TARGET_SUPPORT);;
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
        _error(context, sourceNode, EEffectErrors.BAD_ARITHMETIC_OPERATION, <IEffectErrorInfo>{
            operator: operator,
            leftTypeName: leftType.toString(),
            rightTypeName: rightType.toString()
        });
        return null;
    }

    const arithmeticExpr = new ArithmeticExprInstruction({ scope, sourceNode, left, right, operator, type });
    return checkInstruction(context, arithmeticExpr, ECheckStage.CODE_TARGET_SUPPORT);
}


// function analyzeRelationExpr(context: Context, program: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = node.children[1].value;
//     let expr: RelationalExprInstruction = new RelationalExprInstruction(node);
//     let leftExpr: IExprInstruction;
//     let rightExpr: IExprInstruction;
//     let leftType: IVariableTypeInstruction;
//     let rightType: IVariableTypeInstruction;
//     let exprType: IVariableTypeInstruction;

//     leftExpr = analyzeExpr(context, program, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, program, children[0]);

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


// function analyzeLogicalExpr(context: Context, program: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = node.children[1].value;
//     let expr: LogicalExprInstruction = new LogicalExprInstruction(node);
//     let leftExpr: IExprInstruction;
//     let rightExpr: IExprInstruction;
//     let leftType: IVariableTypeInstruction;
//     let rightType: IVariableTypeInstruction;
//     let boolType: ITypeInstruction;

//     leftExpr = analyzeExpr(context, program, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, program, children[0]);

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


// function analyzeAssignmentExpr(context: Context, program: ProgramScope, node: IParseNode): IExprInstruction {

//     let children: IParseNode[] = node.children;
//     let operator: string = children[1].value;
//     let expr: AssignmentExprInstruction = new AssignmentExprInstruction(node);
//     let leftExpr: IExprInstruction;
//     let rightExpr: IExprInstruction;
//     let leftType: IVariableTypeInstruction;
//     let rightType: IVariableTypeInstruction;
//     let exprType: IVariableTypeInstruction;

//     leftExpr = analyzeExpr(context, program, children[children.length - 1]);
//     rightExpr = analyzeExpr(context, program, children[0]);

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


// function analyzeIdExpr(context: Context, program: ProgramScope, node: IParseNode): IExprInstruction {

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


function analyzeSimpleExpr(context: Context, program: ProgramScope, sourceNode: IParseNode): IExprInstruction {
    const name = sourceNode.name;
    const value = sourceNode.value;
    const scope = program.currentScope;

    switch (name) {
        // case 'T_INT': // << todo
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
function analyzeConstTypeDim(context: Context, program: ProgramScope, node: IParseNode): IVariableTypeInstruction {

    const children = node.children;

    if (children.length > 1) {
        _error(context, node, EEffectErrors.BAD_CAST_TYPE_USAGE);
        return null;
    }

    const type = <IVariableTypeInstruction>(analyzeType(context, program, children[0]));

    if (!type.isBase()) {
        _error(context, node, EEffectErrors.BAD_CAST_TYPE_NOT_BASE, { typeName: type.toString() });
    }

    return checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);
}


// function analyzeVarStructDecl(context: Context, program: ProgramScope, node: IParseNode, instruction: IInstruction = null): void {

//     const children = node.children;
//     let usageType: IVariableTypeInstruction = null;
//     let variable: IVariableDeclInstruction = null;
//     let i: number = 0;

//     usageType = analyzeUsageStructDecl(context, program, children[children.length - 1]);

//     for (i = children.length - 2; i >= 1; i--) {
//         if (children[i].name === 'Variable') {
//             variable = analyzeVariable(context, program, children[i], usageType);

//             if (!isNull(instruction)) {
//                 instruction.push(variable, true);
//             }
//         }
//     }
// }


// function analyzeUsageStructDecl(context: Context, program: ProgramScope, node: IParseNode): IVariableTypeInstruction {

//     let children: IParseNode[] = node.children;
//     let i: number = 0;
//     let type: IVariableTypeInstruction = new VariableTypeInstruction(node);

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'StructDecl') {
//             const mainType: ITypeInstruction = analyzeStructDecl(context, program, children[i]);
//             type.pushType(mainType);

//             const typeDecl: ITypeDeclInstruction = new TypeDeclInstruction(null);
//             typeDecl.push(mainType, true);

//             addTypeDecl(context, program, typeDecl);
//         }
//         else if (children[i].name === 'Usage') {
//             const usage: string = analyzeUsage(children[i]);
//             type.addUsage(usage);
//         }
//     }

//     checkInstruction(context, type, ECheckStage.CODE_TARGET_SUPPORT);
//     return type;
// }


function analyzeStruct(context: Context, program: ProgramScope, node: IParseNode): ITypeInstruction {
    const children = node.children;

    const struct: ComplexTypeInstruction = new ComplexTypeInstruction(node);
    const fieldCollector: IInstruction = new InstructionCollector();

    program.push(EScopeType.k_Struct);

    let i: number = 0;
    for (i = children.length - 4; i >= 1; i--) {
        if (children[i].name === 'VariableDecl') {
            analyzeVariableDecl(context, program, children[i], fieldCollector);
        }
    }

    program.pop();
    struct.addFields(fieldCollector, true);

    checkInstruction(context, struct, ECheckStage.CODE_TARGET_SUPPORT);
    return struct;
}


// function analyzeFunctionDeclOnlyDefinition(context: Context, program: ProgramScope, node: IParseNode): IFunctionDeclInstruction {

//     const children = node.children;
//     let func: FunctionDeclInstruction = null;
//     let funcDef: FunctionDefInstruction = null;
//     let annotation: IAnnotationInstruction = null;
//     const sLastNodeValue: string = children[0].value;
//     let bNeedAddFunction: boolean = false;

//     funcDef = analyzeFunctionDef(context, program, children[children.length - 1]);
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

//     program.restore();

//     if (children.length === 3) {
//         annotation = analyzeAnnotation(children[1]);
//         func.annotation = (annotation);
//     }

//     if (sLastNodeValue !== ';') {
//         func.implementationScope = (program.current);
//         context.functionWithImplementationList.push(func);
//     }

//     program.pop();

//     if (bNeedAddFunction) {
//         addFunctionDecl(context, program, node, func);
//     }

//     return func;
// }


// function resumeFunctionAnalysis(context: Context, program: ProgramScope, pAnalzedFunction: IFunctionDeclInstruction): void {
//     const func: FunctionDeclInstruction = <FunctionDeclInstruction>pAnalzedFunction;
//     const node: IParseNode = func.sourceNode;

//     program.current = func.implementationScope;

//     const children = node.children;
//     let stmtBlock: StmtBlockInstruction = null;

//     context.currentFunction = func;
//     context.haveCurrentFunctionReturnOccur = false;

//     stmtBlock = <StmtBlockInstruction>analyzeStmtBlock(context, program, children[0]);
//     func.implementation = <IStmtInstruction>stmtBlock;

//     if (!func.returnType.isEqual(getSystemType('void')) && !context.haveCurrentFunctionReturnOccur) {
//         _error(context, node, EEffectErrors.BAD_FUNCTION_DONT_HAVE_RETURN_STMT, { funcName: func.nameID.toString() })
//     }

//     context.currentFunction = null;
//     context.haveCurrentFunctionReturnOccur = false;

//     program.pop();

//     checkInstruction(context, func, ECheckStage.CODE_TARGET_SUPPORT);
// }


// function analyzeFunctionDef(context: Context, program: ProgramScope, node: IParseNode): FunctionDefInstruction {
//     const children = node.children;
//     const funcDef: FunctionDefInstruction = new FunctionDefInstruction(node);
//     let returnType: IVariableTypeInstruction = null;
//     let funcName: IIdInstruction = null;
//     const nameNode = children[children.length - 2];
//     const funcName: string = nameNode.value;

//     const pRetTypeNode = children[children.length - 1];
//     returnType = analyzeUsageType(context, program, pRetTypeNode);

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

//     program.push(EScopeType.k_Default);

//     analyzeParamList(context, program, children[children.length - 3], funcDef);

//     program.pop();

//     checkInstruction(context, funcDef, ECheckStage.CODE_TARGET_SUPPORT);

//     return funcDef;
// }


// function analyzeParamList(context: Context, program: ProgramScope, node: IParseNode, funcDef: FunctionDefInstruction): void {

//     const children = node.children;
//     let param: IVariableDeclInstruction;

//     let i: number = 0;

//     for (i = children.length - 2; i >= 1; i--) {
//         if (children[i].name === 'ParameterDecl') {
//             param = analyzeParameterDecl(context, program, children[i]);
//             param.scope = (program.current);
//             funcDef.addParameter(param, program.isStrictMode());
//         }
//     }
// }


// function analyzeParameterDecl(context: Context, program: ProgramScope, node: IParseNode): IVariableDeclInstruction {

//     const children = node.children;
//     let type: IVariableTypeInstruction = null;
//     let param: IVariableDeclInstruction = null;

//     type = analyzeParamUsageType(context, program, children[1]);
//     param = analyzeVariable(context, program, children[0], type);

//     return param;
// }


// function analyzeParamUsageType(context: Context, program: ProgramScope, node: IParseNode): IVariableTypeInstruction {
//     const children = node.children;
//     let i: number = 0;
//     const type: IVariableTypeInstruction = new VariableTypeInstruction(node);

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'Type') {
//             const mainType: ITypeInstruction = analyzeType(context, program, children[i]);
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


// function analyzeStmtBlock(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const stmtBlock: StmtBlockInstruction = new StmtBlockInstruction(node);
//     let stmt: IStmtInstruction;
//     let i: number = 0;

//     stmtBlock.scope = (program.current);

//     program.push(EScopeType.k_Default);

//     for (i = children.length - 2; i > 0; i--) {
//         stmt = analyzeStmt(context, program, children[i]);
//         if (!isNull(stmt)) {
//             stmtBlock.push(stmt);
//         }
//     }

//     program.pop();

//     checkInstruction(context, stmtBlock, ECheckStage.CODE_TARGET_SUPPORT);

//     return stmtBlock;
// }


// function analyzeStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'SimpleStmt':
//             return analyzeSimpleStmt(context, program, children[0]);
//         case 'UseDecl':
//             analyzeUseDecl(context, program, children[0]);
//             return null;
//         case 'T_KW_WHILE':
//             return analyzeWhileStmt(context, program, node);
//         case 'T_KW_FOR':
//             return analyzeForStmt(context, program, node);
//         case 'T_KW_IF':
//             return analyzeIfStmt(context, program, node);
//     }
//     return null;
// }


// function analyzeSimpleStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'T_KW_RETURN':
//             return analyzeReturnStmt(context, program, node);

//         case 'T_KW_DO':
//             return analyzeWhileStmt(context, program, node);

//         case 'StmtBlock':
//             return analyzeStmtBlock(context, program, children[0]);

//         case 'T_KW_DISCARD':
//         case 'T_KW_BREAK':
//         case 'T_KW_CONTINUE':
//             return analyzeBreakStmt(context, program, node);

//         case 'TypeDecl':
//         case 'VariableDecl':
//         case 'VarStructDecl':
//             return analyzeDeclStmt(context, program, children[0]);

//         default:
//             if (children.length === 2) {
//                 return analyzeExprStmt(context, program, node);
//             }
//             else {
//                 return new SemicolonStmtInstruction(node);
//             }
//     }
// }


// function analyzeReturnStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
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
//         const exprInstruction: IExprInstruction = analyzeExpr(context, program, children[1]);

//         if (!funcReturnType.isEqual(exprInstruction.type)) {
//             _error(context, node, EEffectErrors.BAD_RETURN_STMT_NOT_EQUAL_TYPES);
//             return null;
//         }

//         pReturnStmtInstruction.push(exprInstruction, true);
//     }

//     checkInstruction(context, pReturnStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pReturnStmtInstruction;
// }


// function analyzeBreakStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const pBreakStmtInstruction: BreakStmtInstruction = new BreakStmtInstruction(node);
//     const sOperatorName: string = children[1].value;

//     pBreakStmtInstruction.operator = (sOperatorName);

//     if (sOperatorName === 'discard' && !isNull(context.currentFunction)) {
//         context.currentFunction.vertex = (false);
//     }

//     checkInstruction(context, pBreakStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pBreakStmtInstruction;
// }


// function analyzeDeclStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     // let children: IParseNode[] = node.children;
//     const sNodeName: string = node.name;
//     const pDeclStmtInstruction: DeclStmtInstruction = new DeclStmtInstruction(node);

//     switch (sNodeName) {
//         case 'TypeDecl':
//             analyzeTypeDecl(context, program, node, pDeclStmtInstruction);
//             break;
//         case 'VariableDecl':
//             analyzeVariableDecl(context, program, node, pDeclStmtInstruction);
//             break;
//         case 'VarStructDecl':
//             analyzeVarStructDecl(context, program, node, pDeclStmtInstruction);
//             break;
//     }

//     checkInstruction(context, pDeclStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pDeclStmtInstruction;
// }


// function analyzeExprStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const exprStmtInstruction: ExprStmtInstruction = new ExprStmtInstruction(node);
//     const exprInstruction: IExprInstruction = analyzeExpr(context, program, children[1]);

//     exprStmtInstruction.push(exprInstruction, true);

//     checkInstruction(context, exprStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return exprStmtInstruction;
// }


// function analyzeWhileStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const isDoWhile: boolean = (children[children.length - 1].value === 'do');
//     const isNonIfStmt: boolean = (node.name === 'NonIfStmt') ? true : false;

//     const whileStmt: WhileStmtInstruction = new WhileStmtInstruction(node);
//     let condition: IExprInstruction = null;
//     let conditionType: IVariableTypeInstruction = null;
//     const boolType: ITypeInstruction = getSystemType('bool');
//     let stmt: IStmtInstruction = null;

//     if (isDoWhile) {
//         whileStmt.operator = ('do_while');
//         condition = analyzeExpr(context, program, children[2]);
//         conditionType = <IVariableTypeInstruction>condition.type;

//         if (!conditionType.isEqual(boolType)) {
//             _error(context, node, EEffectErrors.BAD_DO_WHILE_CONDITION, { typeName: conditionType.toString() });
//             return null;
//         }

//         stmt = analyzeStmt(context, program, children[0]);
//     }
//     else {
//         whileStmt.operator = ('while');
//         condition = analyzeExpr(context, program, children[2]);
//         conditionType = <IVariableTypeInstruction>condition.type;

//         if (!conditionType.isEqual(boolType)) {
//             _error(context, node, EEffectErrors.BAD_WHILE_CONDITION, { typeName: conditionType.toString() });
//             return null;
//         }

//         if (isNonIfStmt) {
//             stmt = analyzeNonIfStmt(context, program, children[0]);
//         }
//         else {
//             stmt = analyzeStmt(context, program, children[0]);
//         }

//         whileStmt.push(condition, true);
//         whileStmt.push(stmt, true);
//     }

//     checkInstruction(context, whileStmt, ECheckStage.CODE_TARGET_SUPPORT);

//     return whileStmt;
// }


// function analyzeIfStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const isIfElse: boolean = (children.length === 7);

//     const ifStmtInstruction: IfStmtInstruction = new IfStmtInstruction(node);
//     const condition: IExprInstruction = analyzeExpr(context, program, children[children.length - 3]);
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
//         ifStmt = analyzeNonIfStmt(context, program, children[2]);
//         elseStmt = analyzeStmt(context, program, children[0]);

//         ifStmtInstruction.push(ifStmt, true);
//         ifStmtInstruction.push(elseStmt, true);
//     }
//     else {
//         ifStmtInstruction.operator = ('if');
//         ifStmt = analyzeNonIfStmt(context, program, children[0]);

//         ifStmtInstruction.push(ifStmt, true);
//     }

//     checkInstruction(context, ifStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return ifStmtInstruction;
// }


// function analyzeNonIfStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'SimpleStmt':
//             return analyzeSimpleStmt(context, program, children[0]);
//         case 'T_KW_WHILE':
//             return analyzeWhileStmt(context, program, node);
//         case 'T_KW_FOR':
//             return analyzeForStmt(context, program, node);
//     }
//     return null;
// }


// function analyzeForStmt(context: Context, program: ProgramScope, node: IParseNode): IStmtInstruction {

//     const children = node.children;
//     const isNonIfStmt: boolean = (node.name === 'NonIfStmt');
//     const pForStmtInstruction: ForStmtInstruction = new ForStmtInstruction(node);
//     let stmt: IStmtInstruction = null;

//     program.push();

//     analyzeForInit(context, program, children[children.length - 3], pForStmtInstruction);
//     analyzeForCond(context, program, children[children.length - 4], pForStmtInstruction);

//     if (children.length === 7) {
//         analyzeForStep(context, program, children[2], pForStmtInstruction);
//     }
//     else {
//         pForStmtInstruction.push(null);
//     }


//     if (isNonIfStmt) {
//         stmt = analyzeNonIfStmt(context, program, children[0]);
//     }
//     else {
//         stmt = analyzeStmt(context, program, children[0]);
//     }

//     pForStmtInstruction.push(stmt, true);

//     program.pop();

//     checkInstruction(context, pForStmtInstruction, ECheckStage.CODE_TARGET_SUPPORT);

//     return pForStmtInstruction;
// }


// function analyzeForInit(context: Context, program: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

//     const children = node.children;
//     const firstNodeName: string = children[children.length - 1].name;

//     switch (firstNodeName) {
//         case 'VariableDecl':
//             analyzeVariableDecl(context, program, children[0], pForStmtInstruction);
//             break;
//         case 'Expr':
//             const expr: IExprInstruction = analyzeExpr(context, program, children[0]);
//             pForStmtInstruction.push(expr, true);
//             break;
//         default:
//             // ForInit : ';'
//             pForStmtInstruction.push(null);
//             break;
//     }

//     return;
// }


// function analyzeForCond(context: Context, program: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

//     const children = node.children;

//     if (children.length === 1) {
//         pForStmtInstruction.push(null);
//         return;
//     }

//     const conditionExpr: IExprInstruction = analyzeExpr(context, program, children[1]);

//     pForStmtInstruction.push(conditionExpr, true);
//     return;
// }


// function analyzeForStep(context: Context, program: ProgramScope, node: IParseNode, pForStmtInstruction: ForStmtInstruction): void {

//     const children = node.children;
//     const pSteexpr: IExprInstruction = analyzeExpr(context, program, children[0]);

//     pForStmtInstruction.push(pSteexpr, true);

//     return;
// }




function analyzeTechniqueForImport(context: Context, program: ProgramScope, node: IParseNode): void {
    const children = node.children;
    const name: string = analyzeComplexName(children[children.length - 2]);
    // Specifies whether name should be interpreted as globalNamespace.name or just a name;
    const isComplexName: boolean = children[children.length - 2].children.length !== 1;
    const scope = program.currentScope;

    let annotation: IAnnotationInstruction = null;
    let semantics: string = null;
    let passList: IPassInstruction[] = null;

    for (let i: number = children.length - 3; i >= 0; i--) {
        if (children[i].name === 'Annotation') {
            annotation = analyzeAnnotation(children[i]);
        } else if (children[i].name === 'Semantic') {
            semantics = analyzeSemantic(children[i]);
        } else {
            passList = analyzeTechnique(context, program, children[i]);
        }
    }

    const technique = new TechniqueInstruction({ name, semantics, annotation, passList, scope });
    addTechnique(context, program, technique);
}



function analyzeTechnique(context: Context, program: ProgramScope, node: IParseNode): IPassInstruction[] {
    const children = node.children;
    let passList: IPassInstruction[] = [];
    for (let i: number = children.length - 2; i >= 1; i--) {
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
    const renderStates = {};

    const pass = new PassInstruction({
        scope,
        sourceNode,
        renderStates,
        pixelShader: entry.pixel,
        vertexShader: entry.vertex
    });
    //TODO: add annotation and id

    return pass;
}


function analyzePassStateBlockForShaders(context: Context, program: ProgramScope,
    node: IParseNode): { vertex: IFunctionDeclInstruction; pixel: IFunctionDeclInstruction; } {

    const children = node.children;

    let pixel: IFunctionDeclInstruction = null;
    let vertex: IFunctionDeclInstruction = null;

    for (let i: number = children.length - 2; i >= 1; i--) {
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
    node: IParseNode): IFunctionDeclInstruction {

    const children = node.children;

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
            _error(context, node, EEffectErrors.BAD_FUNCTION_VERTEX_DEFENITION, { funcDef: shaderFunc.toString() });
        }
    }
    else {
        if (!FunctionDefInstruction.checkForPixelUsage(shaderFunc.definition)) {
            _error(context, node, EEffectErrors.BAD_FUNCTION_PIXEL_DEFENITION, { funcDef: shaderFunc.toString() });
        }
    }

    shaderFunc.$overwriteType(shaderType);
    return shaderFunc;
}


function resumeTechniqueAnalysis(context: Context, program: ProgramScope, technique: ITechniqueInstruction): void {
    const passList: IPassInstruction[] = technique.passList;
    for (let i = 0; i < passList.length; i++) {
        resumePassAnalysis(context, program, passList[i]);
    }
}


function resumePassAnalysis(context: Context, program: ProgramScope, pPass: IPassInstruction): void {
    const node: IParseNode = pPass.sourceNode;
    const children = node.children;
    analyzePassStateBlock(context, program, children[0], pPass);
    pPass.finalizePass(); // << generate info about used variables.
}


function analyzePassStateBlock(context: Context, program: ProgramScope, node: IParseNode, pPass: IPassInstruction): void {
    const children = node.children;
    for (let i = children.length - 2; i >= 1; i--) {
        // analyzePassState(context, program, children[i], pPass);
    }
}


function analyzePassState(context: Context, program: ProgramScope, node: IParseNode): IMap<ERenderStateValues> {

    let renderStates: IMap<ERenderStateValues> = {};
    const children = node.children;

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


function analyzeImportDecl(context: Context, program: ProgramScope, node: IParseNode, technique: ITechniqueInstruction = null): void {
    const children = node.children;
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
        if (!isNull(context.moduleName)) {
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


// function analyzeStructDecl(context: Context, program: ProgramScope, node: IParseNode): ITypeInstruction {
//     const children = node.children;

//     const struct: ComplexTypeInstruction = new ComplexTypeInstruction(node);
//     const fieldCollector: IInstruction = new InstructionCollector();

//     const name: string = children[children.length - 2].value;

//     struct.name = name;

//     program.push(EScopeType.k_Struct);

//     let i: number = 0;
//     for (i = children.length - 4; i >= 1; i--) {
//         if (children[i].name === 'VariableDecl') {
//             analyzeVariableDecl(context, program, children[i], fieldCollector);
//         }
//     }

//     program.pop();

//     struct.addFields(fieldCollector, true);

//     checkInstruction(context, struct, ECheckStage.CODE_TARGET_SUPPORT);
//     return struct;
// }


// function analyzeTypeDecl(context: Context, program: ProgramScope, node: IParseNode, pParentInstruction: IInstruction = null): ITypeDeclInstruction {
//     let children: IParseNode[] = node.children;

//     let typeDeclInstruction: ITypeDeclInstruction = new TypeDeclInstruction(node);

//     if (children.length === 2) {
//         const pStructInstruction: ComplexTypeInstruction = <ComplexTypeInstruction>analyzeStructDecl(context, program, children[1]);
//         typeDeclInstruction.push(pStructInstruction, true);
//     }
//     else {
//         _error(context, node, EEffectErrors.UNSUPPORTED_TYPEDECL);
//     }

//     checkInstruction(context, typeDeclInstruction, ECheckStage.CODE_TARGET_SUPPORT);
//     addTypeDecl(context, program, typeDeclInstruction);

//     if (!isNull(pParentInstruction)) {
//         pParentInstruction.push(typeDeclInstruction, true);
//     }

//     return typeDeclInstruction;
// }


// function analyzeGlobalTypeDecls(context: Context, program: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'TypeDecl') {
//             analyzeTypeDecl(context, program, children[i]);
//         }
//     }
// }


// function analyzeFunctionDefinitions(context: Context, program: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'FunctionDecl') {
//             analyzeFunctionDeclOnlyDefinition(context, program, children[i]);
//         }
//     }
// }


// function analyzeGlobalImports(context: Context, program: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'ImportDecl') {
//             analyzeImportDecl(context, children[i], null);
//         }
//     }
// }


function analyzeTechniqueImports(context: Context, program: ProgramScope, ast: IParseTree): void {
    let children: IParseNode[] = ast.getRoot().children;
    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].name === 'TechniqueDecl') {
            analyzeTechniqueForImport(context, program, children[i]);
        }
    }
}


// function analyzeVariableDecls(context: Context, program: ProgramScope, ast: IParseTree): void {
//     let children: IParseNode[] = ast.getRoot().children;
//     let i: number = 0;

//     for (i = children.length - 1; i >= 0; i--) {
//         if (children[i].name === 'VariableDecl') {
//             analyzeVariableDecl(context, program, children[i]);
//         }
//         else if (children[i].name === 'VarStructDecl') {
//             analyzeVarStructDecl(context, program, children[i]);
//         }
//     }
// }


// function analyzeFunctionDecls(context: Context, program: ProgramScope): void {
//     for (let i = 0; i < context.functionWithImplementationList.length; i++) {
//         resumeFunctionAnalysis(context, program, context.functionWithImplementationList[i]);
//     }

//     checkFunctionsForRecursion(context);
//     checkFunctionForCorrectUsage(context);
//     generateInfoAboutUsedData(context);
//     generateShadersFromFunctions(context);
// }


function analyzeTechniques(context: Context, program: ProgramScope): void {
    for (let name in program.globalScope.techniqueMap) {
        resumeTechniqueAnalysis(context, program, program.globalScope.techniqueMap[name]);
    }
}


initSystemTypes();
initSystemFunctions();
initSystemVariables();


class Context {
    readonly filename: string | null = null;
    
    moduleName: string | null;
    currentFunction: IFunctionDeclInstruction | null;
    haveCurrentFunctionReturnOccur: boolean;


    constructor(filename: string, ) {
        this.filename = filename;

        this.moduleName = null;
        this.currentFunction = null;
        this.haveCurrentFunctionReturnOccur = null;
    }
}

export interface IAnalyzeResult {
    success: boolean;
    root: IInstructionCollector;
    // errors: any[];
    // warnings: any[];
}

export function analyze(filename: string, ast: IParseTree): IAnalyzeResult {
    
    let success = true;
    
    const program = new ProgramScope();
    const context = new Context(filename);

    console.time(`analyze(${filename})`);


    let root: IInstructionCollector = null;

    try {
        program.begin(systemScope);

        root = new InstructionCollector({ scope: program.currentScope });

        analyzeGlobalUseDecls(context, program, ast);
        analyzeGlobalProvideDecls(context, program, ast);
        // analyzeGlobalTypeDecls(context, program, ast);
        // analyzeFunctionDefinitions(context, program, ast);
        // analyzeGlobalImports(context, program, ast);
        analyzeTechniqueImports(context, program, ast);
        // analyzeVariableDecls(context, program, ast);
        // analyzeFunctionDecls(context, scope);
        analyzeTechniques(context, program);

        program.end();
    }
    catch (e) {
        throw e;
    }

    console.timeEnd(`analyze(${filename})`);
    return { success, root: root };
}


