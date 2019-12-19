import { assert } from "@lib/common";
import { EInstructionTypes, IFunctionDefInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { type } from "./type";

export namespace variable {
    /**
 * @param decl Variable declaraion (decl.isParameter() must be true).
 * @returns Serial number of the declaration among the function parameters or -1 otherwise.
 */
    export function parameterIndex(decl: IVariableDeclInstruction): number {
        if (!decl.isParameter()) {
            console.error('invalid call.');
            return -1;
        }
        // all parameters must be a children on function definition!
        assert(decl.parent.instructionType === EInstructionTypes.k_FunctionDef);
        return (<IFunctionDefInstruction>decl.parent).params.indexOf(decl);
    }

    /**
     * @returns Offset in bytes from the beginning of the parameters' list.
     */
    export function parameterOffset(decl: IVariableDeclInstruction): number {
        // todo: add support for 'inout', 'out' usages 
        if (!decl.isParameter()) {
            console.error('invalid call.');
            return 0;
        }

        let idx = parameterIndex(decl);
        let offset = 0;
        for (let i = 0; i < idx; ++i) {
            offset += (<IFunctionDefInstruction>decl.parent).params[i].type.size;
        }
        return offset;
    }

        /**
     * Helper:
     *  Returns 'structName.fieldName' for structs;
     *  Returns 'varName' for variables;
     */
    export function fullName(decl: IVariableDeclInstruction) {
        if (decl.isField() &&
            type.findParentVariableDecl(<IVariableTypeInstruction>decl.parent)) {

            let name = '';
            let parentType = decl.parent.instructionType;

            if (parentType === EInstructionTypes.k_VariableType) {
                name = type.resolveVariableDeclFullName(<IVariableTypeInstruction>decl.parent);
            }

            name += '.' + decl.name;
            return name;
        }
        return decl.name;
    }
}