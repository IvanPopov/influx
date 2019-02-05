import { EOperations } from "./EOperations";

export interface IInstructionArgument {
    resolve(ctx: any): number;

    valueOf(): number;
    toString(): string;
}


export interface IInstruction {
    code: EOperations;
    args?: IInstructionArgument[];
}
