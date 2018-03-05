import { ExprInstruction } from "./ExprInstruction";
import { IVariableTypeInstruction, ITypeInstruction } from "./../../idl/IInstruction";
import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class BoolInstruction extends ExprInstruction implements ILiteralInstruction {
    private _value: boolean;

    constructor(node: IParseNode, val: boolean) {
        super(node, Effect.getSystemType("bool").variableType, EInstructionTypes.k_BoolInstruction);

        this._value = val;
    }

    set value(bValue: boolean) {
        this._value = bValue;
    }

    get value(): boolean {
        return this._value;
    }

    toString(): string {
        return String(this._value);
    }

    toCode(): string {
        return this._value ? "true" : "false";
    }

    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }

    isConst(): boolean {
        return true;
    }

}

