import { Instruction } from "./Instruction";
import { IIdInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";

export class IdInstruction extends Instruction implements IIdInstruction {
    private _name: string;
    private _realName: string;

    constructor(node: IParseNode, name: string) {
        super(node, EInstructionTypes.k_IdInstruction);
        this._name = name;
        this._realName = name;
    }
    

    get visible(): boolean {
        return this.parent.visible;
    }


    get name(): string {
        return this._name;
    }


    get realName(): string {
        return this._realName;
    }


    set realName(sRealName: string) {
        this._realName = sRealName;
    }


    toString(): string {
        return this._name;
    }


    toCode(): string {
        return this.realName;
    }
}

