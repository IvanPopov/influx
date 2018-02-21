import { ExprInstruction } from "./ExprInstruction";
import { IAFXLiteralInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import * as Effect from "../Effect";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class FloatInstruction extends ExprInstruction implements IAFXLiteralInstruction {
    private _fValue: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode) {
        super(pNode);
        this._fValue = 0.0;
        this._pType = Effect.getSystemType("number").variableType;
        this._eInstructionType = EAFXInstructionTypes.k_FloatInstruction;
    }

    set value(fValue: number) {
        this._fValue = fValue;
    }

    get value(): number {
        return this._fValue;
    }

    toString(): string {
        return String(this._fValue);
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this._fValue.toString();
        if (this._fValue % 1 === 0) {
            sCode += ".";
        }
        return sCode;
    }

    evaluate(): boolean {
        this._pLastEvalResult = this._fValue;
        return true;
    }

    isConst(): boolean {
        return true;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction {
        let pClonedInstruction: IAFXLiteralInstruction = <IAFXLiteralInstruction>(super.clone(pRelationMap));
        pClonedInstruction.value = (this._fValue);
        return pClonedInstruction;
    }
}
