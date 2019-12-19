import { IFunctionDefInstruction, IVariableDeclInstruction, ITypeInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { type } from "@lib/fx/analisys/helpers";
import { isNull } from "@lib/common";

export namespace fn {

    function signatureParam(param: IVariableDeclInstruction, strong: boolean): string {
        return `${type.signature(param.type, strong)}${param.initExpr ? '?' : ''}`;
    }

    export function signature(def: IFunctionDefInstruction, strong: boolean = false): string {
        const { name, params } = def;
        return `${name}(${params.map(param => signatureParam(param, strong)).join(', ')})`;
    }

    export function signatureEx(def: IFunctionDefInstruction, strong: boolean = false): string {
        const { name, returnType, params } = def;
        return `${type.signature(returnType, strong)} ${name}(${params.map(param => signatureParam(param, strong)).join(', ')})`;
    }


    export function numArgsRequired(def: IFunctionDefInstruction): number {
        return def.params.filter((param) => !param || !param.initExpr).length;
    }


    export function match(def: IFunctionDefInstruction, args: ITypeInstruction[], strong: boolean = false): boolean {
        if (!strong && isNull(args)) {
            return true;
        }

        if (args.length > def.params.length || numArgsRequired(def) > args.length) {
            return false;
        }


        return args.every((arg, i) => (!strong && isNull(arg)) ||
            (!strong && isNull(def.params[i].type)) ||
            type.equals(arg, def.params[i].type, strong));
    }


    /**
     * Find function by name and list of types.
     * returns:
     *   'null' if there is no requested function; 
     *   'undefined' if there more then one function; 
     *    function if all is ok;
     */
    export function matchList(funcList: IFunctionDeclInstruction[],
        args: ITypeInstruction[],
        strong: boolean = false): IFunctionDeclInstruction | null | undefined {

        if (!funcList) {
            return null;
        }

        const res = funcList.filter(func => fn.match(func.def, args, strong));
        if (res.length > 1) {
            return undefined;
        }

        if (res.length === 1) {
            return res[0];
        }

        return null;
    }
}