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


    export interface IRegister {
        type: 'u' | 'b' | 't' | 's' | null;
        index: number;
        // space ?
    };

    export function resolveRegister(decl: IVariableDeclInstruction): IRegister {
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

        if (decl.type.isUAV()) {
            assert(type === null || type === 'u');
            type = 'u';
        }

        if (decl.type.isTexture()) {
            assert(type === null || type === 't');
            type = 't';
        }

        if (decl.type.isSampler()) {
            assert(type === null || type === 's');
            type = 's';
        }

        // TODO: buffers

        return { type, index };
    }
}