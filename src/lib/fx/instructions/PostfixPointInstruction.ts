import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IIdExprInstruction, EFunctionType, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";


export interface IPostfixPointInstructionSettings extends IInstructionSettings {
    element: IExprInstruction;
    postfix: IIdExprInstruction;
}


/*
 * Represent someExpr.id
 * EMPTY_OPERATOR Instruction IdInstruction
 */
export class PostfixPointInstruction extends ExprInstruction {
    protected _element: IExprInstruction;
    protected _postfix: IIdExprInstruction;


    constructor({ element, postfix, ...settings }: IPostfixPointInstructionSettings) {
        super({ instrType: EInstructionTypes.k_PostfixPointInstruction, type: postfix.type, ...settings });
        
        this._element = Instruction.$withParent(element, this);
        this._postfix = Instruction.$withParent(postfix, this);
    }


    get element(): IExprInstruction {
        return this._element;
    }


    get postfix(): IIdExprInstruction {
        return this._postfix;
    }

    
    toCode(): string {
        var code: string = '';

        code += this.element.visible ? this.element.toCode() : "";
        code += this.element.visible ? "." : "";
        code += this.postfix.visible ? this.postfix.toCode() : "";

        return code;
    }


    isConst(): boolean {
        return (<IExprInstruction>this.element).isConst();
    }
}

