import { EInstructionTypes, IExprInstruction, IFunctionDeclInstruction, IPassInstruction } from "@lib/idl/IInstruction";
import { IDrawStmtInstruction, IPartFxInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";

import { IInstructionSettings } from "../Instruction";
import { StmtInstruction } from "../StmtInstruction";

export interface IDrawInstructionSettings extends IInstructionSettings {
    name: string;
    args: IExprInstruction[];
}


export class DrawInstruction extends StmtInstruction implements IDrawStmtInstruction {
    readonly name: string;
    readonly args: IExprInstruction[];
    
    constructor({ name, args, ...settings }: IDrawInstructionSettings) {
        super({ instrType: EInstructionTypes.k_DrawStmt, ...settings });
        this.name = name;
        this.args = args;
    }    

    toCode(): string {
        return `draw ${this.name};`;
    }
}
