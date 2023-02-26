import { EInstructionTypes, IAttributeInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdInstruction, IStmtBlockInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface IFunctionDeclInstructionSettings extends IDeclInstructionSettings {
    def: IFunctionDefInstruction;
    impl?: IStmtBlockInstruction;
    attrs?: IAttributeInstruction[];
}


/**
 * Represent type func(...args)[:Semantic] [<Annotation> {stmts}]
 * EMPTY_OPERTOR FunctionDefInstruction StmtBlockInstruction
 */
export class FunctionDeclInstruction extends DeclInstruction implements IFunctionDeclInstruction {
    readonly def: IFunctionDefInstruction;
    readonly impl: IStmtBlockInstruction;
    readonly attrs: IAttributeInstruction[];
    

    constructor({ def, impl = null, attrs = null, ...settings }: IFunctionDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDecl, ...settings });

        this.def = Instruction.$withParent(def, this);
        this.impl = Instruction.$withParent(impl, this);
        this.attrs = (attrs || []).map(attr => Instruction.$withParent(attr, this));
    }


    get name(): string {
        return this.def.name;
    }


    get id(): IIdInstruction {
        return this.def.id;
    }


    get semantic(): string {
        return this.def.semantic;
    }


    toCode(): string {
        let code = '';
        code += this.def.toCode();
        if (this.impl) {
            code += this.impl.toCode();
        } else {
            code += ';';
        }
        return code;
    }
}
