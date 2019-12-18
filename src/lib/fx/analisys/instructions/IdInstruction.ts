import { EInstructionTypes, IIdInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface IIdInstructionSettings extends IInstructionSettings {
    name: string;
}

export class IdInstruction extends Instruction implements IIdInstruction {
    readonly name: string;

    constructor({ name, ...settings }: IIdInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Id, ...settings });
        this.name = name;
    }
    
    
    toString(): string {
        return this.name;
    }

    
    toCode(): string {
        return this.name;
    }
}

