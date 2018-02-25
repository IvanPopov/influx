import { ExprInstruction } from "./ExprInstruction";
import { IVariableTypeInstruction } from "./../../idl/IInstruction";
import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class BoolInstruction extends ExprInstruction implements ILiteralInstruction {
    private _bValue: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_BoolInstruction);

        this._bValue = true;
        this.type = Effect.getSystemType("bool").variableType;
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

}

