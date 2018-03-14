import { Instruction } from "./Instruction";
import { IInstructionSettings } from "./Instruction";
import { ISimpleInstruction, EInstructionTypes, IInstruction, ILiteralInstruction, IVariableDeclInstruction, ISamplerStateInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export interface ISamplerStateInstructionSettings extends IInstructionSettings {
    name: string;
    value: IInstruction;
}

export class SamplerStateInstruction extends Instruction implements ISamplerStateInstruction {
    protected _name: string;
    protected _value: IInstruction;

    constructor({ name, value, ...settings }: ISamplerStateInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SimpleInstruction, ...settings });
        
        this._name = name;
        this._value = value.$withParent(this);
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

