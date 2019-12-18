import { EInstructionTypes, IExprInstruction, IIdExprInstruction, IPostfixPointInstruction } from "@lib/idl/IInstruction";

import { ExprInstruction } from "./ExprInstruction";
import { IInstructionSettings, Instruction } from "./Instruction";

export interface IPostfixPointInstructionSettings extends IInstructionSettings {
    element: IExprInstruction;
    postfix: IIdExprInstruction;
}


/**
 * Represent someExpr.id
 * EMPTY_OPERATOR Instruction IdInstruction
 */
export class PostfixPointInstruction extends ExprInstruction implements IPostfixPointInstruction {
    readonly element: IExprInstruction;
    readonly postfix: IIdExprInstruction;


    constructor({ element, postfix, ...settings }: IPostfixPointInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PostfixPointExpr, type: postfix.type, ...settings });
        
        this.element = Instruction.$withParent(element, this);
        this.postfix = Instruction.$withParent(postfix, this);
    }

    
    toCode(): string {
        return `${this.element.toCode()}.${this.postfix.toCode()}`;
    }


    isConst(): boolean {
        return this.element.isConst();
    }
}

