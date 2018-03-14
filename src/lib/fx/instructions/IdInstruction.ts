import { Instruction } from "./Instruction";
import { IInstructionSettings } from "./Instruction";
import { IIdInstruction, EInstructionTypes, IInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


export interface IIdInstructionSettings extends IInstructionSettings {
    name: string;
}

export class IdInstruction extends Instruction implements IIdInstruction {
    protected _name: string;

    constructor({ name, ...settings }: IIdInstructionSettings) {
        super({ instrType: EInstructionTypes.k_IdInstruction, ...settings });
        
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

