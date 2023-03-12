import { assert, isNull } from "@lib/common";
import { types } from '@lib/fx/analisys/helpers';
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import { VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { CodeContext, CodeEmitter } from "@lib/fx/translators/CodeEmitter";
import { EAnalyzerErrors } from "@lib/idl/EAnalyzerErrors";
import {
    EInstructionTypes, IAttributeInstruction, ICbufferInstruction, IFunctionDeclInstruction, IFunctionDefInstruction,
    IRegister, IScope, ITypeInstruction, IVariableDeclInstruction, IVariableUsage
} from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { AttributeInstruction } from "../instructions/AttributeInstruction";
import { FunctionDefInstruction } from "../instructions/FunctionDefInstruction";
import { SystemFunctionInstruction } from "../instructions/SystemFunctionInstruction";

export const USE_STRICT_HALF_TYPE = false;
export const TEMPLATE_TYPE = "template";

export function parseUintLiteral(value: string) {
    const match = value.match(/^((0x[a-fA-F0-9]{1,8}?|[0-9]+)(e([+-]?[0-9]+))?)([ulUL]*)$/);
    assert(match, `cannot parse uint literal: ${value}`);

    const signed = match[5].toLowerCase().indexOf('u') === -1;
    const exp = Number(match[4] || '0');
    const base = Number(match[2]);
    assert(!Number.isNaN(base));

    const heximal = value[1] === 'x';

    return { signed, exp, base, heximal };
}

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////


export function getSystemType(scope: IScope, typeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    let type = <SystemTypeInstruction>scope.findType(typeName);
    assert(!type || (type.instructionType === EInstructionTypes.k_SystemType));
    return type;
}


export function generateSystemType(scope: IScope, name: string, size?: number, elementType?: ITypeInstruction,
    length?: number, fields?: IVariableDeclInstruction[], methods?: IFunctionDeclInstruction[]): SystemTypeInstruction;
export function generateSystemType(scope: IScope, ...args: any[]): SystemTypeInstruction {
    let name: string;
    let size: number;
    let elementType: ITypeInstruction;
    let length: number;
    let fields: IVariableDeclInstruction[];
    let methods: IFunctionDeclInstruction[];

    [name, size, elementType, length, fields, methods] = args;

    if (getSystemType(scope, name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    const type = new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    scope.addType(type);

    return type;
}

export function defineTypeAlias(scope: IScope, typeName: string, aliasName: string) {
    scope.addTypeAlias(typeName, aliasName);
}

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

export function addFieldsToVectorFromSuffixObject(scope: IScope, fields: IVariableDeclInstruction[], suffixMap: IMap<boolean>, baseType: string) {
    for (let suffix in suffixMap) {
        const fieldTypeName = baseType + ((suffix.length > 1) ? suffix.length.toString() : "");
        const fieldBaseType = getSystemType(scope, fieldTypeName);

        assert(fieldBaseType);

        const fieldId = new IdInstruction({ scope, name: suffix });
        const fieldType = new VariableTypeInstruction({ scope, type: fieldBaseType, writable: suffixMap[suffix] })

        fields.push(new VariableDeclInstruction({ scope, id: fieldId, type: fieldType }));
    }
}



export function generateSuffixLiterals(literals: string, output: IMap<boolean> = {}, depth: number = 0): IMap<boolean> {
    if (depth >= /*literals.length*/4) {
        return output;
    }

    if (depth === 0) {
        for (let i = 0; i < literals.length; i++) {
            output[literals[i]] = true;
        }

        depth = 1;
    }

    const outputKeys = Object.keys(output);

    for (let i = 0; i < literals.length; i++) {
        for (let j = 0; j < outputKeys.length; j++) {
            if (outputKeys[j].indexOf(literals[i]) !== -1) {
                output[outputKeys[j] + literals[i]] = false;
            }
            else {
                output[outputKeys[j] + literals[i]] = (output[outputKeys[j]] === false) ? false : true;
            }
        }
    }

    depth++;

    return generateSuffixLiterals(literals, output, depth);
}

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

export function isTemplate(typename: string): boolean {
    return typename.split(' ').slice(-1)[0] === TEMPLATE_TYPE;
}

export function parseType(scope: IScope, typename: string, typevalue: string = null) {
    assert(typevalue !== TEMPLATE_TYPE);
    const usagesType = (typevalue ? typename.replace(TEMPLATE_TYPE, typevalue) : typename).split(' ');
    const hash = usagesType.slice(-1)[0];
    const type = getSystemType(scope, hash);
    const usages = <IVariableUsage[]>usagesType.slice(0, -1);

    assert(type !== null);
    usages.forEach(usage => assert(['in', 'out', 'inout'].indexOf(usage) !== -1));

    return { type, usages, hash };
}

type ITypeDesc = ReturnType<typeof parseType>;


const systemFunctionHashMap: IMap<boolean> = {};

function _emitException(message: string) {
    throw new Error(message);
}

// todo: rewrite it!
function _error(code: number, info = {}): void {
    _emitException(EAnalyzerErrors[code]);
}


export const USAGE_VS = 0x01;
export const USAGE_PS = 0x02;
export const USAGE_GS = 0x04;
export const USAGE_CS = 0x08;
export const USAGE_HS = 0x10;
export const USAGE_DS = 0x20;
export const USAGE_CONTROL_FLOW = 0x100;

function generateSystemFunctionInstance(scope: IScope, retType: ITypeDesc, name: string, paramTypes: ITypeDesc[], usage: number) {
    const paramList = paramTypes.map((typeDesc, n) => {
        return new VariableDeclInstruction({
            type: new VariableTypeInstruction({
                type: typeDesc.type,
                usages: typeDesc.usages,
                scope
            }),
            id: new IdInstruction({ name: `p${n}`, scope }),
            scope
        });
    });

    const returnType = new VariableTypeInstruction({
        type: retType.type,
        usages: retType.usages,
        scope
    });

    const pixel = !!(usage & USAGE_PS);
    const vertex = !!(usage & USAGE_VS);
    const extern = !!(usage & USAGE_CONTROL_FLOW);
    const attrs: IAttributeInstruction[] = [];
    if (extern) {
        attrs.push(new AttributeInstruction({ scope, name: 'extern' }));
    }

    const id = new IdInstruction({ scope, name });
    const def = new FunctionDefInstruction({ scope, returnType, id, paramList });
    const func = new SystemFunctionInstruction({ scope, def, pixel, vertex, attrs });

    scope.addFunction(func);
}


/**
 * Exampler:
 *  generateSystemFunction("dot", "dot($1,$2)",   "float",    [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
 *                         ^^^^^  ^^^^^^^^^^^^    ^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                         name   translationExpr returnType  argsTypes                       templateTypes
 */
export function generateSystemFunction(
    scope: IScope,
    name: string,
    returnTypeName: string,
    paramTypeNames: string[],
    templateTypes: string[], usage: number = USAGE_VS | USAGE_PS): void {

    if (!isNull(templateTypes)) {
        for (let i = 0; i < templateTypes.length; i++) {
            let funcHash = name + "(";
            let returnType = parseType(scope, returnTypeName, templateTypes[i]);
            let paramTypes = <ITypeDesc[]>[];

            for (let j = 0; j < paramTypeNames.length; j++) {
                const typeDesc = parseType(scope, paramTypeNames[j], templateTypes[i]);
                paramTypes.push(typeDesc);
                funcHash += typeDesc.hash + ",";
            }

            funcHash += ")";

            if (systemFunctionHashMap[funcHash]) {
                _error(EAnalyzerErrors.SystemFunctionRedefinition, { funcName: funcHash });
            }

            generateSystemFunctionInstance(scope, returnType, name, paramTypes, usage);
            systemFunctionHashMap[funcHash] = true;
        }
    }
    else {
        if (isTemplate(returnTypeName)) {
            _emitException("Bad return type(TEMPLATE_TYPE) for system function '" + name + "'.");
        }

        let funcHash = name + "(";
        let returnType = parseType(scope, returnTypeName);
        let paramTypes = <ITypeDesc[]>[];

        for (let i = 0; i < paramTypeNames.length; i++) {
            if (isTemplate(paramTypeNames[i])) {
                _emitException("Bad argument type(TEMPLATE_TYPE) for system function '" + name + "'.");
            }
            else {
                const typeDesc = parseType(scope, paramTypeNames[i]);
                paramTypes.push(typeDesc);
                funcHash += typeDesc.hash + ",";
            }
        }

        funcHash += ")";

        if (systemFunctionHashMap[funcHash]) {
            _error(EAnalyzerErrors.SystemFunctionRedefinition, { funcName: funcHash });
        }

        generateSystemFunctionInstance(scope, returnType, name, paramTypes, usage);
        systemFunctionHashMap[funcHash] = true;
    }
}


/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

export const SCALAR_TYPES = [
    'bool',
    'int',
    'uint',
    'half',
    'float'
];


export const INT_TYPES = [
    'int', 'uint'
];

export const FLOAT_TYPES = [
    'float'
];

export const INT_BASED_TYPES = [
    'int',
    'int2', 'int3', 'int4',
    'int2x2', 'int2x3', 'int2x4',
    'int3x2', 'int3x3', 'int3x4',
    'int4x2', 'int4x3', 'int4x4',
];


export const UINT_BASED_TYPES = [
    'uint',
    'uint2', 'uint3', 'uint4',
    'uint2x2', 'uint2x3', 'uint2x4',
    'uint3x2', 'uint3x3', 'uint3x4',
    'uint4x2', 'uint4x3', 'uint4x4',
];


export const HALF_BASED_TYPES = [
    'half',
    'half2', 'half3', 'half4',
    'half2x2', 'half2x3', 'half2x4',
    'half3x2', 'half3x3', 'half3x4',
    'half4x2', 'half4x3', 'half4x4',
];


export const FLOAT_BASED_TYPES = [
    'float',
    'float2', 'float3', 'float4',
    'float2x2', 'float2x3', 'float2x4',
    'float3x2', 'float3x3', 'float3x4',
    'float4x2', 'float4x3', 'float4x4',
];


export const BOOL_BASED_TYPES = [
    'bool',
    'bool2', 'bool3', 'bool4',
    'bool2x2', 'bool2x3', 'bool2x4',
    'bool3x2', 'bool3x3', 'bool3x4',
    'bool4x2', 'bool4x3', 'bool4x4',
];


export const VECTOR_TYPES = [
    'bool2', 'bool3', 'bool4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'half2', 'half3', 'half4',
    'float2', 'float3', 'float4'
];


export const MATRIX_TYPES = [
    'bool2x2', 'bool2x3', 'bool2x4', 'bool3x2', 'bool3x3', 'bool3x4', 'bool4x2', 'bool4x3', 'bool4x4',
    'int2x2', 'int2x3', 'int2x4', 'int3x2', 'int3x3', 'int3x4', 'int4x2', 'int4x3', 'int4x4',
    'uint2x2', 'uint2x3', 'uint2x4', 'uint3x2', 'uint3x3', 'uint3x4', 'uint4x2', 'uint4x3', 'uint4x4',
    'half2x2', 'half2x3', 'half2x4', 'half3x2', 'half3x3', 'half3x4', 'half4x2', 'half4x3', 'half4x4',
    'float2x2', 'float2x3', 'float2x4', 'float3x2', 'float3x3', 'float3x4', 'float4x2', 'float4x3', 'float4x4',
];

export const BASE_TYPES = [
    ...SCALAR_TYPES, ...VECTOR_TYPES, ...MATRIX_TYPES
]

export const UAV_TYPES = [
    'RWTexture1D',
    'RWTexture2D',
    'RWTexture3D',
    'RWBuffer',
    'RWStructuredBuffer',
    'AppendStructuredBuffer'
];

export const TEXTURE_TYPES = [
    'Texture1D',
    'Texture2D',
    'Texture3D',
    'TextureCube',
    'Texture2DArray',
    'TextureCubeArray',
    'RWTexture1D',
    'RWTexture2D',
    'RWTexture3D',
];

export const BUFFER_TYPES = [
    'Buffer',
    'RWBuffer',
    'RWStructuredBuffer',
    'AppendStructuredBuffer',
    'StructuredBuffer'
];

export const SAMPLER_TYPES = [
    'SamplerState',
    'SamplerComparisonState'
];

export const BLEND_STATE = 'BlendState';
export const DEPTH_STENCIL_STATE = 'DepthStencilState';
export const RASTERIZER_STATE = 'RasterizerState';

export const RENDER_TARGET_VIEW = 'RenderTargetView';
export const DEPTH_STENCIL_VIEW = 'DepthStencilView';

export const SHADER_TYPES = [
    'VertexShader',
    'PixelShader',
    'GeometryShader',
    'HullShader',
    'DomainShader',
    'ComputeShader'
];

const skipTemplate = (name: string) => name.match(/([\w][\w\d]+)(<[\w][\w\d]+>)?/)[1];
// note: arrays like "Texture2D[5]" also return true in this checks (!)
export const isUAV = (type: ITypeInstruction) => UAV_TYPES.includes(skipTemplate(type.name));
export const isTexture = (type: ITypeInstruction) => TEXTURE_TYPES.includes(skipTemplate(type.name));
export const isBuffer = (type: ITypeInstruction) => BUFFER_TYPES.includes(skipTemplate(type.name));

// note: arrays like "BlendState[5]" also return true in this checks (!)
export const isSamplerState = (type: ITypeInstruction) => SAMPLER_TYPES.includes(type.name);
export const isBlendState = (type: ITypeInstruction) => [BLEND_STATE].includes(type.name);
export const isDepthStencilState = (type: ITypeInstruction) => [DEPTH_STENCIL_STATE].includes(type.name);
export const isRasterizerState = (type: ITypeInstruction) => [RASTERIZER_STATE].includes(type.name);
// note: arrays like "RenderTargetView[5]" also return true in this checks (!)
export const isRenderTargetView = (type: ITypeInstruction) => [RENDER_TARGET_VIEW].includes(type.name);
export const isDepthStencilView = (type: ITypeInstruction) => [DEPTH_STENCIL_VIEW].includes(type.name);

// note: arrays like "BlendState[5]" also return true in this checks (!)
export const isPipelineState = (type: ITypeInstruction) => [
    BLEND_STATE,
    DEPTH_STENCIL_STATE,
    RASTERIZER_STATE,

    RENDER_TARGET_VIEW,
    DEPTH_STENCIL_VIEW
].includes(type.name);

export const isShaderType = (type: ITypeInstruction) => SHADER_TYPES.includes(types.signature(type));

// note: arrays like "float4[4]" return false in this checks (!)
export const isBase = (type: ITypeInstruction) => BASE_TYPES.includes(types.signature(type));
export const isVectorType = (type: ITypeInstruction) => VECTOR_TYPES.includes(types.signature(type));
export const isMatrixType = (type: ITypeInstruction) => MATRIX_TYPES.includes(types.signature(type));
export const isScalarType = (type: ITypeInstruction) => SCALAR_TYPES.includes(types.signature(type));
export const isIntegerType = (type: ITypeInstruction) => INT_TYPES.includes(types.signature(type));
export const isFloatType = (type: ITypeInstruction) => FLOAT_TYPES.includes(types.signature(type));
export const isIntBasedType = (type: ITypeInstruction) => INT_BASED_TYPES.includes(types.signature(type));
export const isUintBasedType = (type: ITypeInstruction) => UINT_BASED_TYPES.includes(types.signature(type));
export const isBoolBasedType = (type: ITypeInstruction) => BOOL_BASED_TYPES.includes(types.signature(type));
export const isHalfBasedType = (type: ITypeInstruction) => HALF_BASED_TYPES.includes(types.signature(type));
export const isFloatBasedType = (type: ITypeInstruction) => FLOAT_BASED_TYPES.includes(types.signature(type));

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////


export function resolveRegister(decl: IVariableDeclInstruction | ICbufferInstruction): IRegister {
    let type = null;
    let index = -1;

    const semantic = decl.semantic;
    if (semantic) {
        const match = semantic.match(/^register\(([utbs]{1})([\d]+)\)$/);
        if (match) {
            type = match[1];
            index = Number(match[2]);
        }
    }

    if (isUAV(decl.type)) {
        assert(type === null || type === 'u');
        type = 'u';
    }

    if (isTexture(decl.type)) {
        assert(type === null || type === 't');
        type = 't';
    }

    if (isSamplerState(decl.type)) {
        assert(type === null || type === 's');
        type = 's';
    }

    if (decl.instructionType === EInstructionTypes.k_CbufferDecl) {
        assert(type === null || type === 'b');
        type = 'b';
    }

    // TODO: buffers

    return { type, index };
}


///////////////////////////////////////////////////////


function alignL(content: string, len: number) {
    let diff = Math.max(0, len - content.length);
    return `${Array(diff).fill(' ').join('')}${content}`;
}


function alignR(content: string, len: number) {
    let diff = Math.max(0, len - content.length);
    return `${content}${Array(diff).fill(' ').join('')}`;
}

class Emitter<ContextT extends CodeContext> extends CodeEmitter<ContextT> {
    emitFunctionDefinition(ctx: ContextT, def: IFunctionDefInstruction, attrs: IAttributeInstruction[]): void {
        const { typeName } = this.resolveType(ctx, def.returnType);
        // this.emitKeyword(alignL(typeName, 10));
        // this.emitKeyword(alignR(def.name, 16));
        attrs?.forEach(attr => this.emitLine(`[${attr.name}]`));
        this.emitKeyword(typeName);
        this.emitKeyword(def.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitParams(ctx, def.params);
        this.emitChar(')');
    }
}

export function debugPrint(scope: IScope) {

    const ctx = new CodeContext;
    const emitter = new Emitter({ omitEmptyParams: true });

    const { functions, types, typeTemplates } = scope;

    emitter.begin();
    for (let name in types) {
        const type = types[name];
        emitter.emitLine(`// ${type.name};`);
    }
    emitter.end();

    emitter.begin();
    for (let name in typeTemplates) {
        const tpl = typeTemplates[name];
        emitter.emitLine(`// ${tpl.name};`);
    }
    emitter.end();

    emitter.begin();
    for (let name in functions) {
        const overloads = functions[name];

        for (const fn of overloads) {
            emitter.emitFunctionDefinition(ctx, fn.def, fn.attrs);
            emitter.emitChar(';');
            emitter.emitNewline();
        }

        emitter.emitNewline();
    }
    emitter.end();
    return emitter.toString();
}
