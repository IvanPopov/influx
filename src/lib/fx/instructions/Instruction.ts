import { IInstruction, IInstructionError, EInstructionTypes, EFunctionType, ECheckStage } from "../../idl/IInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { ProgramScope } from "../ProgramScope";


export class Instruction implements IInstruction {
    private _bVisible: boolean;
    private _pSourceNode: IParseNode;
    private _iInstructionID: number;
    private _eInstructionType: EInstructionTypes;
    private _iScope: number;
    private _pParentInstruction: IInstruction;
    private _pLastError: IInstructionError;

    private static INSTRUCTION_COUNTER: number = 0;

    constructor(pNode: IParseNode, eType: EInstructionTypes = EInstructionTypes.k_Instruction) {
        this._bVisible = true;
        this._pSourceNode = pNode;
        this._iInstructionID = (Instruction.INSTRUCTION_COUNTER++);
        this._eInstructionType = eType;
        this._iScope = Instruction.UNDEFINE_SCOPE;
        this._pParentInstruction = null;
        this._pLastError = null;
    }

    get parent(): IInstruction {
        return this._pParentInstruction;
    }

    get instructionType(): EInstructionTypes {
        return this._eInstructionType;
    }

    get instructionID(): number {
        return this._iInstructionID;
    }

    get scope(): number {
        return !this.globalScope ? this._iScope : !isNull(this.parent) ? this.parent.scope : Instruction.UNDEFINE_SCOPE;
    }

    get globalScope(): boolean {
        return this.scope === ProgramScope.GLOBAL_SCOPE;
    }

    get sourceNode(): IParseNode {
        return this._pSourceNode;
    }

    get visible(): boolean {
        return this._bVisible;
    }

    _getLastError(): IInstructionError {
        return this._pLastError;
    }

    _setError(eCode: number, pInfo: any = null): void {
        this._pLastError = { code: eCode, info: pInfo }
    }

    _clearError(): void {
        this._pLastError = null
    }

    _isErrorOccured(): boolean {
        return !isNull(this._pLastError);
    }


    prepareFor(eUsedType: EFunctionType): void {
        console.error("pure virtual method!");
    }


    /**
     * Check that instuction is valid.
     */
    _check(eStage: ECheckStage, pInfo: any = null): boolean {
        if (this._isErrorOccured()) {
            return false;
        }
        else {
            return true;
        }
    }


    toString(): string {
        return null;
    }


    toCode(): string {
        return "";
    }


    $hide(): void {
        this._bVisible = false;
    }

    $linkTo(pParentInstruction: IInstruction) {
        this._pParentInstruction = pParentInstruction;
    }

    $specifyScope(iScope: number) {
        this._iScope = iScope;
    }

    static UNDEFINE_LENGTH: number = 0xffffff;
    static UNDEFINE_SIZE: number = 0xffffff;
    static UNDEFINE_SCOPE: number = 0xffffff;
    static UNDEFINE_PADDING: number = 0xffffff;
    static UNDEFINE_NAME: string = "undef";
}







