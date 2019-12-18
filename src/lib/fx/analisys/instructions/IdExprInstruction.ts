import { EInstructionTypes, IIdExprInstruction, IIdInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IIdExprInstructionSettings extends IInstructionSettings {
    id: IIdInstruction;
    decl: IVariableDeclInstruction;
}


export class IdExprInstruction extends ExprInstruction implements IIdExprInstruction {
    readonly id: IIdInstruction;
    // helpers
    readonly decl: IVariableDeclInstruction; // << move to resolveDecl() method.

    constructor({ id, decl, ...settings }: IIdExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IdExpr, type: decl.type, ...settings });

        this.id = Instruction.$withParent(id, this);
        this.decl = decl;
    }


    get name(): string {
        return this.id.name;
    }


    isConst(): boolean {
        return this.type.isConst();
    }


    /** @deprecated */
    evaluate(): boolean {
        return false;
    }


    toCode(): string {
        return this.decl.id.toCode();
    }
}

