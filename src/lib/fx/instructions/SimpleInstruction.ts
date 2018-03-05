import { Instruction } from "./Instruction";
import { ISimpleInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class SimpleInstruction extends Instruction implements ISimpleInstruction {
    private _value: string;

    constructor(pNode: IParseNode, value: string) {
        super(pNode, EInstructionTypes.k_SimpleInstruction);
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

