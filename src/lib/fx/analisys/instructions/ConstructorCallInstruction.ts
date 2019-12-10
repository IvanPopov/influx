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


    evaluate(): boolean {
        if (!this.isConst()) {
            return false;
        }

        var res: any = null;
        var jsTypeCtor: any = SystemScope.getExternalType(this.type);
        var args: any[] = new Array(this.args.length);

        if (isNull(jsTypeCtor)) {
            return false;
        }

        try {
            if (SystemScope.isScalarType(this.type)) {
                var pTestedInstruction: IExprInstruction = <IExprInstruction>this.args[0];
                if (this.args.length > 1 || !pTestedInstruction.evaluate()) {
                    return false;
                }

                res = jsTypeCtor(pTestedInstruction.getEvalValue());
            }
            else {
                for (var i: number = 0; i < this.args.length; i++) {
                    var pTestedInstruction: IExprInstruction = <IExprInstruction>this.args[i];

                    if (pTestedInstruction.evaluate()) {
                        args[i - 1] = pTestedInstruction.getEvalValue();
                    }
                    else {
                        return false;
                    }
                }

                res = new jsTypeCtor;
                res.set.apply(res, args);
            }
        }
        catch (e) {
            return false;
        }

        this._evalResult = res;
        return true;
    }
}
