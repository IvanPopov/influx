import { assert } from "@lib/common";
import { TypeLayoutT } from "@lib/idl/bundles/FxBundle_generated";
import { IFunctionDefInstruction } from "@lib/idl/IInstruction";
import { typeAstToTypeLayout } from "./VM/native";

export interface IExternReflection {
    // type: 'fn';
    id: number;
    name: string;
    params: TypeLayoutT[];
    ret: TypeLayoutT;
}

export class Externs {
    funcs: IFunctionDefInstruction[] = [];

    add(fdef: IFunctionDefInstruction): number {
        let id = this.funcs.indexOf(fdef);
        if (id === -1) {
            id = this.funcs.length;
            this.funcs.push(fdef);
        }
        assert(this.funcs[id].instructionID === fdef.instructionID);
        return id;
    }

    dump(): IExternReflection[] {
        return this.funcs.map((fdef, id) => {
            const ret = typeAstToTypeLayout(fdef.returnType);
            const params = fdef.params.map(({ type }) => typeAstToTypeLayout(type));
            const name = fdef.name;
            return { id, name, ret, params };
        });
    }
}

