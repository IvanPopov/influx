import { Instruction } from "./Instruction";
import { IInstructionSettings } from "./Instruction";
import { ISimpleInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export interface ISimpleInstructionSettings extends IInstructionSettings {
    value: string;
}

export class SimpleInstruction extends Instruction implements ISimpleInstruction {
    protected _value: string;

    constructor({ value, ...settings }: ISimpleInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SimpleInstruction, ...settings });
        
        this._value = value;
    }

    get value(): string {
        return this.value;
    }

    toString(): string {
        return this._value;
    }

    toCode(): string {
        return this._value;
    }
}

