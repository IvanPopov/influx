import { EInstructionTypes, IKeywordInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

interface IKeywordInstructionSettings extends IInstructionSettings {
    keyword: string;
}

// TODO: remove it? (no one use it)
export class KeywordInstruction extends Instruction implements IKeywordInstruction {
    protected _value: string;

    constructor({ keyword, ...settings }: IKeywordInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Keyword, ...settings });

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
