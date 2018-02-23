import { ExprInstruction } from "./ExprInstruction";
import { IAFXVariableDeclInstruction, EAFXInstructionTypes, IAFXExprInstruction, EVarUsedMode, IAFXTypeUseInfoContainer } from "../../idl/IAFXInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent someExpr[someIndex]
 * EMPTY_OPERATOR Instruction ExprInstruction
 */
export class PostfixIndexInstruction extends ExprInstruction {
	private _pSamplerArrayDecl: IAFXVariableDeclInstruction = null;

	constructor(pNode: IParseNode) {
		super(pNode);
		this._pInstructionList = [null, null];
		this._eInstructionType = EAFXInstructionTypes.k_PostfixIndexInstruction;
	}

	toCode(): string {
		var sCode: string = "";

		if (!isNull(this._pSamplerArrayDecl) && this._pSamplerArrayDecl.isDefinedByZero()) {
			sCode += this.instructions[0].toCode();
		}
		else {
			sCode += this.instructions[0].toCode();

			if (!(<IAFXExprInstruction>this.instructions[0]).type.collapsed) {
				sCode += "[" + this.instructions[1].toCode() + "]";
			}
		}

		return sCode;
	}

	addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
		eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
		var pSubExpr: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[0];
		var pIndex: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[1];

		pSubExpr.addUsedData(pUsedDataCollector, eUsedMode);
		pIndex.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);

		if (pSubExpr.type.isFromVariableDecl() && pSubExpr.type.isSampler()) {
			this._pSamplerArrayDecl = pSubExpr.type.parentVarDecl;
		}
	}

	isConst(): boolean {
		return (<IAFXExprInstruction>this.instructions[0]).isConst() &&
			(<IAFXExprInstruction>this.instructions[1]).isConst();
	}
}


