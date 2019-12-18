import { EInstructionTypes, IKeywordInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

interface IKeywordInstructionSettings extends IInstructionSettings {
    keyword: string;
}

// TODO: remove it? (no one use it)
export class KeywordInstruction extends Instruction implements IKeywordInstruction {
    readonly value: string;

    constructor({ keyword, ...settings }: IKeywordInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Keyword, ...settings });

        this.value = keyword;
    }


    toString(): string {
        return this.value;
    }

    
    toCode(): string {
        return this.value;
    }
}
