import { EInstructionTypes, ICompileExprInstruction, IExprInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";

export interface ICompileExprInstructionSettings extends IExprInstructionSettings {
    operand: IFunctionDeclInstruction;
    args?: IExprInstruction[];
}

/**
 * Represents compile vs_func(...args)
 * compile IdExprInstruction ExprInstruction ... ExprInstruction
 */
/** @deprecated */
export class CompileExprInstruction extends ExprInstruction implements ICompileExprInstruction {
    protected _operand: IFunctionDeclInstruction;
    protected _args: IExprInstruction[];


    constructor({ operand, args = null, ...settings }: ICompileExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CompileExpr, ...settings });

        this._operand = operand;//Instruction.$withParent(operand, this);
        this._args = args;//(args || []).map(arg => Instruction.$withParent(arg, this));
    }

    
    get function(): IFunctionDeclInstruction {
        return <IFunctionDeclInstruction>this._operand;
    }

    
    get args(): IExprInstruction[] {
        return this._args;
    }
}
