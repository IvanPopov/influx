import { EInstructionTypes, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface IFunctionCallInstructionSettings extends IExprInstructionSettings {
    decl: IFunctionDeclInstruction;
    args?: IExprInstruction[];
    callee?: IExprInstruction;
}

/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends ExprInstruction implements IFunctionCallInstruction {
    readonly callee: IExprInstruction;
    readonly args: IExprInstruction[];

    // helpers
    readonly decl: IFunctionDeclInstruction; // << move to resolveDecl() method.
    
    constructor({ decl, args, callee, ...settings }: IFunctionCallInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionCallExpr, ...settings });
        
        this.callee = callee;
        this.args = (args || []).map(arg => Instruction.$withParent(arg, this));
        this.decl = decl;
    }



    toCode(): string {
        let code: string = "";

        code += this.decl.def.id.toCode();
        code += "(";
        for (let i: number = 0; i < this.args.length; i++) {
            code += this.args[i].toCode();
            if (i !== this.args.length - 1) {
                code += ","
            }
        }
        code += ")"

        return code;
    }
}


