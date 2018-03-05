import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IFunctionDeclInstruction, ICompileExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
  * Represetn compile vs_func(...args)
  * compile IdExprInstruction ExprInstruction ... ExprInstruction
  */
export class CompileExprInstruction extends ExprInstruction implements ICompileExprInstruction {
    private _operand: IFunctionDeclInstruction;


    constructor(node: IParseNode, operand: IFunctionDeclInstruction) {
        super(node, operand.type, EInstructionTypes.k_CompileExprInstruction);
    }

    
    get function(): IFunctionDeclInstruction {
        return <IFunctionDeclInstruction>this._operand.parent.parent;
    }
}
