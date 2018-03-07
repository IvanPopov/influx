import { IInstruction, IInstructionError, EInstructionTypes, EFunctionType, ECheckStage } from "../../idl/IInstruction";
import { isNull, isDef } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { ProgramScope } from "../ProgramScope";


export interface IInstructionSettings {
    sourceNode?: IParseNode;
    scope?: number;
    visible?: boolean;
    
    instrType?: EInstructionTypes;
}

export class Instruction implements IInstruction {
    private _visible: boolean;
    private _sourceNode: IParseNode;
    private _instructionID: number;
    private _instructionType: EInstructionTypes;
    private _scope: number;
    private _parent: IInstruction;
    private _lastError: IInstructionError;

    private static INSTRUCTION_COUNTER: number = 0;

    constructor({
        instrType = EInstructionTypes.k_Instruction,
        sourceNode = null,
        scope = Instruction.UNDEFINE_SCOPE,
        visible = true
    }: IInstructionSettings = {}) {

        this._visible = true;
        this._sourceNode = sourceNode;
        this._instructionType = instrType;
        this._instructionID = (Instruction.INSTRUCTION_COUNTER++);
        this._scope = scope;
        this._parent = null;
        this._lastError = null;
    }


    get parent(): IInstruction {
        console.assert(this._parent, "Parent is not defined!");
        return this._parent;
    }


    get instructionType(): EInstructionTypes {
        console.assert(this._instructionType != EInstructionTypes.k_Instruction, "Instruction type 'k_Instruction' is forbidden.");
        return this._instructionType;
    }


    get instructionID(): number {
        return this._instructionID;
    }


    get scope(): number {
        return !this.globalScope ? this._scope : !isNull(this.parent) ? this.parent.scope : Instruction.UNDEFINE_SCOPE;
    }

    get globalScope(): boolean {
        return this.scope === ProgramScope.GLOBAL_SCOPE;
    }

    get sourceNode(): IParseNode {
        return this._sourceNode;
    }

    get visible(): boolean {
        return this._visible;
    }

    _getLastError(): IInstructionError {
        return this._lastError;
    }

    _setError(eCode: number, pInfo: any = null): void {
        this._lastError = { code: eCode, info: pInfo }
    }

    _clearError(): void {
        this._lastError = null
    }

    _isErrorOccured(): boolean {
        return !isNull(this._lastError);
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
        console.error("@pure_virtual");
        return null;
    }


    toCode(): string {
        console.error("@pure_virtual");
        return null;
    }


    $hide(): void {
        console.assert(this._visible, "parent redefenition detected!");
        this._visible = false;
    }

    $linkTo(parent: IInstruction) {
        console.assert(this._parent == null, "parent redefenition detected!");
        this._parent = parent;
    }

    $linkToScope(scope: number) {
        console.warn("@deprecated");
        console.assert(this._scope == Instruction.UNDEFINE_SCOPE, "scope redefenition detected!");
        this._scope = scope;
    }

    static UNDEFINE_LENGTH: number = 0xffffff;
    static UNDEFINE_SIZE: number = 0xffffff;
    static UNDEFINE_SCOPE: number = 0xffffff;
    static UNDEFINE_PADDING: number = 0xffffff;
    static UNDEFINE_NAME: string = "undef";
}







