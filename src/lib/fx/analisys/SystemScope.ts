import { assert, isNull, isObject } from "@lib/common";
import { instruction, type } from "@lib/fx/analisys/helpers";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { SystemFunctionInstruction } from "@lib/fx/analisys/instructions/SystemFunctionInstruction";
import { ISystemTypeInstructionSettings, SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import { EVariableUsageFlags, VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { Scope } from "@lib/fx/analisys/ProgramScope";
import { EAnalyzerErrors } from '@lib/idl/EAnalyzerErrors';
import { EInstructionTypes, EScopeType, IFunctionDeclInstruction, IScope, ITypedInstruction, ITypeInstruction, ITypeTemplate, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";

// TODO: use it
export enum ESystemTypes {
    k_Sampler,
    k_Sampler2D,
    k_Sampler3D,
    k_SamplerCube,
    k_RWBuffer,
    k_RWStructuredBuffer,
    k_AppendStructuredBuffer
};

const scope = new Scope({ type: EScopeType.k_System });

const systemFunctionHashMap: IMap<boolean> = {};
const TEMPLATE_TYPE = "template";


function _emitException(message: string) {
    throw new Error(message);
}

// todo: rewrite it!
function _error(code: number, info = {}): void {
    _emitException(EAnalyzerErrors[code]);
}

type ITypeInfo = Pick<ISystemTypeInstructionSettings, Exclude<keyof ISystemTypeInstructionSettings, 'scope'>>;

function generateSystemType(name: string, size?: number, elementType?: ITypeInstruction, 
    length?: number, fields?: IVariableDeclInstruction[], methods?: IFunctionDeclInstruction[]): SystemTypeInstruction;
// function generateSystemType({ name, length, elementType, fields, size, methods }: ITypeInfo): SystemTypeInstruction;
function generateSystemType(...args: any[]): SystemTypeInstruction {
    let name: string;
    let size: number;
    let elementType: ITypeInstruction;
    let length: number;
    let fields: IVariableDeclInstruction[];
    let methods: IFunctionDeclInstruction[];

    // if (isObject(args[0])) {
    //     ({ name, size, elementType, length, fields, methods } = args[0]);
    // } else{
        [ name, size, elementType, length, fields, methods ] = args;
    // }

    if (getSystemType(name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    const type = new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    scope.addType(type);

    return type;
}


class TypeTemplate implements ITypeTemplate {
    readonly name: string;
    readonly scope: IScope;
    
    constructor(name: string, scope: IScope) {
        this.name = name;
        this.scope = scope;
    }

    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        return null;
    }

    typeName(args?: ITypeInstruction[]): string {
        if (args) {
            return `${this.name}<${args.map(arg => arg.name).join(', ')}>`;
        }
        return this.name;
    }
}


class RWBufferTemplate extends TypeTemplate {
    constructor() {
        super('RWBuffer', scope);
    }
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        if (args.length !== 1) {
            // TODO: print error
            return null;
        }

        if (!args[0].isBase()) {
            // TODO: print error
            return null;
        }

        const name = this.typeName(args);
        const size = -1; 
        const elementType = args[0];
        const length = instruction.UNDEFINE_LENGTH;
        const fields: IVariableDeclInstruction[] = [];
        const methods: IFunctionDeclInstruction[] = [];
        const uav = true;
        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods, uav });
    }
}


class RWStructuredBufferTemplate extends TypeTemplate {
    constructor() {
        super('RWStructuredBuffer', scope);
    }
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        if (args.length !== 1) {
            // TODO: print error
            return null;
        }
        
        const name = this.typeName(args);
        const size = -1; 
        const elementType = args[0];
        const length = instruction.UNDEFINE_LENGTH;
        const fields: IVariableDeclInstruction[] = [];
        const methods: IFunctionDeclInstruction[] = [];
        const uav = true;
        
        {
            let returnType = new VariableTypeInstruction({ type: scope.findType("uint"), scope });
            let id = new IdInstruction({ scope, name: 'IncrementCounter' });
            let definition = new FunctionDefInstruction({ scope, returnType, id });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }

        {
            let returnType = new VariableTypeInstruction({ type: scope.findType("uint"), scope });
            let id = new IdInstruction({ scope, name: 'DecrementCounter' });
            let definition = new FunctionDefInstruction({ scope, returnType, id });
            let func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }


        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods, uav });
    }
}


class AppendStructuredBufferTemplate extends TypeTemplate {
    constructor() {
        super('AppendStructuredBuffer', scope);
    }
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        if (args.length !== 1) {
            // TODO: print error
            return null;
        }

