import { EInstructionTypes, ICompileShader11Instruction, IExprInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";
import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface ICompileShader11InstructionSettings extends IExprInstructionSettings {
    ver: string;
    func: IFunctionDeclInstruction;
    args?: IExprInstruction[];
}

/**
 * Represents CompileShader( vs_4_0_level_9_1, RenderSceneVS( 1, true, true ) )
 */
export class CompileShader11Instruction extends ExprInstruction implements ICompileShader11Instruction {
    readonly ver: string;
    readonly func: IFunctionDeclInstruction;
    readonly args: IExprInstruction[];

    constructor({ ver, func, args, ...settings }: ICompileShader11InstructionSettings) {
        super({ instrType: EInstructionTypes.k_CompileShader11Expr, ...settings });

        this.func = Instruction.$withNoParent(func);
        this.ver = ver;
        this.args = (args || []).map(arg => Instruction.$withParent(arg, this));
    }
}
