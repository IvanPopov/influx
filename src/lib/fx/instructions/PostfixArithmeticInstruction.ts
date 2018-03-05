import { IExprInstruction, EVarUsedMode, ITypeUseInfoContainer, EInstructionTypes } from "../../idl/IInstruction";
import { IVariableTypeInstruction } from "./../../idl/IInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { IMap } from "../../idl/IMap";
import { ExprInstruction } from "./ExprInstruction";


/**
 * Represent someExpr ++
 * (-- | ++) Instruction
 */
export class PostfixArithmeticInstruction extends ExprInstruction {
    protected _operator: string;
    protected _expr: IExprInstruction;

    
    constructor(node: IParseNode, expr: IExprInstruction, operator: string) {
        super(node, expr.type, EInstructionTypes.k_PostfixArithmeticInstruction);

        this._operator = operator;
        this._expr = expr;
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


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this.expr;
        pSubExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_ReadWrite);
    }
    

    isConst(): boolean {
        return (<IExprInstruction>this.expr).isConst();
    }
}

