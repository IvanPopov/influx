import { EAFXInstructionTypes, IAFXKeywordInstruction } from "../../idl/IAFXInstruction";
import { Instruction } from "./Instruction";
import { IParseNode } from "../../idl/parser/IParser";

export class KeywordInstruction extends Instruction implements IAFXKeywordInstruction {
	private _sValue: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
	constructor(pNode: IParseNode) {
		super(pNode);
		this._sValue = "";
		this._eInstructionType = EAFXInstructionTypes.k_KeywordInstruction;
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
