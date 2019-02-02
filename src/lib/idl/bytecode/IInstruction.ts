import { EOperations } from "./EOperations";

export interface IInstruction {
    op: EOperations;
    dest: number;   // adress
    args: number[];
}