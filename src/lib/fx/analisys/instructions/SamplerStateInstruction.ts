import { EInstructionTypes, IInstruction, ISamplerStateInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface ISamplerStateInstructionSettings extends IInstructionSettings {
    name: string;
    value: IInstruction;
}

export class SamplerStateInstruction extends Instruction implements ISamplerStateInstruction {
    protected _name: string;
    protected _value: IInstruction;

    constructor({ name, value, ...settings }: ISamplerStateInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SamplerState, ...settings });
        
        this._name = name;
        this._value = Instruction.$withParent(value, this);
    }

    
    get name(): string {
        return this._name;
    }

    
    get value(): IInstruction {
        return this.value;
    }


    toString(): string {
        console.error("@not_implemented");
        return null;
    }

    toCode(): string {
        console.error("@not_implmented");
        return null;
    }
}

