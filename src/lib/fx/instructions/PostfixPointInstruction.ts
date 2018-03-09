import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IIdExprInstruction, EFunctionType, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings } from "./Instruction";


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
        
        this._element = element.$withParent(this);
        this._postfix = postfix.$withParent(this);
    }


    get element(): IExprInstruction {
        return this._element;
    }


    get postfix(): IIdExprInstruction {
        return this._postfix;
    }



    prepareFor(eUsedMode: EFunctionType) {
        this.element.prepareFor(eUsedMode);
        this.postfix.prepareFor(eUsedMode);
    }

    
    toCode(): string {
        var code: string = '';

        code += this.element.visible ? this.element.toCode() : "";
        code += this.element.visible ? "." : "";
        code += this.postfix.visible ? this.postfix.toCode() : "";

        return code;
    }

    
    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        this._element.addUsedData(pUsedDataCollector, EVarUsedMode.k_Undefined);
        this._postfix.addUsedData(pUsedDataCollector, eUsedMode);
    }


    isConst(): boolean {
        return (<IExprInstruction>this.element).isConst();
    }
}

