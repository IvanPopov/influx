import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class IntInstruction extends ExprInstruction implements ILiteralInstruction {
    private _value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor(pNode: IParseNode, value: number) {
        super(pNode, Effect.getSystemType("number").variableType, EInstructionTypes.k_IntInstruction);
        this._value = value;
    }

    
    get value(): number {
        return this._value;
    }


    toString(): string {
        return <string><any>this._value;
    }

    
    toCode(): string {
        return this._value.toString();
    }

    
    evaluate(): boolean {
        this._evalResult = this._value;
        return true;
    }


    isConst(): boolean {
        return true;
    }
}

