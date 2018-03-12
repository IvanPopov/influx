import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IInstruction, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction, IPairedExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import * as Effect from '../Effect';
import { IInstructionSettings } from "./Instruction";

export type RelationOperator = "==" | "!=" | "<" | ">" | "<=" | ">=";

export interface IRelationalExprInstructionSettings extends IInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: RelationOperator;
}

/**
 * Represent someExpr == != < > <= >= someExpr
 * (==|!=|<|>|<=|>=) Instruction Instruction
 */
export class RelationalExprInstruction extends ExprInstruction implements IPairedExprInstruction {
    protected _leftOperand: IExprInstruction;
    protected _rightOperand: IExprInstruction;
    protected _operator: RelationOperator;


    constructor({ left, right, operator, ...settings }: IRelationalExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_RelationalExprInstruction, type: Effect.findSystemType('bool').asVarType(), ...settings });
        this._leftOperand = left;
        this._rightOperand = right;
        this._operator = operator;
    }

    
    get left(): IInstruction {
        return this._leftOperand;
    }

    
    get right(): IInstruction {
        return this._rightOperand;
    }


    get operator(): string {
        return this._operator;
    }


    toCode(): string {
        var code: string = '';
        code += this.left.toCode();
        code += this.operator;
        code += this.right.toCode();
        return code;
    }

    
    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        super.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }


    isConst(): boolean {
        return (<IExprInstruction>this.left).isConst() &&
            (<IExprInstruction>this.right).isConst();
    }
}


