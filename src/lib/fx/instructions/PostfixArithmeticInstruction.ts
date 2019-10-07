import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, EInstructionTypes, IPostfixArithmeticInstruction } from "../../idl/IInstruction";
import { IExprInstructionSettings } from "./ExprInstruction";
import { IVariableTypeInstruction } from "../../idl/IInstruction";
import { IParseNode } from "../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";


export type PostfixOperator = "++" | "--";

export interface IPostfixArithmeticInstructionSettings extends IInstructionSettings {
    expr: IExprInstruction;
    operator: PostfixOperator;
}

/**
 * Represent someExpr ++
 * (-- | ++) Instruction
 */
export class PostfixArithmeticInstruction extends ExprInstruction implements IPostfixArithmeticInstruction {
    protected _operator: PostfixOperator;
    protected _expr: IExprInstruction;

    
    constructor({ expr, operator, ...settings }: IPostfixArithmeticInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PostfixArithmeticInstruction, type: expr.type, ...settings });

        this._operator = operator;
        this._expr = Instruction.$withParent(expr, this);
    }


    get expr(): IExprInstruction {
        return this._expr;
    }


    get operator(): string {
        return this._operator;
    }


    toCode(): string {
        var code: string = '';

        code += this.expr.toCode();
        code += this.operator;

        return code;
    }


    isConst(): boolean {
        return (<IExprInstruction>this.expr).isConst();
    }
}

