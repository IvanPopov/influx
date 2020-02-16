import { assert, isNull } from "@lib/common";
import { ITypedInstructionSettings, TypedInstruction } from "@lib/fx/analisys/instructions/TypedInstruction";
import { EInstructionTypes, IAssignmentExprInstruction, IComplexExprInstruction, IExprInstruction, IIdExprInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

export interface IExprInstructionSettings extends ITypedInstructionSettings {
    
}

export class ExprInstruction extends TypedInstruction implements IExprInstruction {
    protected _evalResult: any;

    constructor({ ...settings }: ITypedInstructionSettings) {
        super({ instrType: EInstructionTypes.k_Expr, ...settings });
        this._evalResult = null;
    }

    get type(): IVariableTypeInstruction {
        return <IVariableTypeInstruction>super.type;
    }


    isConst(): boolean {
        // console.error("@pure_virtual");
        return false;
    }

    isConstExpr(): boolean {
        // todo: implement it properly
        return true;
    }
}
