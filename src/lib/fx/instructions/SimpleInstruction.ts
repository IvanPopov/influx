import { EInstructionTypes, ISimpleInstruction } from "@lib/idl/IInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface ISimpleInstructionSettings extends IInstructionSettings {
    value: string;
}

// TODO: remove it? (no one uses it)
export class SimpleInstruction extends Instruction implements ISimpleInstruction {
    readonly value: string;

    constructor({ value, ...settings }: ISimpleInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Simple, ...settings });
        this.value = value;
    }

    toString(): string {
        return this.value;
    }

    toCode(): string {
        return this.value;
    }
}

