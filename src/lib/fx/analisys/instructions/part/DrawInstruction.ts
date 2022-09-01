import { EInstructionTypes, IExprInstruction, IFunctionDeclInstruction, IPassInstruction } from "@lib/idl/IInstruction";
import { IDrawStmtInstruction, IPartFxInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";

import { IInstructionSettings } from "../Instruction";
import { StmtInstruction } from "../StmtInstruction";

export interface IDrawInstructionSettings extends IInstructionSettings {
    name: string;
}


export class DrawInstruction extends StmtInstruction implements IDrawStmtInstruction {
    readonly name: string;
    
    constructor({ name, ...settings }: IDrawInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DrawStmt, ...settings });
        this.name = name;
    }    

    toCode(): string {
        return `draw ${this.name};`;
    }
}
