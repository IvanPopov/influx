import { ExprInstruction } from "./ExprInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IVariableTypeInstruction, ITypeInstruction } from "../../idl/IInstruction";
import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";
import * as SystemScope from "../SystemScope";

export interface IBoolInstructionSettings extends IInstructionSettings {
    value: "true" | "false";
}

export class BoolInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: boolean;

    constructor({ value, ...settings }: IBoolInstructionSettings) {
        super({ instrType: EInstructionTypes.k_BoolInstruction, type: SystemScope.T_BOOL, ...settings });

        this._value = value === "true";
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

