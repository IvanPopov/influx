import { EInstructionTypes, IProvideInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface IProvideInstructionSettings extends IInstructionSettings {
    moduleName: string;
}

export class ProvideInstruction extends Instruction implements IProvideInstruction {
    protected _value: string;

    constructor({ moduleName, ...settings }: IProvideInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Provide, ...settings });
        
        this._value = moduleName;
    }

    get moduleName(): string {
        return this._value;
    }

    toString(): string {
        return this._value;
    }

    toCode(): string {
        return this._value;
    }
}

