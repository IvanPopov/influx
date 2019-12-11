import { EInstructionTypes, IExprInstruction, IFunctionCallInstruction, IFunctionDeclInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction, IExprInstructionSettings } from "./ExprInstruction";
import { Instruction } from "./Instruction";

export interface IFunctionCallInstructionSettings extends IExprInstructionSettings {
    decl: IFunctionDeclInstruction;
    args?: IExprInstruction[];
}

/**
 * Respresnt func(arg1,..., argn)
 * EMPTY_OPERATOR IdExprInstruction ExprInstruction ... ExprInstruction 
 */
export class FunctionCallInstruction extends ExprInstruction implements IFunctionCallInstruction {
    protected _args: IExprInstruction[];

    // helpers
    protected _decl: IFunctionDeclInstruction; // << move to resolveDecl() method.
    
    constructor({ decl, args, ...settings }: IFunctionCallInstructionSettings) {
        super({ instrType: EInstructionTypes.k_FunctionCallExpr, ...settings });
        
        this._decl = decl;
        this._args = (args || []).map(arg => Instruction.$withParent(arg, this));
    }


    get decl(): IFunctionDeclInstruction {
        return this._decl;
    }


    get args(): IExprInstruction[] {
        return this._args;
    }


    toCode(): string {
        let code: string = "";

        code += this.decl.def.id.toCode();
        code += "(";
        for (let i: number = 0; i < this._args.length; i++) {
            code += this._args[i].toCode();
            if (i !== this._args.length - 1) {
                code += ","
            }
        }
        code += ")"

        return code;
    }
}

