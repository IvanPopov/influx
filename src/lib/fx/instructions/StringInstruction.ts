import { ExprInstruction } from "./ExprInstruction";
import { ILiteralInstruction, IInstruction, EInstructionTypes } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";


export interface IStringInstructionSettings extends IInstructionSettings {
    value: string;
}


export class StringInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
    constructor({ value, scope, ...settings }: IStringInstructionSettings) {
        super({ instrType: EInstructionTypes.k_StringInstruction, type: scope.findType("string"), scope, ...settings });
        this._value = value;
    }

    
    get value(): string {
        return this._value;
    }


    toString(): string {
        return this._value;
    }


    toCode(): string {
        return this._value;
    }


    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}