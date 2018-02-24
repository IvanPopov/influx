import { EInstructionTypes, IKeywordInstruction } from "../../idl/IInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class KeywordInstruction extends Instruction implements IKeywordInstruction {
    private _sValue: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_KeywordInstruction);
        this._sValue = "";
    }

    set value(sValue: string) {
        this._sValue = sValue;
    }

    get value(): string {
        return this._sValue;
    }

    toString(): string {
        return this._sValue;
    }

    toCode(): string {
        return this._sValue;
    }
}
