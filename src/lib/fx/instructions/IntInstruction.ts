import { IAFXLiteralInstruction, EAFXInstructionTypes, IAFXInstruction } from "../../idl/IAFXInstruction";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class IntInstruction extends ExprInstruction implements IAFXLiteralInstruction {
    private _iValue: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode) {
        super(pNode);
        this._iValue = 0;
        this._pType = Effect.getSystemType("number").variableType;
        this._eInstructionType = EAFXInstructionTypes.k_IntInstruction;
    }

    set value(iValue: number) {
        this._iValue = iValue;
    }

    get value(): number {
        return this._iValue;
    }

    toString(): string {
        return <string><any>this._iValue;
    }

    toCode(): string {
        var sCode: string = "";
        sCode += this._iValue.toString();
        return sCode;
    }

    evaluate(): boolean {
        this._pLastEvalResult = this._iValue;
        return true;
    }

    isConst(): boolean {
        return true;
    }

    clone(pRelationMap?: IMap<IAFXInstruction>): IAFXLiteralInstruction {
        var pClonedInstruction: IAFXLiteralInstruction = <IAFXLiteralInstruction>(super.clone(pRelationMap));
        pClonedInstruction.value = (this._iValue);
        return pClonedInstruction;
    }
}

