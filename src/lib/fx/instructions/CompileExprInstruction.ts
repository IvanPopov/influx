import { ExprInstruction } from "./ExprInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IExprInstruction } from "./../../idl/IInstruction";
import { EInstructionTypes, IFunctionDeclInstruction, ICompileExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

export interface ICompileExprInstructionSettings extends IExprInstructionSettings {
    operand: IFunctionDeclInstruction;
}

/**
  * Represetn compile vs_func(...args)
  * compile IdExprInstruction ExprInstruction ... ExprInstruction
  */
export class CompileExprInstruction extends ExprInstruction implements ICompileExprInstruction {
    protected _operand: IFunctionDeclInstruction;


    constructor({ operand, ...settings }: ICompileExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_CompileExprInstruction, ...settings });
    }

    
    get function(): IFunctionDeclInstruction {
        return <IFunctionDeclInstruction>this._operand.parent.parent;
    }
}
