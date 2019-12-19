import { EInstructionTypes, IConditionalExprInstruction, IExprInstruction, ITypedInstruction } from "@lib/idl/IInstruction";
import { type } from '@lib/fx/analisys/helpers';

import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IConditionalExprInstructionSettings extends IInstructionSettings {
    cond: IExprInstruction;
    left: ITypedInstruction;
    right: ITypedInstruction;
}


/**
 * Represen boolExpr ? someExpr : someExpr
 * EMPTY_OPERATOR Instruction Instruction Instruction 
 */
export class ConditionalExprInstruction extends ExprInstruction implements IConditionalExprInstruction {
    protected _cond: IExprInstruction;
    protected _leftValue: ITypedInstruction;
    protected _rightValue: ITypedInstruction;

    constructor({ cond, left, right, ...settings }: IConditionalExprInstructionSettings) {
        // todo: do not use {left.type} here
        super({ instrType: EInstructionTypes.k_ConditionalExpr, type: left.type, ...settings});

        console.assert(type.equals(left.type, right.type, true));
        
        this._cond = Instruction.$withParent(cond, this);
        this._leftValue = Instruction.$withParent(left, this);
        this._rightValue = Instruction.$withParent(right, this);
    }


    get condition(): IExprInstruction {
        return this._cond;
    }

    
    get left(): ITypedInstruction {
        return this._leftValue;
    }


    get right(): ITypedInstruction {
        return this._rightValue;
    }


    toCode(): string {
        var code: string = '(';
        code += this.condition.toCode();
        code += '?';
        code += this.left.toCode();
        code += ':';
        code += this.right.toCode();
        code += ')';
        return code;
    }

    
    isConst(): boolean {
        return (<IExprInstruction>this.condition).isConst() &&
            (<IExprInstruction>this.left).isConst();
    }
}


