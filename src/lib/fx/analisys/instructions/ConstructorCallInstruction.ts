import { isNull } from "@lib/common";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, IConstructorCallInstruction, IExprInstruction, IInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IConstructorCallInstructionSettings extends IInstructionSettings {
    ctor: IVariableTypeInstruction;
    args?: IExprInstruction[];
}


/**
 * Resresnt ctor(arg1,..., argn)
 * EMPTY_OPERATOR IdInstruction ExprInstruction ... ExprInstruction 
 */
export class ConstructorCallInstruction extends ExprInstruction implements IConstructorCallInstruction {
    protected _args: IInstruction[];
    protected _ctor: IVariableTypeInstruction;
    

    constructor({ ctor, args = null, ...settings }: IConstructorCallInstructionSettings) {
        super({ instrType: EInstructionTypes.k_ConstructorCallExpr, type: ctor.subType, ...settings });

        this._args = (args || []).map(arg => Instruction.$withParent(arg, this));
        this._ctor = Instruction.$withParent(ctor, this);
    }

    
    get args() : IInstruction[] {
        return this._args;
    }

    
    get ctor(): IVariableTypeInstruction {
        return this._ctor;
    }


    toCode(): string {
        var code: string = "";

        code += this.ctor.toCode();
        code += "(";

        for (var i: number = 0; i < this.args.length; i++) {
            code += this.args[i].toCode();
            if (i !== this.args.length - 1) {
                code += ",";
            }
        }

        code += ")";

        return code;
    }


    isConst(): boolean {
        for (var i: number = 0; i < this.args.length; i++) {
            if (!(<IExprInstruction>this.args[i]).isConst()) {
                return false;
            }
        }

        return true;
    }
}
