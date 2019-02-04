import { EOperations } from "./EOperations";

export interface IInstruction {
    code: EOperations;
    dest: number;   // adress
    args: number[];
}