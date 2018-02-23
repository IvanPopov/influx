import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent empty statement only semicolon ;
 * ;
 */
export class SemicolonStmtInstruction extends StmtInstruction {
	constructor(pNode: IParseNode) {
		super(pNode);
		this._pInstructionList = null;
		this._eInstructionType = EAFXInstructionTypes.k_SemicolonStmtInstruction;
	}

	toCode(): string {
		return ";";
	}
}
