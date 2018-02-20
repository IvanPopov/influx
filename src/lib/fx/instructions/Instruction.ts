import { IAFXInstruction, IAFXInstructionError, EAFXInstructionTypes, IAFXInstructionRoutine, EFunctionType, ECheckStage } from "../../idl/IAFXInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class Instruction implements IAFXInstruction {
	protected _pParentInstruction: IAFXInstruction = null;
	protected _sOperatorName: string = null;
	protected _pInstructionList: IAFXInstruction[] = null;
	protected _nInstructions: number = 0;
	protected _eInstructionType: EAFXInstructionTypes = 0;
	protected _pLastError: IAFXInstructionError = null;
	protected _bErrorOccured: boolean = false;
	protected _iInstructionID: number = 0;
	protected _iScope: number = Instruction.UNDEFINE_SCOPE;
	protected _pSourceNode: IParseNode;

	private static _nInstructionCounter: number = 0;

	private _bVisible: boolean = true;

	_getParent(): IAFXInstruction {
		return this._pParentInstruction;
	}

	_setParent(pParentInstruction: IAFXInstruction): void {
		this._pParentInstruction = pParentInstruction;
	}

	_getOperator(): string {
		return this._sOperatorName;
	}

	_setOperator(sOperator: string): void {
		this._sOperatorName = sOperator;
	}

	_getInstructions(): IAFXInstruction[] {
		return this._pInstructionList;
	}

	_setInstructions(pInstructionList: IAFXInstruction[]): void {
		this._pInstructionList = pInstructionList;
	}

	_getInstructionType(): EAFXInstructionTypes {
		return this._eInstructionType;
	}

	_getInstructionID(): number {
		return this._iInstructionID;
	}

	_getScope(): number {
		return this._iScope !== Instruction.UNDEFINE_SCOPE ? this._iScope :
			!isNull(this._getParent()) ? this._getParent()._getScope() : Instruction.UNDEFINE_SCOPE;
	}

	_setScope(iScope: number): void {
		this._iScope = iScope;
	}

	_isInGlobalScope(): boolean {
		return this._getScope() === 0;
	}

	_getLastError(): IAFXInstructionError {
		return this._pLastError;
	}

	_setError(eCode: number, pInfo: any = null): void {
		this._pLastError.code = eCode;
		this._pLastError.info = pInfo;
		this._bErrorOccured = true;
	}

	_clearError(): void {
		this._bErrorOccured = false;
		this._pLastError.code = 0;
		this._pLastError.info = null;
	}

	_isErrorOccured(): boolean {
		return this._bErrorOccured;
	}

	_setVisible(isVisible: boolean): void {
		this._bVisible = isVisible;
	}

	_isVisible(): boolean {
		return this._bVisible;
	}

	_initEmptyInstructions(): void {
		this._pInstructionList = [];
	}

	constructor(pNode: IParseNode) {
		this._iInstructionID = Instruction._nInstructionCounter++;
		this._pParentInstruction = null;
		this._sOperatorName = null;
		this._pInstructionList = null;
		this._nInstructions = 0;
		this._eInstructionType = EAFXInstructionTypes.k_Instruction;
		this._pLastError = { code: 0, info: null };
		this._pSourceNode = pNode;
	}

	_push(pInstruction: IAFXInstruction, isSetParent: boolean = false): void {
		if (!isNull(this._pInstructionList)) {
			this._pInstructionList[this._nInstructions] = pInstruction;
			this._nInstructions += 1;
		}
		if (isSetParent && !isNull(pInstruction)) {
			pInstruction._setParent(this);
		}
	}

	_addRoutine(fnRoutine: IAFXInstructionRoutine, iPriority?: number): void {
		//TODO
	}

	_prepareFor(eUsedType: EFunctionType): void {
		if (!isNull(this._pInstructionList) && this._nInstructions > 0) {
			for (var i: number = 0; i < this._nInstructions; i++) {
				this._pInstructionList[i]._prepareFor(eUsedType);
			}
		}
	}
	/**
	 * Проверка валидности инструкции
	 */
	_check(eStage: ECheckStage, pInfo: any = null): boolean {
		if (this._bErrorOccured) {
			return false;
		}
		else {
			return true;
		}
	}

	/**
	 * Подготовка интсрукции к дальнейшему анализу
	 */
	prepare(): boolean {
		return true;
	}

	toString(): string {
		return null;
	}

	_toFinalCode(): string {
		return "";
	}

	_clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXInstruction {
		if (isDef(pRelationMap[this._getInstructionID()])) {
			return pRelationMap[this._getInstructionID()];
		}

		var pNewInstruction: IAFXInstruction = new (<any>this.constructor)();
		var pParent: IAFXInstruction = this._getParent() || null;

		if (!isNull(pParent) && isDef(pRelationMap[pParent._getInstructionID()])) {
			pParent = pRelationMap[pParent._getInstructionID()];
		}

		pNewInstruction._setParent(pParent);
		pRelationMap[this._getInstructionID()] = pNewInstruction;

		if (!isNull(this._pInstructionList) && isNull(pNewInstruction._getInstructions())) {
			pNewInstruction._initEmptyInstructions();
		}

		for (var i: number = 0; i < this._nInstructions; i++) {
			pNewInstruction._push(this._pInstructionList[i]._clone(pRelationMap));
		}

		pNewInstruction._setOperator(this._getOperator());

		return pNewInstruction;
	}

	_getSourceNode(): IParseNode {
		return this._pSourceNode;
	}

	static UNDEFINE_LENGTH: number = 0xffffff;
	static UNDEFINE_SIZE: number = 0xffffff;
	static UNDEFINE_SCOPE: number = 0xffffff;
	static UNDEFINE_PADDING: number = 0xffffff;
	static UNDEFINE_NAME: string = "undef";
}







