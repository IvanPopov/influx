import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings } from "./Instruction";
import { ILiteralInstruction, EInstructionTypes, IInstruction, IVariableTypeInstruction } from "../../idl/IInstruction";
import * as Effect from "../Effect";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export interface IFloatInstructionSettings extends IInstructionSettings {
    value: number;
}

export class FloatInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, ...settings }: IFloatInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FloatInstruction, type: Effect.findSystemType("float").asVarType(), ...settings });
        this._value = value;
    }

    
    get value(): number {
        return this._value;
    }

    
    toString(): string {
        return String(this._value);
    }

    
    toCode(): string {
        var code: string = "";
        code += this._value.toString();
        if (this._value % 1 === 0) {
            code += ".";
        }
        return code;
    }

    
    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}
