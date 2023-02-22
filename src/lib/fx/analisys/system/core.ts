import { EInstructionTypes, EScopeType, IFunctionDeclInstruction, ITypeInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { Scope } from "@lib/fx/analisys/ProgramScope";
import { SystemTypeInstruction } from "@lib/fx/analisys/instructions/SystemTypeInstruction";
import { assert } from "@lib/common";
import { VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { IMap } from "@lib/idl/IMap";


const scope = new Scope({ type: EScopeType.k_System });

function getSystemType(typeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    let type = <SystemTypeInstruction>scope.findType(typeName);
    assert(!type || (type.instructionType === EInstructionTypes.k_SystemType));
    return type;
}


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
    [name, size, elementType, length, fields, methods] = args;
    // }

    if (getSystemType(name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    const type = new SystemTypeInstruction({ scope, name, elementType, length, fields, size, methods });
    scope.addType(type);

    return type;
}

function defineTypeAlias(typeName: string, aliasName: string) {
    scope.addTypeAlias(typeName, aliasName);
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

const USE_STRICT_HALF_TYPE = false;

function addSystemTypeScalar(): void {
    generateSystemType("void", 0);
    generateSystemType("int", 4);
    generateSystemType("uint", 4);
    generateSystemType("bool", 4);
    generateSystemType("float", 4);
    generateSystemType("string", 4/* pointer to string */);

    generateSystemType("SamplerState");
    generateSystemType("SamplerComparisonState");
    generateSystemType("DepthStencilState");
    generateSystemType("BlendState");

    defineTypeAlias("int", "VertexShader");
    defineTypeAlias("int", "PixelShader");
    defineTypeAlias("int", "ComputeShader");
    defineTypeAlias("int", "GeometryShader");
    defineTypeAlias("int", "HullShader");
    defineTypeAlias("int", "DomainShader");

    // generateSystemType("texture");
    // generateSystemType("sampler");
    // generateSystemType("sampler2D");
    // generateSystemType("samplerCUBE");

    // TODO: use dedicated type for half
    defineTypeAlias('float', 'half');
    console.assert(USE_STRICT_HALF_TYPE === false);
}



function generateSuffixLiterals(literals: string, output: IMap<boolean> = {}, depth: number = 0): IMap<boolean> {
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


function addSystemTypeVector(): void {
    const XYSuffix = generateSuffixLiterals("xy");
    const XYZSuffix = generateSuffixLiterals("xyz");
    const XYZWSuffix = generateSuffixLiterals("xyzw");

    const RGSuffix = generateSuffixLiterals("rg");
    const RGBSuffix = generateSuffixLiterals("rgb");
    const RGBASuffix = generateSuffixLiterals("rgba");

    const STSuffix = generateSuffixLiterals("st");
    const STPSuffix = generateSuffixLiterals("stp");
    const STPQSuffix = generateSuffixLiterals("stpq");


    let float = getSystemType("float");
    let half = getSystemType("half");
    let int = getSystemType("int");
    let uint = getSystemType("uint");
    let bool = getSystemType("bool");

    let float2 = generateSystemType("float2", -1, float, 2);
    let float3 = generateSystemType("float3", -1, float, 3);
    let float4 = generateSystemType("float4", -1, float, 4);

    if (!USE_STRICT_HALF_TYPE) {
        defineTypeAlias('float2', 'half2');
        defineTypeAlias('float3', 'half3');
        defineTypeAlias('float4', 'half4');
    }

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

    if (USE_STRICT_HALF_TYPE) {
        let half2 = generateSystemType("half2", -1, half, 2);
        let half3 = generateSystemType("half3", -1, half, 3);
        let half4 = generateSystemType("half4", -1, half, 4);

        {
            let suf2f: IVariableDeclInstruction[] = [];
            // program.push(EScopeType.k_Struct);
            addFieldsToVectorFromSuffixObject(suf2f, XYSuffix, "half");
            addFieldsToVectorFromSuffixObject(suf2f, RGSuffix, "half");
            addFieldsToVectorFromSuffixObject(suf2f, STSuffix, "half");
            // program.pop();
            suf2f.forEach(field => half2.addField(field));
        }

        {
            let suf3f: IVariableDeclInstruction[] = [];
            addFieldsToVectorFromSuffixObject(suf3f, XYZSuffix, "half");
            addFieldsToVectorFromSuffixObject(suf3f, RGBSuffix, "half");
            addFieldsToVectorFromSuffixObject(suf3f, STPSuffix, "half");
            suf3f.forEach(field => half3.addField(field));
        }

        {
            let suf4f: IVariableDeclInstruction[] = [];
            addFieldsToVectorFromSuffixObject(suf4f, XYZWSuffix, "half");
            addFieldsToVectorFromSuffixObject(suf4f, RGBASuffix, "half");
            addFieldsToVectorFromSuffixObject(suf4f, STPQSuffix, "half");
            suf4f.forEach(field => half4.addField(field));
        }
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
    generateSystemType("float2x3", -1, float3, 2);
    generateSystemType("float2x4", -1, float4, 2);

    generateSystemType("float3x2", -1, float2, 3);
    generateSystemType("float3x3", -1, float3, 3);
    generateSystemType("float3x4", -1, float4, 3);

    generateSystemType("float4x2", -1, float2, 4);
    generateSystemType("float4x3", -1, float3, 4);
    generateSystemType("float4x4", -1, float4, 4);

    generateSystemType("int2x2", -1, int2, 2);
    generateSystemType("int2x3", -1, int3, 2);
    generateSystemType("int2x4", -1, int4, 2);

    generateSystemType("int3x2", -1, int2, 3);
    generateSystemType("int3x3", -1, int3, 3);
    generateSystemType("int3x4", -1, int4, 3);

    generateSystemType("int4x2", -1, int2, 4);
    generateSystemType("int4x3", -1, int3, 4);
    generateSystemType("int4x4", -1, int4, 4);

    generateSystemType("bool2x2", -1, bool2, 2);
    generateSystemType("bool2x3", -1, bool3, 2);
    generateSystemType("bool2x4", -1, bool4, 2);

    generateSystemType("bool3x2", -1, bool2, 3);
    generateSystemType("bool3x3", -1, bool3, 3);
    generateSystemType("bool3x4", -1, bool4, 3);

    generateSystemType("bool4x2", -1, bool2, 4);
    generateSystemType("bool4x3", -1, bool3, 4);
    generateSystemType("bool4x4", -1, bool4, 4);
}

