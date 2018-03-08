import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import * as Effect from '../Effect';
import { IInstructionSettings } from "./Instruction";


export interface ILogicalExprInstructionSettings extends IInstructionSettings {
    left: IExprInstruction;
    right: IExprInstruction;
    operator: string;
}


/**
 * Represent boolExpr && || boolExpr
 * (&& | ||) Instruction Instruction
 */
export class LogicalExprInstruction extends ExprInstruction {
    protected _operator: string;
    protected _leftOperand: IExprInstruction;
    protected _rightOperand: IExprInstruction;

    constructor({ left, right, operator, ...settings }: ILogicalExprInstructionSettings) {
        super({ instrType: EInstructionTypes.k_LogicalExprInstruction, type: Effect.getSystemType("bool").asVarType(), ...settings });

        this._leftOperand = left;
        this._rightOperand = right;
        this._operator = operator;
    }


    get operator(): string {
        return this._operator;
    }


    get left(): IExprInstruction {
        return this._leftOperand;
    }


    get right(): IExprInstruction {
        return this._rightOperand;
    }


    toCode(): string {
        var sCode: string = "";
        sCode += this.left.toCode();
        sCode += this.operator;
        sCode += this.right.toCode();
        return sCode;
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

