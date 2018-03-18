import { Instruction } from "./Instruction";
import { IInstructionSettings } from "./Instruction";
import { IProvideInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export interface IProvideInstructionSettings extends IInstructionSettings {
    moduleName: string;
}

export class ProvideInstruction extends Instruction implements IProvideInstruction {
    protected _value: string;

    constructor({ moduleName, ...settings }: IProvideInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ProvideInstruction, ...settings });
        
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

