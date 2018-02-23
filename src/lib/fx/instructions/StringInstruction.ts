import { ExprInstruction } from "./ExprInstruction";
import { IAFXLiteralInstruction, IAFXInstruction, EAFXInstructionTypes } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";



export class StringInstruction extends ExprInstruction implements IAFXLiteralInstruction {
    private _sValue: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
    constructor(pNode: IParseNode) {
        super(pNode);
        this._sValue = "";
        this._pType = Effect.getSystemType("string").variableType;
        this._eInstructionType = EAFXInstructionTypes.k_StringInstruction;
    }

    get value(): string {
        return this._sValue;
    }

    set value(sValue: string) {
        this._sValue = sValue;
    }

    toString(): string {
        return this._sValue;
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this._sValue;
        return sCode;
    }

    evaluate(): boolean {
        this._pLastEvalResult = this._sValue;
        return true;
    }

    isConst(): boolean {
        return true;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction {
        var pClonedInstruction: IAFXLiteralInstruction = <IAFXLiteralInstruction>(super.clone(pRelationMap));
        pClonedInstruction.value = (this._sValue);
        return pClonedInstruction;
    }
}
