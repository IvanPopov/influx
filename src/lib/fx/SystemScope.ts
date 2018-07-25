import { Scope } from "./ProgramScope";
import { EScopeType, ITypeInstruction, IVariableDeclInstruction, 
    ITypeDeclInstruction, IFunctionDeclInstruction, IExprInstruction, 
    IVariableTypeInstruction, EInstructionTypes, ITechniqueInstruction, ITypedInstruction, IScope } from "../idl/IInstruction";
import { SystemTypeInstruction } from "./instructions/SystemTypeInstruction";
import { TypeDeclInstruction } from "./instructions/TypeDeclInstruction";
import { VariableTypeInstruction } from "./instructions/VariableTypeInstruction";
import { assert, isNull } from "../common";
import { IdInstruction } from "./instructions/IdInstruction";
import { VariableDeclInstruction } from "./instructions/VariableDeclInstruction";
import { IMap } from "../idl/IMap";
import { SystemFunctionInstruction } from "./instructions/SystemFunctionInstruction";
import { ILoggerEntity } from "../idl/ILogger";
import { EAnalyzerErrors, EAnalyzerWarnings } from '../idl/EAnalyzerErrors';
import { FunctionDeclInstruction } from "./instructions/FunctionDeclInstruction";
import { FunctionDefInstruction } from "./instructions/FunctionDefInstruction";

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


