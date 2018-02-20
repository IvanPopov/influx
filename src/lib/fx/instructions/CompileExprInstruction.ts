import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, IAFXFunctionDeclInstruction } from "../../idl/IAFXInstruction";
import { IParseNode } from "../../idl/parser/IParser";

/**
  * Represetn compile vs_func(...args)
  * compile IdExprInstruction ExprInstruction ... ExprInstruction
  */
export class CompileExprInstruction extends ExprInstruction {
    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_CompileExprInstruction;
    }

    get function(): IAFXFunctionDeclInstruction {
        return <IAFXFunctionDeclInstruction>this._pInstructionList[0].parent.parent;
    }
}
