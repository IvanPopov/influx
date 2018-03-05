import { ExprInstruction } from "./ExprInstruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, EVarUsedMode, ITypedInstruction, IConditionalExprInstruction, ITypeUseInfoContainer, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";

/**
 * Represen boolExpr ? someExpr : someExpr
 * EMPTY_OPERATOR Instruction Instruction Instruction 
 */
export class ConditionalExprInstruction extends ExprInstruction implements IConditionalExprInstruction {
    private _cond: IExprInstruction;
    private _leftValue: ITypedInstruction;
    private _rightValue: ITypedInstruction;

    constructor(node: IParseNode, cond: IExprInstruction, left: ITypedInstruction, right: ITypedInstruction) {
        super(node, left.type, EInstructionTypes.k_ConditionalExprInstruction);
        
        this._cond = cond;
        this._leftValue = left;
        this._rightValue = right;
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


    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        this._cond.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        this._leftValue.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
        this._rightValue.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);
    }

    
    isConst(): boolean {
        return (<IExprInstruction>this.condition).isConst() &&
            (<IExprInstruction>this.left).isConst();
    }
}


