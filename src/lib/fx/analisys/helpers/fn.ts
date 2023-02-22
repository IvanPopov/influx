import { IFunctionDefInstruction, IVariableDeclInstruction, ITypeInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { types } from "@lib/fx/analisys/helpers";
import { isNull } from "@lib/common";

export namespace fn {

    function signatureParam(param: IVariableDeclInstruction, strong: boolean): string {
        return `${types.signature(param.type, strong)}${param.initExpr ? '?' : ''}`;
    }

    export function signature(def: IFunctionDefInstruction, strong: boolean = false): string {
        const { name, params } = def;
        return `${name}(${params.map(param => signatureParam(param, strong)).join(', ')})`;
    }

    export function signatureEx(def: IFunctionDefInstruction, strong: boolean = false): string {
        const { name, returnType, params } = def;
        return `${types.signature(returnType, strong)} ${name}(${params.map(param => signatureParam(param, strong)).join(', ')})`;
    }


    export function numArgsRequired(def: IFunctionDefInstruction): number {
        return def.params.filter((param) => !param || !param.initExpr).length;
    }


    // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    export function match(def: IFunctionDefInstruction, args: Array<ITypeInstruction | RegExp>, strong: boolean = false): boolean {
        if (!strong && isNull(args)) {
            return true;
        }

        if (args.length > def.params.length || numArgsRequired(def) > args.length) {
            return false;
        }

        return args.every((arg, i) => 
            (!strong && isNull(arg)) ||
            (!strong && isNull(def.params[i].type)) ||
            types.equals(arg, def.params[i].type, strong)
        );
    }


    /**
     * Find function by name and list of types.
     * returns:
     *   'null' if there is no requested function; 
     *   'undefined' if there more then one function; 
     *    function if all is ok;
     */
    // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    export function matchList(funcList: IFunctionDeclInstruction[],
        args: Array<ITypeInstruction | RegExp>,
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