import { IAFXInstruction, IAFXInstructionError, EAFXInstructionTypes, IAFXInstructionRoutine, EFunctionType, ECheckStage } from "../../idl/IAFXInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { ProgramScope } from "../ProgramScope";

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

    get parent(): IAFXInstruction {
        return this._pParentInstruction;
    }

    set parent(pParentInstruction: IAFXInstruction) {
        this._pParentInstruction = pParentInstruction;
    }

    get operator(): string {
        return this._sOperatorName;
    }

    set operator(sOperator: string) {
        this._sOperatorName = sOperator;
    }

    get instructions(): IAFXInstruction[] {
        return this._pInstructionList;
    }

    set instructions(pInstructionList: IAFXInstruction[]) {
        this._pInstructionList = pInstructionList;
    }

    get instructionType(): EAFXInstructionTypes {
        return this._eInstructionType;
    }

    get instructionID(): number {
        return this._iInstructionID;
    }

    get scope(): number {
        return this._iScope !== Instruction.UNDEFINE_SCOPE ? this._iScope :
            !isNull(this.parent) ? this.parent.scope : Instruction.UNDEFINE_SCOPE;
    }

    set scope(iScope: number) {
        this._iScope = iScope;
    }

    get globalScope(): boolean {
        return this.scope === ProgramScope.GLOBAL_SCOPE;
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

    set visible(isVisible: boolean) {
        this._bVisible = isVisible;
    }

    get visible(): boolean {
        return this._bVisible;
    }

    initEmptyInstructions(): void {
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

    push(pInstruction: IAFXInstruction, isSetParent: boolean = false): void {
        if (!isNull(this._pInstructionList)) {
            this._pInstructionList[this._nInstructions] = pInstruction;
            this._nInstructions += 1;
        }
        if (isSetParent && !isNull(pInstruction)) {
            pInstruction.parent = (this as IAFXInstruction);
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


    toString(): string {
        return null;
    }

    _toFinalCode(): string {
        return "";
    }

    _clone(pRelationMap: IMap<IAFXInstruction> = <IMap<IAFXInstruction>>{}): IAFXInstruction {
        if (isDef(pRelationMap[this.instructionID])) {
            return pRelationMap[this.instructionID];
        }

        var pNewInstruction: IAFXInstruction = new (<any>this.constructor)();
        var pParent: IAFXInstruction = this.parent || null;

        if (!isNull(pParent) && isDef(pRelationMap[pParent.instructionID])) {
            pParent = pRelationMap[pParent.instructionID];
        }

        pNewInstruction.parent = (pParent);
        pRelationMap[this.instructionID] = pNewInstruction;

        if (!isNull(this._pInstructionList) && isNull(pNewInstruction.instructions)) {
            pNewInstruction.initEmptyInstructions();
        }

        for (var i: number = 0; i < this._nInstructions; i++) {
            pNewInstruction.push(this._pInstructionList[i]._clone(pRelationMap));
        }

        pNewInstruction.operator = this.operator;

        return pNewInstruction;
    }

    get sourceNode(): IParseNode {
        return this._pSourceNode;
    }

    static UNDEFINE_LENGTH: number = 0xffffff;
    static UNDEFINE_SIZE: number = 0xffffff;
    static UNDEFINE_SCOPE: number = 0xffffff;
    static UNDEFINE_PADDING: number = 0xffffff;
    static UNDEFINE_NAME: string = "undef";
}







