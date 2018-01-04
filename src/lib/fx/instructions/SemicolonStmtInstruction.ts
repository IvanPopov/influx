import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";


/**
 * Represent empty statement only semicolon ;
 * ;
 */
export class SemicolonStmtInstruction extends StmtInstruction {
	constructor() {
		super();
		this._pInstructionList = null;
		this._eInstructionType = EAFXInstructionTypes.k_SemicolonStmtInstruction;
	}

	_toFinalCode(): string {
		return ";";
	}
}
