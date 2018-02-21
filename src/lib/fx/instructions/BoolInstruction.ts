import { ExprInstruction } from "./ExprInstruction";
import { IAFXLiteralInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class BoolInstruction extends ExprInstruction implements IAFXLiteralInstruction {
    private _bValue: boolean;
    // private static _pBoolType: IAFXVariableTypeInstruction = null;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode) {
        super(pNode);

        this._bValue = true;
        this._pType = Effect.getSystemType("bool").variableType;
        this._eInstructionType = EAFXInstructionTypes.k_BoolInstruction;
    }

    set value(bValue: boolean) {
        this._bValue = bValue;
    }

    get value(): boolean {
        return this._bValue;
    }

    toString(): string {
        return String(this._bValue);
    }

    toCode(): string {
        return this._bValue ? "true" : "false";
    }

    evaluate(): boolean {
        this._pLastEvalResult = this._bValue;
        return true;
    }

    isConst(): boolean {
        return true;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction {
        var pClonedInstruction: IAFXLiteralInstruction = <IAFXLiteralInstruction>(super.clone(pRelationMap));
        pClonedInstruction.value = (this._bValue);
        return pClonedInstruction;
    }
}

