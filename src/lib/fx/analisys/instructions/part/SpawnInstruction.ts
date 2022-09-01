import { EInstructionTypes, IExprInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { IPartFxInstruction, ISpawnStmtInstruction } from "@lib/idl/part/IPartFx";

import { IInstructionSettings } from "../Instruction";
import { StmtInstruction } from "../StmtInstruction";

export interface ISpawnInstructionSettings extends IInstructionSettings {
    count: IExprInstruction;
    args: IExprInstruction[];
    name: string;
}


export class SpawnInstruction extends StmtInstruction implements ISpawnStmtInstruction {
    readonly count: IExprInstruction;
    readonly args: IExprInstruction[];
    readonly name: string;
    
    // private _fx: IPartFxInstruction = null;
    // private _init: IFunctionDeclInstruction = null;

    constructor({ count, name, args, ...settings }: ISpawnInstructionSettings) {
        super({ instrType: EInstructionTypes.k_SpawnStmt, ...settings });

        this.count = count;
        this.args = args;
        this.name = name;
    }    

    
    // get fx(): IPartFxInstruction {
    //     return this._fx;
    // }


    // get init(): IFunctionDeclInstruction {
    //     return this._init;
    // }


    toCode(): string {
        return `spawn(${this.count}) ${this.name}(${this.args.map(arg => arg.toCode()).join(', ')});`;
    }

    // // delayed resolve of the spawn instructions
    // $resolve(fx: IPartFxInstruction, init: IFunctionDeclInstruction): void {
    //     this._fx = fx;
    //     this._init = init;
    // }
}
