import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, IAFXTypeUseInfoContainer, EVarUsedMode, IAFXExprInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";


/**
 * Represent someExpr == != < > <= >= someExpr
 * (==|!=|<|>|<=|>=) Instruction Instruction
 */
export class RelationalExprInstruction extends ExprInstruction {
	constructor() {
		super();
		this._pInstructionList = [null, null];
		this._eInstructionType = EAFXInstructionTypes.k_RelationalExprInstruction;
	}

	_toFinalCode(): string {
		var sCode: string = "";
		sCode += this._getInstructions()[0]._toFinalCode();
		sCode += this._getOperator();
		sCode += this._getInstructions()[1]._toFinalCode();
		return sCode;
	}

	_addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
		eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
		super._addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
	}

	_isConst(): boolean {
		return (<IAFXExprInstruction>this._getInstructions()[0])._isConst() &&
			(<IAFXExprInstruction>this._getInstructions()[1])._isConst();
	}
}


