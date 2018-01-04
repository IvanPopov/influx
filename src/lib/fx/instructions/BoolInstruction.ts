import { ExprInstruction } from "./ExprInstruction";
import { IAFXLiteralInstruction, IAFXVariableTypeInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";

export class BoolInstruction extends ExprInstruction implements IAFXLiteralInstruction {
    private _bValue: boolean;
    private static _pBoolType: IAFXVariableTypeInstruction = null;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor() {
        super();

        this._bValue = true;
        this._pType = Effect.getSystemType("bool").getVariableType();
        this._eInstructionType = EAFXInstructionTypes.k_BoolInstruction;
    }

    _setValue(bValue: boolean): void {
        this._bValue = bValue;
    }

    toString(): string {
        return <string><any>this._bValue;
    }

    _toFinalCode(): string {
        if (this._bValue) {
            return "true";
        }
        else {
            return "false";
        }
    }

    _evaluate(): boolean {
        this._pLastEvalResult = this._bValue;
        return true;
    }

    _isConst(): boolean {
        return true;
    }

    _clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction {
        var pClonedInstruction: IAFXLiteralInstruction = <IAFXLiteralInstruction>(super._clone(pRelationMap));
        pClonedInstruction._setValue(this._bValue);
        return pClonedInstruction;
    }
}

