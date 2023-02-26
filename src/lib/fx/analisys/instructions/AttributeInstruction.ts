import { EInstructionTypes, IAttributeInstruction, IInstruction, ILiteralInstruction } from "@lib/idl/IInstruction";

import { IInstructionSettings, Instruction } from "./Instruction";

export interface IAttributeInstructionSettings extends IInstructionSettings {
    name: string;
    args?: ILiteralInstruction<boolean | number>[];
}

/**
 * Represent attributes:
 *  [numthreads(1, 2, 3)]
 *  [loop]
 *  [branch]
 */
export class AttributeInstruction extends Instruction implements IAttributeInstruction {
    
    readonly name: string;
    readonly args: ILiteralInstruction<number | boolean>[];

    constructor({ name, args = null, ...settings }: IAttributeInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Attribute, ...settings });

        this.name = name;
        this.args = args;
    }    

    toCode(): string {
        return `[${this.name}${ this.args.length > 0 ? `(${this.args.map(arg => arg.toCode()).join(', ')})`: `` }]`;
    }
}
