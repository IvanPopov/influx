import { Instruction } from "./Instruction";
import { IIdInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class IdInstruction extends Instruction implements IIdInstruction {
    private _sName: string;
    private _sRealName: string;
    private _bVarying: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_IdInstruction);
        this._sName = "";
        this._sRealName = "";
        this._bVarying = false;
    }
    
    get visible(): boolean {
        return this.parent.visible;
    }

    get name(): string {
        return this._sName;
    }

    set name(sName: string) {
        this._sName = sName;
        this._sRealName = sName;
    }

    get realName(): string {
        if (this._bVarying) {
            return "V_" + this._sRealName;
        }
        else {
            return this._sRealName;
        }
    }

    set realName(sRealName: string) {
        this._sRealName = sRealName;
    }

    set varying(bValue: boolean) {
        this._bVarying = bValue;
    }

    get varying(): boolean {
        return this._bVarying;
    }

    toString(): string {
        return this._sRealName;
    }

    toCode(): string {
        return this.realName;
    }
}

