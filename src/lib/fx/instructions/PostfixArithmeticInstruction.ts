import { IAFXExprInstruction, EVarUsedMode, IAFXTypeUseInfoContainer, EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";


/**
 * Represent someExpr ++
 * (-- | ++) Instruction
 */
export class PostfixArithmeticInstruction extends ExprInstruction {
	constructor(pNode: IParseNode) {
		super(pNode);
		this._pInstructionList = [null];
		this._eInstructionType = EAFXInstructionTypes.k_PostfixArithmeticInstruction;
	}

	toCode(): string {
		var sCode: string = "";

		sCode += this.instructions[0].toCode();
		sCode += this.operator;

		return sCode;
	}

	addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
		eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
		var pSubExpr: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[0];
		pSubExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
	}

	isConst(): boolean {
		return (<IAFXExprInstruction>this.instructions[0]).isConst();
	}
}

