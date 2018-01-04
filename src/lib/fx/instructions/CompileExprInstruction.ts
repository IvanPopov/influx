import { ExprInstruction } from "./ExprInstruction";
import { EAFXInstructionTypes, IAFXFunctionDeclInstruction } from "../../idl/IAFXInstruction";

/**
  * Represetn compile vs_func(...args)
  * compile IdExprInstruction ExprInstruction ... ExprInstruction
  */
export class CompileExprInstruction extends ExprInstruction {
    constructor() {
        super();
        this._pInstructionList = [null];
        this._eInstructionType = EAFXInstructionTypes.k_CompileExprInstruction;
    }

    getFunction(): IAFXFunctionDeclInstruction {
        return <IAFXFunctionDeclInstruction>this._pInstructionList[0]._getParent()._getParent();
    }
}
