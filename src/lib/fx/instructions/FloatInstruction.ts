import { ExprInstruction } from "./ExprInstruction";
import { ILiteralInstruction, EInstructionTypes, IInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import * as Effect from "../Effect";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class FloatInstruction extends ExprInstruction implements ILiteralInstruction {
    private _fValue: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_FloatInstruction);
        this._fValue = 0.0;
        this.type = Effect.getSystemType("number").variableType;
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
}
