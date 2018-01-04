import { ExprInstruction } from "./ExprInstruction";
import { IAFXVariableDeclInstruction, EAFXInstructionTypes, IAFXTypeUseInfoContainer, EVarUsedMode, IAFXVariableTypeInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { isDef } from "../../common";

export class MemExprInstruction extends ExprInstruction {
	private _pBuffer: IAFXVariableDeclInstruction = null;

	constructor() {
		super();
		this._pInstructionList = null;
		this._eInstructionType = EAFXInstructionTypes.k_MemExprInstruction;
	}

	getBuffer(): IAFXVariableDeclInstruction {
		return this._pBuffer;
	}

	setBuffer(pBuffer: IAFXVariableDeclInstruction): void {
		this._pBuffer = pBuffer;
		this._setType(pBuffer._getType());
	}

	_addUsedData(pUsedDataCollector: IMap<IAFXTypeUseInfoContainer>,
		eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
		var pBufferType: IAFXVariableTypeInstruction = this.getBuffer()._getType();
		var pInfo: IAFXTypeUseInfoContainer = pUsedDataCollector[pBufferType._getInstructionID()];

		if (!isDef(pInfo)) {
			pInfo = <IAFXTypeUseInfoContainer>{
				type: pBufferType,
				isRead: false,
				isWrite: false,
				numRead: 0,
				numWrite: 0,
				numUsed: 0
			}

			pUsedDataCollector[pBufferType._getInstructionID()] = pInfo;
		}
		if (eUsedMode !== EVarUsedMode.k_Undefined) {
			pInfo.isRead = true;
			pInfo.numRead++;
		}

		pInfo.numUsed++;
	}
}
