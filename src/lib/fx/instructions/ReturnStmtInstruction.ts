import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes, EFunctionType, IAFXTypedInstruction } from "../../idl/IAFXInstruction";
import { isNull } from "../../common";


/**
 * Represent return expr;
 * return ExprInstruction
 */
export class ReturnStmtInstruction extends StmtInstruction {
	private _isPositionReturn: boolean = false;
	private _isColorReturn: boolean = false;
	private _isOnlyReturn: boolean = false;

	constructor() {
		super();
		this._pInstructionList = [null];
		this._sOperatorName = "return";
		this._eInstructionType = EAFXInstructionTypes.k_ReturnStmtInstruction;
	}

	_prepareFor(eUsedMode: EFunctionType): void {
		var pReturn: IAFXTypedInstruction = <IAFXTypedInstruction>this._getInstructions()[0];
		if (isNull(pReturn)) {
			return;
		}

		if (eUsedMode === EFunctionType.k_Vertex) {
			if (pReturn._getType()._isBase()) {
				this._isPositionReturn = true;
			}
			else {
				this._isOnlyReturn = true;
			}
		}
		else if (eUsedMode === EFunctionType.k_Pixel) {
			this._isColorReturn = true;
		}

		for (var i: number = 0; i < this._nInstructions; i++) {
			this._pInstructionList[i]._prepareFor(eUsedMode);
		}
	}

	_toFinalCode(): string {
		if (this._isPositionReturn) {
			return "Out.POSITION=" + this._pInstructionList[0]._toFinalCode() + "; return;";
		}
		if (this._isColorReturn) {
			//return "gl_FragColor=" + this._pInstructionList[0]._toFinalCode() + "; return;";
			return "resultAFXColor=" + this._pInstructionList[0]._toFinalCode() + "; return;";
		}
		if (this._isOnlyReturn) {
			return "return;"
		}

		if (this._nInstructions > 0) {
			return "return " + this._pInstructionList[0]._toFinalCode() + ";";
		}
		else {
			return "return;";
		}
	}
}

