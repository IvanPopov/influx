import { EInstructionTypes, IExprInstruction, IPostfixIndexInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IPostfixIndexInstructionSettings extends IInstructionSettings {
    element: IExprInstruction;
    index: IExprInstruction;
}


/**
 * Represent element[index]
 * EMPTY_OPERATOR Instruction ExprInstruction
 */
export class PostfixIndexInstruction extends ExprInstruction implements IPostfixIndexInstruction {
    readonly element: IExprInstruction;
    readonly index: IExprInstruction;

    constructor({ element, index, ...settings }: IPostfixIndexInstructionSettings) {
        super({ 
            instrType: EInstructionTypes.k_PostfixIndexExpr, 
            type: (element.type as IVariableTypeInstruction).arrayElementType, ...settings });
            
        this.element = Instruction.$withParent(element, this);
        this.index = Instruction.$withParent(index, this);
    }

    toCode(): string {
        return `${this.element.toCode()}[${this.index.toCode()}]`;
    }

    
    isConst(): boolean {
        return this.element.isConst() && this.index.isConst();
    }
}


