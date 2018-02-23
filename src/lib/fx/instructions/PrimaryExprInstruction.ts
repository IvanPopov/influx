import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, IAFXTypeUseInfoContainer, IAFXVariableTypeInstruction, EVarUsedMode } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { isDef } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent @ Expr
 * @ Instruction
 */
export class PrimaryExprInstruction extends ExprInstruction {
	constructor(pNode: IParseNode) {
		super(pNode);
		this._pInstructionList = [null];
		this._eInstructionType = EAFXInstructionTypes.k_PrimaryExprInstruction;
	}

	toCode(): string {
		var sCode: string = "";

		sCode += this.instructions[0].toCode();

		return sCode;
	}

	addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
		eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
		var pPointerType: IAFXVariableTypeInstruction = this.type;
		var pInfo: IAFXTypeUseInfoContainer = pUsedDataCollector[pPointerType.instructionID];

		if (!isDef(pInfo)) {
			pInfo = <IAFXTypeUseInfoContainer>{
				type: pPointerType,
				isRead: false,
				isWrite: false,
				numRead: 0,
				numWrite: 0,
				numUsed: 0
			}

			pUsedDataCollector[pPointerType.instructionID] = pInfo;
		}

		if (eUsedMode === EVarUsedMode.k_Read) {
			pInfo.isRead = true;
			pInfo.numRead++;
		}
		else if (eUsedMode === EVarUsedMode.k_Write) {
			pInfo.isWrite = true;
			pInfo.numWrite++;
		}
		else if (eUsedMode === EVarUsedMode.k_ReadWrite) {
			pInfo.isRead = true;
			pInfo.isWrite = true;
			pInfo.numRead++;
			pInfo.numWrite++;
		}

		pInfo.numUsed++;
	}
}