        const name = this.typeName(args);
        const size = -1; 
        const elementType = args[0];
        const length = instruction.UNDEFINE_LENGTH;
        const fields: IVariableDeclInstruction[] = [];
        const methods: IFunctionDeclInstruction[] = [];
        const uav = true;
        {
            const paramList = [];

            {
                const type = new VariableTypeInstruction({ type: args[0], scope });
                const id = new IdInstruction({ scope, name: 'Append' });
                const usageFlags = EVariableUsageFlags.k_Argument | EVariableUsageFlags.k_Local;
                const param0 = new VariableDeclInstruction({ scope, type, id, usageFlags });
                paramList.push(param0);
            }

            const returnType = new VariableTypeInstruction({ type: scope.findType("void"), scope });
            const id = new IdInstruction({ scope, name: 'Append' });
            const definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
            const func = new SystemFunctionInstruction({ scope, definition, pixel: false, vertex: false });
            methods.push(func);
        }
        
        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods, uav });
    }
}


class Texture2DTemplate extends TypeTemplate {
    constructor() {
        super('Texture2D', scope);
    }
    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        if (args.length !== 1) {
            // TODO: print error
            return null;
        }

        if (!args[0].isBase()) {
            // TODO: print error
            return null;
        }

        const name = this.typeName(args);
        const size = -1; 
        const elementType = args[0];
        const length = instruction.UNDEFINE_LENGTH;
        const fields: IVariableDeclInstruction[] = [];
        const methods: IFunctionDeclInstruction[] = [];
        const uav = true;
        return new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods, uav });
    }
}


function addFieldsToVectorFromSuffixObject(fields: IVariableDeclInstruction[], suffixMap: IMap<boolean>, baseType: string) {
    for (let suffix in suffixMap) {
        const fieldTypeName = baseType + ((suffix.length > 1) ? suffix.length.toString() : "");
        const fieldBaseType = getSystemType(fieldTypeName);

        assert(fieldBaseType);

        const fieldId = new IdInstruction({ scope, name: suffix });
        const fieldType = new VariableTypeInstruction({ scope, type: fieldBaseType, writable: suffixMap[suffix] })

        fields.push(new VariableDeclInstruction({ scope, id: fieldId, type: fieldType }));
    }
}


function addSystemTypeScalar(): void {
    generateSystemType("void", 0);
    generateSystemType("int", 4);
    generateSystemType("uint", 4);
    generateSystemType("bool", 4);
    generateSystemType("float", 4);
    generateSystemType("string");
    generateSystemType("texture");
    generateSystemType("sampler");
    generateSystemType("sampler2D");
    generateSystemType("samplerCUBE");
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

    generateSuffixLiterals(["x", "y"], XYSuffix);
    generateSuffixLiterals(["x", "y", "z"], XYZSuffix);
    generateSuffixLiterals(["x", "y", "z", "w"], XYZWSuffix);

    generateSuffixLiterals(["r", "g"], RGSuffix);
    generateSuffixLiterals(["r", "g", "b"], RGBSuffix);
    generateSuffixLiterals(["r", "g", "b", "a"], RGBASuffix);

    generateSuffixLiterals(["s", "t"], STSuffix);
    generateSuffixLiterals(["s", "t", "p"], STPSuffix);
    generateSuffixLiterals(["s", "t", "p", "q"], STPQSuffix);


    let float = getSystemType("float");
    let int = getSystemType("int");
    let uint = getSystemType("uint");
    let bool = getSystemType("bool");

    let float2 = generateSystemType("float2", -1, float, 2);
    let float3 = generateSystemType("float3", -1, float, 3);
    let float4 = generateSystemType("float4", -1, float, 4);

    let int2 = generateSystemType("int2", -1, int, 2);
    let int3 = generateSystemType("int3", -1, int, 3);
    let int4 = generateSystemType("int4", -1, int, 4);

    let uint2 = generateSystemType("uint2", -1, uint, 2);
    let uint3 = generateSystemType("uint3", -1, uint, 3);
    let uint4 = generateSystemType("uint4", -1, uint, 4);

    let bool2 = generateSystemType("bool2", -1, bool, 2);
    let bool3 = generateSystemType("bool3", -1, bool, 3);
    let bool4 = generateSystemType("bool4", -1, bool, 4);

    {
        let suf2f: IVariableDeclInstruction[] = [];
        // program.push(EScopeType.k_Struct);
        addFieldsToVectorFromSuffixObject(suf2f, XYSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf2f, RGSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf2f, STSuffix, "float");
        // program.pop();
        suf2f.forEach(field => float2.addField(field));
    }

    {
        let suf3f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3f, XYZSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf3f, RGBSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf3f, STPSuffix, "float");
        suf3f.forEach(field => float3.addField(field));
    }

    {
        let suf4f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4f, XYZWSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf4f, RGBASuffix, "float");
        addFieldsToVectorFromSuffixObject(suf4f, STPQSuffix, "float");
        suf4f.forEach(field => float4.addField(field));
    }

    {
        let suf2i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2i, XYSuffix, "int");
        addFieldsToVectorFromSuffixObject(suf2i, RGSuffix, "int");
        addFieldsToVectorFromSuffixObject(suf2i, STSuffix, "int");
        suf2i.forEach(field => int2.addField(field));
    }

    {
        let suf3i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3i, XYZSuffix, "int");
        addFieldsToVectorFromSuffixObject(suf3i, RGBSuffix, "int");
        addFieldsToVectorFromSuffixObject(suf3i, STPSuffix, "int");
        suf3i.forEach(field => int3.addField(field));
    }

    {
        let suf4i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4i, XYZWSuffix, "int");
        addFieldsToVectorFromSuffixObject(suf4i, RGBASuffix, "int");
        addFieldsToVectorFromSuffixObject(suf4i, STPQSuffix, "int");
        suf4i.forEach(field => int4.addField(field));
    }

    {
        let suf2ui: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2ui, XYSuffix, "uint");
        addFieldsToVectorFromSuffixObject(suf2ui, RGSuffix, "uint");
        addFieldsToVectorFromSuffixObject(suf2ui, STSuffix, "uint");
        suf2ui.forEach(field => uint2.addField(field));
    }

    {
        let suf3ui: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3ui, XYZSuffix, "uint");
        addFieldsToVectorFromSuffixObject(suf3ui, RGBSuffix, "uint");
        addFieldsToVectorFromSuffixObject(suf3ui, STPSuffix, "uint");
        suf3ui.forEach(field => uint3.addField(field));
    }

    {
        let suf4ui: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4ui, XYZWSuffix, "uint");
        addFieldsToVectorFromSuffixObject(suf4ui, RGBASuffix, "uint");
        addFieldsToVectorFromSuffixObject(suf4ui, STPQSuffix, "uint");
        suf4ui.forEach(field => uint4.addField(field));
    }

    {
        let suf2b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2b, XYSuffix, "bool");
        addFieldsToVectorFromSuffixObject(suf2b, RGSuffix, "bool");
        addFieldsToVectorFromSuffixObject(suf2b, STSuffix, "bool");
        suf2b.forEach(field => bool2.addField(field));
    }

    {
        let suf3b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf3b, XYZSuffix, "bool");
        addFieldsToVectorFromSuffixObject(suf3b, RGBSuffix, "bool");
        addFieldsToVectorFromSuffixObject(suf3b, STPSuffix, "bool");
        suf3b.forEach(field => bool3.addField(field));
    }

    {
        let suf4b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf4b, XYZWSuffix, "bool");
        addFieldsToVectorFromSuffixObject(suf4b, RGBASuffix, "bool");
        addFieldsToVectorFromSuffixObject(suf4b, STPQSuffix, "bool");
        suf4b.forEach(field => bool4.addField(field));
    }
}


