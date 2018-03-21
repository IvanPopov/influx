import { ILiteralInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";
import * as SystemScope from "../SystemScope";

export interface IIntInstructionSettings extends IInstructionSettings {
    value: string;
}

export class IntInstruction extends ExprInstruction implements ILiteralInstruction {
    protected _value: number;
    /**
     * EMPTY_OPERATOR EMPTY_ARGUMENTS
     */
    constructor({ value, ...settings }: IIntInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IntInstruction, type: SystemScope.T_INT, ...settings });
        
        this._value = ((<number><any>value) * 1);
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

