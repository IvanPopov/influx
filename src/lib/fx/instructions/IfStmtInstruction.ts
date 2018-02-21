import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent if(expr) stmt or if(expr) stmt else stmt
 * ( if || if_else ) Expr Stmt [Stmt]
 */
export class IfStmtInstruction extends StmtInstruction {
	constructor(pNode: IParseNode) {
		super(pNode);
		this._pInstructionList = [null, null, null];
		this._eInstructionType = EAFXInstructionTypes.k_IfStmtInstruction;
	}

	toCode(): string {
		var sCode: string = "";
		if (this.operator === "if") {
			sCode += "if(";
			sCode += this.instructions[0].toCode() + ")";
			sCode += this.instructions[1].toCode();
		}
		else {
			sCode += "if(";
			sCode += this.instructions[0].toCode() + ") ";
			sCode += this.instructions[1].toCode();
			sCode += "else ";
			sCode += this.instructions[2].toCode();
		}

		return sCode;
	}
}

