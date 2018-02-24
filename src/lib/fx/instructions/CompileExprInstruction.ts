import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IFunctionDeclInstruction, ICompileExprInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
  * Represetn compile vs_func(...args)
  * compile IdExprInstruction ExprInstruction ... ExprInstruction
  */
export class CompileExprInstruction extends ExprInstruction implements ICompileExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_CompileExprInstruction);
    }

    get function(): IFunctionDeclInstruction {
        return <IFunctionDeclInstruction>this.instructions[0].parent.parent;
    }
}
