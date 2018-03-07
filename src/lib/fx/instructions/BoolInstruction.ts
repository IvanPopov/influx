import { ExprInstruction } from "./ExprInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IVariableTypeInstruction, ITypeInstruction } from "./../../idl/IInstruction";
import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export interface IBoolInstructionSettings extends IExprInstructionSettings {
    value: boolean
}

export class BoolInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: boolean;

    constructor({ value, ...settings }: IBoolInstructionSettings) {
        super({ instrType: EInstructionTypes.k_BoolInstruction, ...settings });

        this._value = value;
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

