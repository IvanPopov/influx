import { Instruction } from "./Instruction";
import { ISimpleInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class SimpleInstruction extends Instruction implements ISimpleInstruction {
    private _sValue: string;

    constructor(sValue: string, pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_SimpleInstruction);
        this._sValue = sValue;
    }

    set value(sValue: string) {
        this._sValue = sValue;
    }

    get value(): string {
        return this.value;
    }

    toString(): string {
        return this._sValue;
    }

    toCode(): string {
        return this._sValue;
    }
}

