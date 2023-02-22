import { IScope, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { addFieldsToVectorFromSuffixObject, defineTypeAlias, generateSuffixLiterals, generateSystemType, getSystemType, USE_STRICT_HALF_TYPE } from "./utils";

export function addSystemTypeVector(scope: IScope): void {
    const XYSuffix = generateSuffixLiterals("xy");
    const XYZSuffix = generateSuffixLiterals("xyz");
    const XYZWSuffix = generateSuffixLiterals("xyzw");

    const RGSuffix = generateSuffixLiterals("rg");
    const RGBSuffix = generateSuffixLiterals("rgb");
    const RGBASuffix = generateSuffixLiterals("rgba");

    const STSuffix = generateSuffixLiterals("st");
    const STPSuffix = generateSuffixLiterals("stp");
    const STPQSuffix = generateSuffixLiterals("stpq");


    let float = getSystemType(scope, "float");
    let half = getSystemType(scope, "half");
    let int = getSystemType(scope, "int");
    let uint = getSystemType(scope, "uint");
    let bool = getSystemType(scope, "bool");

    let float2 = generateSystemType(scope, "float2", -1, float, 2);
    let float3 = generateSystemType(scope, "float3", -1, float, 3);
    let float4 = generateSystemType(scope, "float4", -1, float, 4);

    if (!USE_STRICT_HALF_TYPE) {
        defineTypeAlias(scope, 'float2', 'half2');
        defineTypeAlias(scope, 'float3', 'half3');
        defineTypeAlias(scope, 'float4', 'half4');
    }

    let int2 = generateSystemType(scope, "int2", -1, int, 2);
    let int3 = generateSystemType(scope, "int3", -1, int, 3);
    let int4 = generateSystemType(scope, "int4", -1, int, 4);

    let uint2 = generateSystemType(scope, "uint2", -1, uint, 2);
    let uint3 = generateSystemType(scope, "uint3", -1, uint, 3);
    let uint4 = generateSystemType(scope, "uint4", -1, uint, 4);

    let bool2 = generateSystemType(scope, "bool2", -1, bool, 2);
    let bool3 = generateSystemType(scope, "bool3", -1, bool, 3);
    let bool4 = generateSystemType(scope, "bool4", -1, bool, 4);

    {
        let suf2f: IVariableDeclInstruction[] = [];
        // program.push(EScopeType.k_Struct);
        addFieldsToVectorFromSuffixObject(scope, suf2f, XYSuffix, "float");
        addFieldsToVectorFromSuffixObject(scope, suf2f, RGSuffix, "float");
        addFieldsToVectorFromSuffixObject(scope, suf2f, STSuffix, "float");
        // program.pop();
        suf2f.forEach(field => float2.addField(field));
    }

    {
        let suf3f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf3f, XYZSuffix, "float");
        addFieldsToVectorFromSuffixObject(scope, suf3f, RGBSuffix, "float");
        addFieldsToVectorFromSuffixObject(scope, suf3f, STPSuffix, "float");
        suf3f.forEach(field => float3.addField(field));
    }

    {
        let suf4f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf4f, XYZWSuffix, "float");
        addFieldsToVectorFromSuffixObject(scope, suf4f, RGBASuffix, "float");
        addFieldsToVectorFromSuffixObject(scope, suf4f, STPQSuffix, "float");
        suf4f.forEach(field => float4.addField(field));
    }

    if (USE_STRICT_HALF_TYPE) {
        let half2 = generateSystemType(scope, "half2", -1, half, 2);
        let half3 = generateSystemType(scope, "half3", -1, half, 3);
        let half4 = generateSystemType(scope, "half4", -1, half, 4);

        {
            let suf2f: IVariableDeclInstruction[] = [];
            // program.push(EScopeType.k_Struct);
            addFieldsToVectorFromSuffixObject(scope, suf2f, XYSuffix, "half");
            addFieldsToVectorFromSuffixObject(scope, suf2f, RGSuffix, "half");
            addFieldsToVectorFromSuffixObject(scope, suf2f, STSuffix, "half");
            // program.pop();
            suf2f.forEach(field => half2.addField(field));
        }

        {
            let suf3f: IVariableDeclInstruction[] = [];
            addFieldsToVectorFromSuffixObject(scope, suf3f, XYZSuffix, "half");
            addFieldsToVectorFromSuffixObject(scope, suf3f, RGBSuffix, "half");
            addFieldsToVectorFromSuffixObject(scope, suf3f, STPSuffix, "half");
            suf3f.forEach(field => half3.addField(field));
        }

        {
            let suf4f: IVariableDeclInstruction[] = [];
            addFieldsToVectorFromSuffixObject(scope, suf4f, XYZWSuffix, "half");
            addFieldsToVectorFromSuffixObject(scope, suf4f, RGBASuffix, "half");
            addFieldsToVectorFromSuffixObject(scope, suf4f, STPQSuffix, "half");
            suf4f.forEach(field => half4.addField(field));
        }
    }

    {
        let suf2i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf2i, XYSuffix, "int");
        addFieldsToVectorFromSuffixObject(scope, suf2i, RGSuffix, "int");
        addFieldsToVectorFromSuffixObject(scope, suf2i, STSuffix, "int");
        suf2i.forEach(field => int2.addField(field));
    }

    {
        let suf3i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf3i, XYZSuffix, "int");
        addFieldsToVectorFromSuffixObject(scope, suf3i, RGBSuffix, "int");
        addFieldsToVectorFromSuffixObject(scope, suf3i, STPSuffix, "int");
        suf3i.forEach(field => int3.addField(field));
    }

    {
        let suf4i: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf4i, XYZWSuffix, "int");
        addFieldsToVectorFromSuffixObject(scope, suf4i, RGBASuffix, "int");
        addFieldsToVectorFromSuffixObject(scope, suf4i, STPQSuffix, "int");
        suf4i.forEach(field => int4.addField(field));
    }

    {
        let suf2ui: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf2ui, XYSuffix, "uint");
        addFieldsToVectorFromSuffixObject(scope, suf2ui, RGSuffix, "uint");
        addFieldsToVectorFromSuffixObject(scope, suf2ui, STSuffix, "uint");
        suf2ui.forEach(field => uint2.addField(field));
    }

    {
        let suf3ui: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf3ui, XYZSuffix, "uint");
        addFieldsToVectorFromSuffixObject(scope, suf3ui, RGBSuffix, "uint");
        addFieldsToVectorFromSuffixObject(scope, suf3ui, STPSuffix, "uint");
        suf3ui.forEach(field => uint3.addField(field));
    }

    {
        let suf4ui: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf4ui, XYZWSuffix, "uint");
        addFieldsToVectorFromSuffixObject(scope, suf4ui, RGBASuffix, "uint");
        addFieldsToVectorFromSuffixObject(scope, suf4ui, STPQSuffix, "uint");
        suf4ui.forEach(field => uint4.addField(field));
    }

    {
        let suf2b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf2b, XYSuffix, "bool");
        addFieldsToVectorFromSuffixObject(scope, suf2b, RGSuffix, "bool");
        addFieldsToVectorFromSuffixObject(scope, suf2b, STSuffix, "bool");
        suf2b.forEach(field => bool2.addField(field));
    }

    {
        let suf3b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf3b, XYZSuffix, "bool");
        addFieldsToVectorFromSuffixObject(scope, suf3b, RGBSuffix, "bool");
        addFieldsToVectorFromSuffixObject(scope, suf3b, STPSuffix, "bool");
        suf3b.forEach(field => bool3.addField(field));
    }

    {
        let suf4b: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(scope, suf4b, XYZWSuffix, "bool");
        addFieldsToVectorFromSuffixObject(scope, suf4b, RGBASuffix, "bool");
        addFieldsToVectorFromSuffixObject(scope, suf4b, STPQSuffix, "bool");
        suf4b.forEach(field => bool4.addField(field));
    }
}
