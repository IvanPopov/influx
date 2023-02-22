import { IScope } from "@lib/idl/IInstruction";
import { defineTypeAlias, generateSystemType, USE_STRICT_HALF_TYPE } from "./utils";

export function addSystemTypeScalar(scope: IScope) {
    generateSystemType(scope, "void", 0);
    generateSystemType(scope, "int", 4);
    generateSystemType(scope, "uint", 4);
    generateSystemType(scope, "bool", 4);
    generateSystemType(scope, "float", 4);
    generateSystemType(scope, "string", 4/* pointer to string */);

    // TODO: use dedicated type for half
    defineTypeAlias(scope, "float", "half");
    console.assert(USE_STRICT_HALF_TYPE === false);
}

