import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings } from "./Instruction";
import { IParseNode } from "./../../idl/parser/IParser";
import { EInstructionTypes, EVarUsedMode, ITypedInstruction, IConditionalExprInstruction, ITypeUseInfoContainer, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";


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
        super({ instrType: EInstructionTypes.k_ConditionalExprInstruction, type: left.type, ...settings});

        console.assert(left.type.isStrongEqual(right.type));
        
        this._cond = cond.$withParent(this);
        this._leftValue = left.$withParent(this);
        this._rightValue = right.$withParent(this);
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


