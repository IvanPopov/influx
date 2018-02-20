import { EAFXInstructionTypes, IAFXFunctionDeclInstruction, IAFXIdExprInstruction, IAFXTypeUseInfoContainer, EVarUsedMode, IAFXExprInstruction, IAFXVariableDeclInstruction } from "../../idl/IAFXInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { IdExprInstruction } from "./IdExprInstruction";


/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends IdExprInstruction {
	constructor(pNode: IParseNode) {
		super(pNode);
		this._pInstructionList = [null];
		this._eInstructionType = EAFXInstructionTypes.k_FunctionCallInstruction;
	}

	_toFinalCode(): string {
		var sCode: string = "";

		sCode += this.instructions[0]._toFinalCode();
		sCode += "(";
		for (var i: number = 1; i < this._nInstructions; i++) {
			sCode += this.instructions[i]._toFinalCode();
			if (i !== this._nInstructions - 1) {
				sCode += ","
			}
		}
		sCode += ")"

		return sCode;
	}

	get function(): IAFXFunctionDeclInstruction {
		return <IAFXFunctionDeclInstruction>(<IAFXIdExprInstruction>this._pInstructionList[0]).type.parent.parent;
	}

	addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
		eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
		var pExprList: IAFXExprInstruction[] = <IAFXExprInstruction[]>this.instructions;
		var pFunction: IAFXFunctionDeclInstruction = this.function;
		var pArguments: IAFXVariableDeclInstruction[] = <IAFXVariableDeclInstruction[]>pFunction.arguments;

		pExprList[0].addUsedData(pUsedDataCollector, eUsedMode);

		for (var i: number = 0; i < pArguments.length; i++) {
			if (pArguments[i].type.hasUsage("out")) {
				pExprList[i + 1].addUsedData(pUsedDataCollector, EVarUsedMode.k_Write);
			}
			else if (pArguments[i].type.hasUsage("inout")) {
				pExprList[i + 1].addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
			}
			else {
				pExprList[i + 1].addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
			}
		}
	}
}