function addSystemTypeMatrix(): void {
    let float2 = getSystemType("float2");
    let float3 = getSystemType("float3");
    let float4 = getSystemType("float4");

    let int2 = getSystemType("int2");
    let int3 = getSystemType("int3");
    let int4 = getSystemType("int4");

    let uint2 = getSystemType("uint2");
    let uint3 = getSystemType("uint3");
    let uint4 = getSystemType("uint4");

    let bool2 = getSystemType("bool2");
    let bool3 = getSystemType("bool3");
    let bool4 = getSystemType("bool4");

    generateSystemType("float2x2", -1, float2, 2);
    generateSystemType("float2x3", -1, float2, 3);
    generateSystemType("float2x4", -1, float2, 4);

    generateSystemType("float3x2", -1, float3, 2);
    generateSystemType("float3x3", -1, float3, 3);
    generateSystemType("float3x4", -1, float3, 4);

    generateSystemType("float4x2", -1, float4, 2);
    generateSystemType("float4x3", -1, float4, 3);
    generateSystemType("float4x4", -1, float4, 4);

    generateSystemType("int2x2", -1, int2, 2);
    generateSystemType("int2x3", -1, int2, 3);
    generateSystemType("int2x4", -1, int2, 4);

    generateSystemType("int3x2", -1, int3, 2);
    generateSystemType("int3x3", -1, int3, 3);
    generateSystemType("int3x4", -1, int3, 4);

    generateSystemType("int4x2", -1, int4, 2);
    generateSystemType("int4x3", -1, int4, 3);
    generateSystemType("int4x4", -1, int4, 4);

    generateSystemType("bool2x2", -1, bool2, 2);
    generateSystemType("bool2x3", -1, bool2, 3);
    generateSystemType("bool2x4", -1, bool2, 4);

    generateSystemType("bool3x2", -1, bool3, 2);
    generateSystemType("bool3x3", -1, bool3, 3);
    generateSystemType("bool3x4", -1, bool3, 4);

    generateSystemType("bool4x2", -1, bool4, 2);
    generateSystemType("bool4x3", -1, bool4, 3);
    generateSystemType("bool4x4", -1, bool4, 4);
}


