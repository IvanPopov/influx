import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, IIdExprInstruction, EFunctionType, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/*
 * Represent someExpr.id
 * EMPTY_OPERATOR Instruction IdInstruction
 */
export class PostfixPointInstruction extends ExprInstruction {
    protected _element: IExprInstruction;
    protected _postfix: IIdExprInstruction;


    constructor(node: IParseNode, element: IExprInstruction, postfix: IIdExprInstruction) {
        super(node, postfix.type, EInstructionTypes.k_PostfixPointInstruction);
        this._element = element;
        this._postfix = postfix;
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

