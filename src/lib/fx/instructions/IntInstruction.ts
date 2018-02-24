import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class IntInstruction extends ExprInstruction implements ILiteralInstruction {
    private _iValue: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_IntInstruction);
        this._iValue = 0;
        this._pType = Effect.getSystemType("number").variableType;
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
}

