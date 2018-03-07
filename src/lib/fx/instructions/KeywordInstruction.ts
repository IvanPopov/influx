import { EInstructionTypes, IKeywordInstruction } from "../../idl/IInstruction";
import { IInstructionSettings } from "./Instruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

interface IKeywordInstructionSettings extends IInstructionSettings {
    keyword: string;
}

export class KeywordInstruction extends Instruction implements IKeywordInstruction {
    protected _value: string;

    constructor({ keyword, ...settings }: IKeywordInstructionSettings) {
        super({ instrType: EInstructionTypes.k_KeywordInstruction, ...settings });

        this._value = keyword;
    }


    get value(): string {
        return this._value;
    }


    toString(): string {
        return this._value;
    }

    
    toCode(): string {
        return this._value;
    }
}
