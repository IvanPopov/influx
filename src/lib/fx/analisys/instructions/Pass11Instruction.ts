import { isNull } from "@lib/common";
import { EInstructionTypes, IIdInstruction, IPass11Instruction, IStmtBlockInstruction } from "@lib/idl/IInstruction";

import { DeclInstruction, IDeclInstructionSettings } from "./DeclInstruction";
import { Instruction } from "./Instruction";

export interface IPassInstructionSettings extends IDeclInstructionSettings {
    id?: IIdInstruction;
    impl: IStmtBlockInstruction;
}


export class Pass11Instruction extends DeclInstruction implements IPass11Instruction {
    protected _id: IIdInstruction;
    protected _impl: IStmtBlockInstruction;

    constructor({ id = null, impl = null, ...settings }: IPassInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Pass11Decl, ...settings });

        this._impl = Instruction.$withParent(impl, this);
        this._id = id;
    }


    get id(): IIdInstruction {
        return this._id;
    }


    get name(): string {
        if (isNull(this._id)) {
            return null;
        }
        return this._id.name;
    }


    get impl(): IStmtBlockInstruction {
        return this._impl;
    }
}

