import { Instruction } from "./Instruction";
import { IIdInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class IdInstruction extends Instruction implements IIdInstruction {
    protected _name: string;

    constructor(node: IParseNode, name: string) {
        super(node, EInstructionTypes.k_IdInstruction);
        this._name = name;
    }
    

    get visible(): boolean {
        return this.parent.visible;
    }


    get name(): string {
        return this._name;
    }


    toString(): string {
        return this._name;
    }


    toCode(): string {
        return this.name;
    }
}

