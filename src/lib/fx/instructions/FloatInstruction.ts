import { ExprInstruction } from "./ExprInstruction";
import { IAFXLiteralInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { Effect } from "../Effect";
import { IMap } from "../../idl/IMap";

export class FloatInstruction extends ExprInstruction implements IAFXLiteralInstruction {
    private _fValue: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor() {
        super();
        this._fValue = 0.0;
        this._pType = Effect.getSystemType("number").getVariableType();
        this._eInstructionType = EAFXInstructionTypes.k_FloatInstruction;
    }

    _setValue(fValue: number): void {
        this._fValue = fValue;
    }

    toString(): string {
        return <string><any>this._fValue;
    }

    _toFinalCode(): string {
        var sCode: string = "";
        sCode += this._fValue.toString();
        if (this._fValue % 1 === 0) {
            sCode += ".";
        }
        return sCode;
    }

    _evaluate(): boolean {
        this._pLastEvalResult = this._fValue;
        return true;
    }

    _isConst(): boolean {
        return true;
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction {
        let pClonedInstruction: IAFXLiteralInstruction = <IAFXLiteralInstruction>(super._clone(pRelationMap));
        pClonedInstruction._setValue(this._fValue);
        return pClonedInstruction;
    }
}
