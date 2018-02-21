import { Instruction } from "./Instruction";
import { IAFXIdInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class IdInstruction extends Instruction implements IAFXIdInstruction {
    private _sName: string;
    private _sRealName: string;
    private _isForVarying: boolean = false;

    get visible(): boolean {
        return this.parent.visible();
    }
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode) {
        super(pNode);
        this._sName = "";
        this._sRealName = "";
        this._eInstructionType = EAFXInstructionTypes.k_IdInstruction;
    }

    get name(): string {
        return this._sName;
    }

    get realName(): string {
        if (this._isForVarying) {
            return "V_" + this._sRealName;
        }
        else {
            return this._sRealName;
        }
    }

    set name(sName: string): void {
        this._sName = sName;
        this._sRealName = sName;
    }

    set realName(sRealName: string): void {
        this._sRealName = sRealName;
    }

    markAsVarying(bValue: boolean): void {
        this._isForVarying = bValue;
    }

    toString(): string {
        return this._sRealName;
    }

    toCode(): string {
        return this.realName;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IdInstruction {
        var pClonedInstruction: IdInstruction = <IdInstruction>(super.clone(pRelationMap));
        pClonedInstruction._setName(this._sName);
        pClonedInstruction._setRealName(this._sRealName);
        return pClonedInstruction;
    }
}

