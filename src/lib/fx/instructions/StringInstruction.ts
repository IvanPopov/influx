import { ExprInstruction } from "./ExprInstruction";
import { ILiteralInstruction, IInstruction, EInstructionTypes } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";



export class StringInstruction extends ExprInstruction implements ILiteralInstruction {
    private _value: string;

	/**
	 * EMPTY_OPERATOR EMPTY_ARGUMENTS
	 */
    constructor(pNode: IParseNode, value: string) {
        super(pNode, Effect.getSystemType("string").variableType, EInstructionTypes.k_StringInstruction);
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