function generateSuffixLiterals(literals: string[], output: IMap<boolean>, depth: number = 0): void {
    if (depth >= literals.length) {
        return;
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

    generateSuffixLiterals(literals, output, depth);
}


function generateSystemFunctionInstance(type: ITypeInstruction, name: string, paramTypes: ITypeInstruction[], vertex: boolean, pixel: boolean) {
    let paramList = paramTypes.map((type, n) => {
        return new VariableDeclInstruction({ 
            type: new VariableTypeInstruction({ type, scope }), 
            id: new IdInstruction({ name: `p${n}`, scope }), 
            scope });
    });

    let returnType = new VariableTypeInstruction({ type, scope });
    let id = new IdInstruction({ scope, name });
    let definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
    let func = new SystemFunctionInstruction({ scope, definition, pixel, vertex });

    scope.addFunction(func);
}


/**
 * Exampler:
 *  generateSystemFunction("dot", "dot($1,$2)",   "float",    [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
 *                         ^^^^^  ^^^^^^^^^^^^    ^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *                         name   translationExpr returnType  argsTypes                       templateTypes
 */
function generateSystemFunction(
    name: string,
    returnTypeName: string,
    paramTypeNames: string[],
    templateTypes: string[],
    isForVertex: boolean = true,
    isForPixel: boolean = true): void {

    if (!isNull(templateTypes)) {
        for (let i = 0; i < templateTypes.length; i++) {
            let funcHash = name + "(";
            let returnType = (returnTypeName === TEMPLATE_TYPE) ?
                getSystemType(templateTypes[i]) :
                getSystemType(returnTypeName);
            let paramTypes: ITypeInstruction[] = [];

            for (let j = 0; j < paramTypeNames.length; j++) {
                if (paramTypeNames[j] === TEMPLATE_TYPE) {
                    paramTypes.push(getSystemType(templateTypes[i]));
                    funcHash += templateTypes[i] + ",";
                }
                else {
                    paramTypes.push(getSystemType(paramTypeNames[j]));
                    funcHash += paramTypeNames[j] + ","
                }
            }

            funcHash += ")";

            if (systemFunctionHashMap[funcHash]) {
                _error(EAnalyzerErrors.SystemFunctionRedefinition, { funcName: funcHash });
            }

            generateSystemFunctionInstance(returnType, name, paramTypes, isForVertex, isForPixel);
            systemFunctionHashMap[funcHash] = true;
        }
    }
    else {
        if (returnTypeName === TEMPLATE_TYPE) {
            _emitException("Bad return type(TEMPLATE_TYPE) for system function '" + name + "'.");
        }

        let funcHash = name + "(";
        let returnType = getSystemType(returnTypeName);
        let paramTypes: ITypeInstruction[] = [];

        for (let i = 0; i < paramTypeNames.length; i++) {
            if (paramTypeNames[i] === TEMPLATE_TYPE) {
                _emitException("Bad argument type(TEMPLATE_TYPE) for system function '" + name + "'.");
            }
            else {
                paramTypes.push(getSystemType(paramTypeNames[i]));
                funcHash += paramTypeNames[i] + ",";
            }
        }

        funcHash += ")";

        if (systemFunctionHashMap[funcHash]) {
            _error(EAnalyzerErrors.SystemFunctionRedefinition, { funcName: funcHash });
        }

        generateSystemFunctionInstance(returnType, name, paramTypes, isForVertex, isForPixel);
        systemFunctionHashMap[funcHash] = true;
    }
}


// function generateNotBuiltInSystemFunction(name: string, definition: string, implementation: string,
//     returnTypeName: string,
//     usedTypes: string[],
//     usedFunctions: string[]): void {

//     if (scope.hasFunction(name)) {
//         console.warn(`Builtin function ${name} already exists.`);
//         return;
//     }

//     let builtIn = false;
//     let returnType = getSystemType(returnTypeName);
//     let id = new IdInstruction({ scope, name })
//     let func = new SystemFunctionInstruction({ scope, id, returnType, definition, implementation, builtIn });

//     let usedExtSystemTypes: ITypeDeclInstruction[] = [];
//     let usedExtSystemFunctions: IFunctionDeclInstruction[] = [];

//     if (!isNull(usedTypes)) {
//         for (let i = 0; i < usedTypes.length; i++) {
//             let typeDecl: ITypeDeclInstruction = <ITypeDeclInstruction>getSystemType(usedTypes[i]).parent;
//             if (!isNull(typeDecl)) {
//                 usedExtSystemTypes.push(typeDecl);
//             }
//         }
//     }

//     if (!isNull(usedFunctions)) {
//         for (let i = 0; i < usedFunctions.length; i++) {
//             let pFindFunction: IFunctionDeclInstruction = scope.findFunction(usedFunctions[i]);
//             usedExtSystemFunctions.push(pFindFunction);
//         }
//     }

//     func.$setUsedSystemData(usedExtSystemTypes, usedExtSystemFunctions);
//     func.$closeSystemDataInfo();

//     scope.addFunction(func);
// }


// TODO: rework system function templates for better readability
function addSystemFunctions(): void {
    generateSystemFunction("dot", "float", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    // https://docs.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-mul
    // TODO: add support for int|uint|bool based vectors 
    generateSystemFunction("mul", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "int"]);
    generateSystemFunction("mul", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4", "float2x2", "float3x3", "float4x4"]);
    generateSystemFunction("mul", TEMPLATE_TYPE, ["float", TEMPLATE_TYPE], ["float2", "float3", "float4", "float2x2", "float3x3", "float4x4"]);
    generateSystemFunction("mul", "float4", ["float4", TEMPLATE_TYPE], ["float4x4", "float4x3", "float4x2"]);
    generateSystemFunction("mul", "float3", ["float3", TEMPLATE_TYPE], ["float3x4", "float3x3", "float3x2"]);
    generateSystemFunction("mul", "float2", ["float2", TEMPLATE_TYPE], ["float2x4", "float2x3", "float2x2"]);
    generateSystemFunction("mul", "float4", [TEMPLATE_TYPE, "float4"], ["float4x4", "float3x4", "float2x4"]);
    generateSystemFunction("mul", "float3", [TEMPLATE_TYPE, "float3"], ["float4x3", "float3x3", "float2x3"]);
    generateSystemFunction("mul", "float2", [TEMPLATE_TYPE, "float2"], ["float4x2", "float3x2", "float2x2"]);

    /**
     * scalar = int|uint|float
     * vector = vector<int|uint|float, n>, n = 2,3,4
     * matrix = matrix<scalar, rows, columns>, r = 2,3,4, c = 2,3,4
     * 
     * scalar mul(scalar, scalar)
     * vector mul(scalar, vector)
     * vector mul(vector, scalar)
     * vector mul(vector, vector)
     * matrix mul(scalar, matrix)
     * matrix mul(matrix, scalar)
     * vector mul(vector, matrix)
     * vector mul(matrix, vector)
     * matrix mul(matrix, matrix)
     */

    generateSystemFunction("mod", "float", ["float", "float"], null);
    generateSystemFunction("floor", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("ceil", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction("fract", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("abs", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("sign", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("normalize", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("length", "float", [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("cross", "float3", ["float3", "float3"], null);
    generateSystemFunction("reflect", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("max", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction("max", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("max", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["int", "int2", "int3", "int4"]);
    // generateSystemFunction("max", TEMPLATE_TYPE, [TEMPLATE_TYPE, "int"], ["int2", "int3", "int4"]);

    // generateSystemFunction("max", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["uint", "uint2", "uint3", "uint4"]);
    // generateSystemFunction("max", TEMPLATE_TYPE, [TEMPLATE_TYPE, "uint"], ["uint2", "uint3", "uint4"]);

    generateSystemFunction("min", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction("min", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("min", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["int", "int2", "int3", "int4"]);
    // generateSystemFunction("min", TEMPLATE_TYPE, [TEMPLATE_TYPE, "int"], ["int2", "int3", "int4"]);

    // generateSystemFunction("min", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["uint", "uint2", "uint3", "uint4"]);
    // generateSystemFunction("min", TEMPLATE_TYPE, [TEMPLATE_TYPE, "uint"], ["uint2", "uint3", "uint4"]);

    generateSystemFunction("clamp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("clamp", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float", "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("pow", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("mod", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "float3", "float4"]);
    generateSystemFunction("mod", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);
    generateSystemFunction("exp", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("exp2", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("log", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("log2", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("inversesqrt", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("sqrt", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    // generateSystemFunction("all", "bool", [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);
    // generateSystemFunction("any", "bool", [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);
    /** @deprecated (SM4) */
    generateSystemFunction("not", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction("distance", "float", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction("lessThan", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction("lessThan", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction("lessThan", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction("lessThanEqual", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction("lessThanEqual", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction("lessThanEqual", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction("equal", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction("equal", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction("equal", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);
    generateSystemFunction("equal", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction("notEqual", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction("notEqual", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction("notEqual", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);
    generateSystemFunction("notEqual", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction("greaterThan", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction("greaterThan", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction("greaterThan", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);

    generateSystemFunction("greaterThanEqual", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2", "uint2"]);
    generateSystemFunction("greaterThanEqual", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3", "uint3"]);
    generateSystemFunction("greaterThanEqual", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4", "uint4"]);


    generateSystemFunction("radians", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("degrees", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("sin", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("cos", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("tan", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("asin", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("acos", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("atan", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("atan", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction("tex2D", "float4", ["sampler", "float2"], null);
    generateSystemFunction("tex2D", "float4", ["sampler2D", "float2"], null);
    generateSystemFunction("tex2DProj", "float4", ["sampler", "float3"], null);
    generateSystemFunction("tex2DProj", "float4", ["sampler2D", "float3"], null);
    generateSystemFunction("tex2DProj", "float4", ["sampler", "float4"], null);
    generateSystemFunction("tex2DProj", "float4", ["sampler2D", "float4"], null);
    generateSystemFunction("texCUBE", "float4", ["sampler", "float3"], null);
    generateSystemFunction("texCUBE", "float4", ["samplerCUBE", "float3"], null);

    generateSystemFunction("tex2D", "float4", ["sampler", "float2", "float"], null, false, true);
    generateSystemFunction("tex2D", "float4", ["sampler2D", "float2", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "float4", ["sampler", "float3", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "float4", ["sampler2D", "float3", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "float4", ["sampler", "float4", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "float4", ["sampler2D", "float4", "float"], null, false, true);
    generateSystemFunction("texCUBE", "float4", ["sampler", "float3", "float"], null, false, true);
    generateSystemFunction("texCUBE", "float4", ["samplerCUBE", "float3", "float"], null, false, true);

    generateSystemFunction("tex2DLod", "float4", ["sampler", "float2", "float"], null, true, false);
    generateSystemFunction("tex2DLod", "float4", ["sampler2D", "float2", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "float4", ["sampler", "float3", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "float4", ["sampler2D", "float3", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "float4", ["sampler", "float4", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "float4", ["sampler2D", "float4", "float"], null, true, false);
    generateSystemFunction("texCUBELod", "float4", ["sampler", "float3", "float"], null, true, false);
    generateSystemFunction("texCUBELod", "float4", ["samplerCUBE", "float3", "float"], null, true, false);

    //OES_standard_derivatives

    generateSystemFunction("dFdx", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("dFdy", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("width", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("fwidth", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction("smoothstep", "float3", ["float3", "float3", "float3"], null);

    generateSystemFunction("smoothstep", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("smoothstep", TEMPLATE_TYPE, ["float", "float", TEMPLATE_TYPE], ["float2", "float3", "float4"]);

    generateSystemFunction("frac", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("lerp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("lerp", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("saturate", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction("asfloat", "float", [TEMPLATE_TYPE], ["float"/*, "uint"*/]);
    generateSystemFunction("asfloat", "float", [TEMPLATE_TYPE], ["int"/*, "uint"*/]);
    generateSystemFunction("asfloat", "float2", [TEMPLATE_TYPE], ["int2"/*, "uint2"*/]);
    generateSystemFunction("asfloat", "float3", [TEMPLATE_TYPE], ["int3"/*, "uint3"*/]);
    generateSystemFunction("asfloat", "float4", [TEMPLATE_TYPE], ["int4"/*, "uint4"*/]);
    
    generateSystemFunction("asint", "int", [TEMPLATE_TYPE], ["float", "uint"]);
    generateSystemFunction("asint", "int2", [TEMPLATE_TYPE], ["float2", "uint2"]);
    generateSystemFunction("asint", "int3", [TEMPLATE_TYPE], ["float3", "uint3"]);
    generateSystemFunction("asint", "int4", [TEMPLATE_TYPE], ["float4", "uint4"]);
    
    generateSystemFunction("asuint", "uint", [TEMPLATE_TYPE], ["float", "int"]);
    generateSystemFunction("asuint", "uint2", [TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("asuint", "uint3", [TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("asuint", "uint4", [TEMPLATE_TYPE], ["float4", "int4"]);

    generateSystemFunction("InterlockedAdd", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["int"]);
    // generateSystemFunction("InterlockedAdd", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["uint"]);

    // generateSystemFunction("asint", "int", [TEMPLATE_TYPE], ["float", "float2", "float3", "float4", "uint", "uint2", "uint3", "uint4"]);
    // generateSystemFunction("asfloat", "float", [TEMPLATE_TYPE], ["int", "int2", "int3", "int4", "uint", "uint2", "uint3", "uint4"]);
    // generateSystemFunction("asint", "int", [TEMPLATE_TYPE], ["float", "float2", "float3", "float4", "uint", "uint2", "uint3", "uint4"]);

    generateSystemFunction("f16tof32", "float", ["uint"], null);
    generateSystemFunction("f32tof16", "uint", ["float"], null);
    
    generateSystemFunction("any", "bool", [TEMPLATE_TYPE], ["int", /*"uint",*/ "float", "bool"]);
    generateSystemFunction("any", "bool", [TEMPLATE_TYPE], ["int2", "uint2", "float2", "bool2", "float2x2"]);
    generateSystemFunction("any", "bool", [TEMPLATE_TYPE], ["int3", "uint3", "float3", "bool3", "float3x3"]);
    generateSystemFunction("any", "bool", [TEMPLATE_TYPE], ["int4", "uint4", "float4", "bool4", "float4x4"]);

    generateSystemFunction("all", "bool", [TEMPLATE_TYPE], ["int", /*"uint",*/ "float", "bool"]);
    generateSystemFunction("all", "bool", [TEMPLATE_TYPE], ["int2", "uint2", "float2", "bool2", "float2x2"]);
    generateSystemFunction("all", "bool", [TEMPLATE_TYPE], ["int3", "uint3", "float3", "bool3", "float3x3"]);
    generateSystemFunction("all", "bool", [TEMPLATE_TYPE], ["int4", "uint4", "float4", "bool4", "float4x4"]);
}



// function generateSystemVariable(name: string, typeName: string,
//     isForVertex: boolean, isForPixel: boolean, readonly: boolean): void {

//     if (scope.hasVariable(name)) {
//         return;
//     }

//     let id = new IdInstruction({ scope, name });
//     let type = new VariableTypeInstruction({ scope, type: getSystemType(typeName), writable: readonly });
//     let variableDecl = new VariableDeclInstruction({ scope, id, type, builtIn: true });

//     variableDecl.$makeVertexCompatible(isForVertex);
//     variableDecl.$makePixelCompatible(isForPixel);

//     scope.addVariable(variableDecl);
// }


function getSystemType(typeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    let type = <SystemTypeInstruction>scope.findType(typeName);
    assert(!type || (type.instructionType === EInstructionTypes.k_SystemType));
    return type;
}


// function addSystemVariables(): void {
    // generateSystemVariable("fragColor", "gl_FragColor", "float4", false, true, true);
    // generateSystemVariable("fragCoord", "gl_FragCoord", "float4", false, true, true);
    // generateSystemVariable("frontFacing", "gl_FrontFacing", "bool", false, true, true);
    // generateSystemVariable("pointCoord", "gl_PointCoord", "float2", false, true, true);
// }


function initSystemTypes(): void {
    addSystemTypeScalar();
    addSystemTypeVector();
    addSystemTypeMatrix();
    
    scope.addTypeTemplate(new RWBufferTemplate);
    scope.addTypeTemplate(new RWStructuredBufferTemplate);
    scope.addTypeTemplate(new AppendStructuredBufferTemplate);

    scope.addTypeTemplate(new Texture2DTemplate);
}


function initSystemFunctions(): void {
    addSystemFunctions();
}


// function initSystemVariables(): void {
//     addSystemVariables();
// }


initSystemTypes();
initSystemFunctions();
// initSystemVariables();

/**
 * Export API
 */

export const SCOPE = scope;

export const T_VOID = scope.findType("void");
export const T_STRING = scope.findType("string");

export const T_FLOAT = scope.findType("float");
export const T_FLOAT2 = scope.findType("float2");
export const T_FLOAT3 = scope.findType("float3");
export const T_FLOAT4 = scope.findType("float4");

export const T_FLOAT2X2 = scope.findType("float2x2");
export const T_FLOAT3X3 = scope.findType("float3x3");
export const T_FLOAT4X4 = scope.findType("float4x4");

export const T_BOOL = scope.findType("bool");
export const T_BOOL2 = scope.findType("bool2");
export const T_BOOL3 = scope.findType("bool3");
export const T_BOOL4 = scope.findType("bool4");

export const T_BOOL2X2 = scope.findType("bool2x2");
export const T_BOOL3X3 = scope.findType("bool3x3");
export const T_BOOL4X4 = scope.findType("bool4x4");

export const T_INT = scope.findType("int");
export const T_INT2 = scope.findType("int2");
export const T_INT3 = scope.findType("int3");
export const T_INT4 = scope.findType("int4");

export const T_UINT = scope.findType("uint");
export const T_UINT2 = scope.findType("uint2");
export const T_UINT3 = scope.findType("uint3");
export const T_UINT4 = scope.findType("uint4");

export const T_INT2X2 = scope.findType("int2x2");
export const T_INT3X3 = scope.findType("int3x3");
export const T_INT4X4 = scope.findType("int4x4");

export const T_SAMPLER = scope.findType("sampler");
export const T_SAMPLER_2D = scope.findType("sampler2D");
export const T_SAMPLER_CUBE = scope.findType("samplerCUBE");

export const findType = (typeName: string) => scope.findType(typeName);
export const findVariable = (varName: string) => scope.findVariable(varName);
export const findTechnique = (techName: string) => scope.findTechnique(techName);
export const findFunction = (funcName: string, args?: ITypeInstruction[]) => scope.findFunction(funcName, args);

export const hasType = (typeName: string) => !isNull(scope.findType(typeName));
export const hasVariable = (varName: string) => !isNull(scope.findVariable(varName));
export const hasTechnique = (techName: string) => !isNull(scope.findTechnique(techName));

export function isMatrixType(type: ITypeInstruction): boolean { 
    return type.isEqual(getSystemType("float2x2")) ||
        type.isEqual(getSystemType("float3x3")) ||
        type.isEqual(getSystemType("float4x4")) ||
        type.isEqual(getSystemType("int2x2")) ||
        type.isEqual(getSystemType("int3x3")) ||
        type.isEqual(getSystemType("int4x4")) ||
        type.isEqual(getSystemType("bool2x2")) ||
        type.isEqual(getSystemType("bool3x3")) ||
        type.isEqual(getSystemType("bool4x4"));
}


export function isVectorType(type: ITypeInstruction): boolean {
    return type.isEqual(getSystemType("float2")) ||
        type.isEqual(getSystemType("float3")) ||
        type.isEqual(getSystemType("float4")) ||
        type.isEqual(getSystemType("bool2")) ||
        type.isEqual(getSystemType("bool3")) ||
        type.isEqual(getSystemType("bool4")) ||
        type.isEqual(getSystemType("int2")) ||
        type.isEqual(getSystemType("int3")) ||
        type.isEqual(getSystemType("int4")) || 
        type.isEqual(getSystemType("uint2")) ||
        type.isEqual(getSystemType("uint3")) ||
        type.isEqual(getSystemType("uint4"));
}


export function isScalarType(type: ITypeInstruction): boolean {
    return type.isEqual(T_BOOL) ||
        type.isEqual(T_INT) ||
        type.isEqual(T_UINT) ||
        type.isEqual(T_FLOAT);
}


export function isFloatBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(T_FLOAT) ||
        type.isEqual(T_FLOAT2) ||
        type.isEqual(T_FLOAT3) ||
        type.isEqual(T_FLOAT4) ||
        type.isEqual(T_FLOAT2X2) ||
        type.isEqual(T_FLOAT3X3) ||
        type.isEqual(T_FLOAT4X4);
}


export function isIntBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(T_INT) ||
        type.isEqual(T_INT2) ||
        type.isEqual(T_INT3) ||
        type.isEqual(T_INT4) ||
        type.isEqual(T_INT2X2) ||
        type.isEqual(T_INT3X3) ||
        type.isEqual(T_INT4X4);
}


export function isUIntBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(T_UINT) ||
        type.isEqual(T_UINT2) ||
        type.isEqual(T_UINT3) ||
        type.isEqual(T_UINT4);
}


export function isBoolBasedType(type: ITypeInstruction): boolean {
    return type.isEqual(T_BOOL) ||
        type.isEqual(T_BOOL2) ||
        type.isEqual(T_BOOL3) ||
        type.isEqual(T_BOOL4) ||
        type.isEqual(T_BOOL2X2) ||
        type.isEqual(T_BOOL3X3) ||
        type.isEqual(T_BOOL4X4);
}


export function isSamplerType(type: ITypeInstruction): boolean {
    return type.isEqual(T_SAMPLER) ||
        type.isEqual(getSystemType("sampler2D")) ||
        type.isEqual(getSystemType("samplerCUBE"));
}



/** @deprecated */
export function getExternalType(type: ITypeInstruction): any {
    if (type.isEqual(T_INT) ||
        type.isEqual(T_UINT) ||
        type.isEqual(T_FLOAT)) {
        return Number;
    }
    else if (type.isEqual(T_BOOL)) {
        return "Boolean";
    }
    else if (type.isEqual(T_FLOAT2) ||
        type.isEqual(T_BOOL2) ||
        type.isEqual(T_INT2) ||
        type.isEqual(T_UINT2)) {
        return "Vec2";
    }
    else if (type.isEqual(T_FLOAT3) ||
        type.isEqual(T_BOOL3) ||
        type.isEqual(T_INT3) ||
        type.isEqual(T_UINT3)) {
        return "Vec3";
    }
    else if (type.isEqual(T_FLOAT4) ||
        type.isEqual(T_BOOL4) ||
        type.isEqual(T_INT4) ||
        type.isEqual(T_UINT4)) {
        return "Vec4";
    }
    else if (type.isEqual(T_FLOAT2X2) ||
        type.isEqual(T_BOOL2X2) ||
        type.isEqual(T_INT2X2)) {
        return "Vec2";
    }
    else if (type.isEqual(T_FLOAT3X3) ||
        type.isEqual(T_BOOL3X3) ||
        type.isEqual(T_INT3X3)) {
        return "Mat3";
    }
    else if (type.isEqual(T_FLOAT4X4) ||
        type.isEqual(T_BOOL4X4) ||
        type.isEqual(T_INT4X4)) {
        return "Mat4";
    }
    else {
        return null;
    }
}
