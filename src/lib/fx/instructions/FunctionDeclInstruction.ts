import { EInstructionTypes, IFunctionDeclInstruction, IFunctionDefInstruction, IIdInstruction, IStmtBlockInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";
import { assert, isNull } from "@lib/common";


export interface IFunctionDeclInstructionSettings extends IDeclInstructionSettings {
    definition: IFunctionDefInstruction;
    implementation?: IStmtBlockInstruction;
}


/**
 * Represent type func(...args)[:Semantic] [<Annotation> {stmts}]
 * EMPTY_OPERTOR FunctionDefInstruction StmtBlockInstruction
 */
export class FunctionDeclInstruction extends DeclInstruction implements IFunctionDeclInstruction {
    protected _definition: IFunctionDefInstruction;
    protected _implementation: IStmtBlockInstruction;

    constructor({ definition, implementation = null, ...settings }: IFunctionDeclInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionDeclInstruction, ...settings });

        this._definition = Instruction.$withParent(definition, this);
        this._implementation = Instruction.$withParent(implementation, this);
    }


    get impl(): IStmtBlockInstruction {
        return this._implementation;
    }


    get def(): IFunctionDefInstruction {
        return this._definition;
    }


    get arguments(): IVariableDeclInstruction[] {
        console.error("@not_implemented");
        return null;
    }

    // shortcut for definition.name
    get name(): string {
        return this.def.name;
    }


    // shortcut for definition.id
    get id(): IIdInstruction {
        return this.def.id;
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

    // $setImplementation(impl: IStmtBlockInstruction): void {
    //     assert(isNull(this.implementation));
    //     this._implementation = impl;
    // }
}
