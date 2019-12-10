import { EInstructionTypes, IIdInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface IIdInstructionSettings extends IInstructionSettings {
    name: string;
}

export class IdInstruction extends Instruction implements IIdInstruction {
    protected _name: string;

    constructor({ name, ...settings }: IIdInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Id, ...settings });
        
        this._name = name;
    }
    

    get name(): string {
        return this._name;
    }


    toString(): string {
        return this._name;
    }


    toCode(): string {
        return this.name;
    }
}