function generateSystemType(name: string, size: number = 0, elementType: ITypeInstruction = null,
    length: number = 1, fields: IVariableDeclInstruction[] = []): SystemTypeInstruction {

    if (getSystemType(name)) {
        console.error(`type already exists: ${name}`);
        return null;
    }

    const type = new SystemTypeInstruction({ scope, name, elementType, length, fields, size });
    scope.addType(type);

    return type;
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
    let bool = getSystemType("bool");

    let float2 = generateSystemType("float2", -1, float, 2);
    let float3 = generateSystemType("float3", -1, float, 3);
    let float4 = generateSystemType("float4", -1, float, 4);

    let int2 = generateSystemType("int2", -1, int, 2);
    let int3 = generateSystemType("int3", -1, int, 3);
    let int4 = generateSystemType("int4", -1, int, 4);

    let bool2 = generateSystemType("bool2", -1, bool, 2);
    let bool3 = generateSystemType("bool3", -1, bool, 3);
    let bool4 = generateSystemType("bool4", -1, bool, 4);

    {
        let suf2f: IVariableDeclInstruction[] = [];
        addFieldsToVectorFromSuffixObject(suf2f, XYSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf2f, RGSuffix, "float");
        addFieldsToVectorFromSuffixObject(suf2f, STSuffix, "float");
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
    translationExpr: string,
    returnTypeName: string,
    paramTypeNames: string[],
    templateTypes: string[],
    isForVertex: boolean = true,
    isForPixel: boolean = true): void {
    const builtIn = true;

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


function addSystemFunctions(): void {
    generateSystemFunction("dot", "dot($1,$2)", "float", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("mul", "$1*$2", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "int", "float2", "float3", "float4"]);
    generateSystemFunction("mod", "mod($1,$2)", "float", ["float", "float"], null);
    generateSystemFunction("floor", "floor($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("ceil", "ceil($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("fract", "fract($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("abs", "abs($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("sign", "sign($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("normalize", "normalize($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("length", "length($1)", "float", [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("cross", "cross($1, $2)", "float3", ["float3", "float3"], null);
    generateSystemFunction("reflect", "reflect($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("max", "max($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("max", "max($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("min", "min($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("min", "min($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("mix", "mix($1,$2,$3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("mix", "mix($1,$2,$3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("clamp", "clamp($1,$2,$3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("clamp", "clamp($1,$2,$3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float", "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("pow", "pow($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("mod", "mod($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "float3", "float4"]);
    generateSystemFunction("mod", "mod($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);
    generateSystemFunction("exp", "exp($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("exp2", "exp2($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("log", "log($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("log2", "log2($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("inversesqrt", "inversesqrt($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("sqrt", "sqrt($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction("all", "all($1)", "bool", [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);
    generateSystemFunction("any", "any($1)", "bool", [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);
    generateSystemFunction("not", "not($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction("distance", "distance($1,$2)", "float", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction("lessThan", "lessThan($1,$2)", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("lessThan", "lessThan($1,$2)", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("lessThan", "lessThan($1,$2)", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4"]);

    generateSystemFunction("lessThanEqual", "lessThanEqual($1,$2)", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("lessThanEqual", "lessThanEqual($1,$2)", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("lessThanEqual", "lessThanEqual($1,$2)", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4"]);

    generateSystemFunction("equal", "equal($1,$2)", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("equal", "equal($1,$2)", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("equal", "equal($1,$2)", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4"]);
    generateSystemFunction("equal", "equal($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction("notEqual", "notEqual($1,$2)", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("notEqual", "notEqual($1,$2)", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("notEqual", "notEqual($1,$2)", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4"]);
    generateSystemFunction("notEqual", "notEqual($1,$2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["bool2", "bool3", "bool4"]);

    generateSystemFunction("greaterThan", "greaterThan($1,$2)", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("greaterThan", "greaterThan($1,$2)", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("greaterThan", "greaterThan($1,$2)", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4"]);

    generateSystemFunction("greaterThanEqual", "greaterThanEqual($1,$2)", "bool2", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float2", "int2"]);
    generateSystemFunction("greaterThanEqual", "greaterThanEqual($1,$2)", "bool3", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float3", "int3"]);
    generateSystemFunction("greaterThanEqual", "greaterThanEqual($1,$2)", "bool4", [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float4", "int4"]);


    generateSystemFunction("radians", "radians($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("degrees", "degrees($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("sin", "sin($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("cos", "cos($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("tan", "tan($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("asin", "asin($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("acos", "acos($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("atan", "atan($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("atan", "atan($1, $2)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);

    generateSystemFunction("tex2D", "texture2D($1,$2)", "float4", ["sampler", "float2"], null);
    generateSystemFunction("tex2D", "texture2D($1,$2)", "float4", ["sampler2D", "float2"], null);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2)", "float4", ["sampler", "float3"], null);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2)", "float4", ["sampler2D", "float3"], null);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2)", "float4", ["sampler", "float4"], null);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2)", "float4", ["sampler2D", "float4"], null);
    generateSystemFunction("texCUBE", "textureCube($1,$2)", "float4", ["sampler", "float3"], null);
    generateSystemFunction("texCUBE", "textureCube($1,$2)", "float4", ["samplerCUBE", "float3"], null);

    generateSystemFunction("tex2D", "texture2D($1,$2,$3)", "float4", ["sampler", "float2", "float"], null, false, true);
    generateSystemFunction("tex2D", "texture2D($1,$2,$3)", "float4", ["sampler2D", "float2", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2,$3)", "float4", ["sampler", "float3", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2,$3)", "float4", ["sampler2D", "float3", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2,$3)", "float4", ["sampler", "float4", "float"], null, false, true);
    generateSystemFunction("tex2DProj", "texture2DProj($1,$2,$3)", "float4", ["sampler2D", "float4", "float"], null, false, true);
    generateSystemFunction("texCUBE", "textureCube($1,$2,$3)", "float4", ["sampler", "float3", "float"], null, false, true);
    generateSystemFunction("texCUBE", "textureCube($1,$2,$3)", "float4", ["samplerCUBE", "float3", "float"], null, false, true);

    generateSystemFunction("tex2DLod", "texture2DLod($1,$2,$3)", "float4", ["sampler", "float2", "float"], null, true, false);
    generateSystemFunction("tex2DLod", "texture2DLod($1,$2,$3)", "float4", ["sampler2D", "float2", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "texture2DProjLod($1,$2,$3)", "float4", ["sampler", "float3", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "texture2DProjLod($1,$2,$3)", "float4", ["sampler2D", "float3", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "texture2DProjLod($1,$2,$3)", "float4", ["sampler", "float4", "float"], null, true, false);
    generateSystemFunction("tex2DProjLod", "texture2DProjLod($1,$2,$3)", "float4", ["sampler2D", "float4", "float"], null, true, false);
    generateSystemFunction("texCUBELod", "textureCubeLod($1,$2,$3)", "float4", ["sampler", "float3", "float"], null, true, false);
    generateSystemFunction("texCUBELod", "textureCubeLod($1,$2,$3)", "float4", ["samplerCUBE", "float3", "float"], null, true, false);

    //OES_standard_derivatives

    generateSystemFunction("dFdx", "dFdx($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("dFdy", "dFdy($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("width", "width($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("fwidth", "fwidth($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    // generateSystemFunction("smoothstep", "smoothstep($1, $2, $3)", "float3", ["float3", "float3", "float3"], null);

    generateSystemFunction("smoothstep", "smoothstep($1, $2, $3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("smoothstep", "smoothstep($1, $2, $3)", TEMPLATE_TYPE, ["float", "float", TEMPLATE_TYPE], ["float2", "float3", "float4"]);

    generateSystemFunction("frac", "fract($1)", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("lerp", "mix($1,$2,$3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
    generateSystemFunction("lerp", "mix($1,$2,$3)", TEMPLATE_TYPE, [TEMPLATE_TYPE, TEMPLATE_TYPE, "float"], ["float2", "float3", "float4"]);

    generateSystemFunction("saturate", "max(0., min(1., $1))", TEMPLATE_TYPE, [TEMPLATE_TYPE], ["float", "float2", "float3", "float4"]);
}



function generateSystemVariable(name: string, typeName: string,
    isForVertex: boolean, isForPixel: boolean, readonly: boolean): void {

    if (scope.hasVariable(name)) {
        return;
    }

    let id = new IdInstruction({ scope, name });
    let type = new VariableTypeInstruction({ scope, type: getSystemType(typeName), writable: readonly });
    let variableDecl = new VariableDeclInstruction({ scope, id, type, builtIn: true });

    variableDecl.$makeVertexCompatible(isForVertex);
    variableDecl.$makePixelCompatible(isForPixel);

    scope.addVariable(variableDecl);
}


function getSystemType(typeName: string): SystemTypeInstruction {
    //boolean, string, float and others
    let type = <SystemTypeInstruction>scope.findType(typeName);
    assert(!type || (type.instructionType === EInstructionTypes.k_SystemTypeInstruction));
    return type;
}


function addSystemVariables(): void {
    // generateSystemVariable("fragColor", "gl_FragColor", "float4", false, true, true);
    // generateSystemVariable("fragCoord", "gl_FragCoord", "float4", false, true, true);
    // generateSystemVariable("frontFacing", "gl_FrontFacing", "bool", false, true, true);
    // generateSystemVariable("pointCoord", "gl_PointCoord", "float2", false, true, true);
}


function initSystemTypes(): void {
    addSystemTypeScalar();
    addSystemTypeVector();
    addSystemTypeMatrix();
}


function initSystemFunctions(): void {
    addSystemFunctions();
}


function initSystemVariables(): void {
    addSystemVariables();
}


initSystemTypes();
initSystemFunctions();
initSystemVariables();

/**
 * Export API
 */

export const SCOPE = scope;

export const T_VOID = scope.findType("void");

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

export const T_INT2X2 = scope.findType("int2x2");
export const T_INT3X3 = scope.findType("int3x3");
export const T_INT4X4 = scope.findType("int4x4");

export const T_SAMPLER = scope.findType("sampler");
export const T_SAMPLER_2D = scope.findType("sampler2D");
export const T_SAMPLER_CUBE = scope.findType("samplerCUBE");

export const findType = (typeName: string) => scope.findType(typeName);
export const findVariable = (varName: string) => scope.findVariable(varName);
export const findTechnique = (techName: string) => scope.findTechnique(techName);
export const findFunction = (funcName: string, args?: ITypedInstruction[]) => scope.findFunction(funcName, args);
export const findShaderFunction = (funcName: string, args?: ITypedInstruction[]) => scope.findShaderFunction(funcName, args);

export const hasType = (typeName: string) => scope.hasType(typeName);
export const hasVariable = (varName: string) => scope.hasVariable(varName);
export const hasTechnique = (techName: string) => scope.hasTechnique(techName);

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
        type.isEqual(getSystemType("int4"));
}


export function isScalarType(type: ITypeInstruction): boolean {
    return type.isEqual(T_BOOL) ||
        type.isEqual(T_INT) ||
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



export function getExternalType(type: ITypeInstruction): any {
    if (type.isEqual(T_INT) ||
        type.isEqual(T_FLOAT)) {
        return Number;
    }
    else if (type.isEqual(T_BOOL)) {
        return "Boolean";
    }
    else if (type.isEqual(T_FLOAT2) ||
        type.isEqual(T_BOOL2) ||
        type.isEqual(T_INT2)) {
        return "Vec2";
    }
    else if (type.isEqual(T_FLOAT3) ||
        type.isEqual(T_BOOL3) ||
        type.isEqual(T_INT3)) {
        return "Vec3";
    }
    else if (type.isEqual(T_FLOAT4) ||
        type.isEqual(T_BOOL4) ||
        type.isEqual(T_INT4)) {
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
