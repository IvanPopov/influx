import { ExprInstruction } from "./ExprInstruction";
import { IDispatch } from "../../../sandbox/actions";
import { IVariableDeclInstruction, IVariableTypeInstruction, EInstructionTypes, IExprInstruction, EVarUsedMode, ITypeUseInfoContainer } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";
import { IInstructionSettings, Instruction } from "./Instruction";
import { VariableTypeInstruction } from "./VariableTypeInstruction";


export interface IPostfixIndexInstructionSettings extends IInstructionSettings {
    element: IExprInstruction;
    index: IExprInstruction;
}


/**
 * Represent someExpr[someIndex]
 * EMPTY_OPERATOR Instruction ExprInstruction
 */
export class PostfixIndexInstruction extends ExprInstruction {
    // private _samplerArrayDecl: IVariableDeclInstruction = null;
    protected _element: IExprInstruction;
    protected _index: IExprInstruction;

    constructor({ element, index, ...settings }: IPostfixIndexInstructionSettings) {
        super({ 
            instrType: EInstructionTypes.k_PostfixIndexInstruction, 
            type: (element.type as IVariableTypeInstruction).arrayElementType, ...settings });
            
        this._element = Instruction.$withParent(element, this);
        this._index = Instruction.$withParent(index, this);

        // console.log('[PostfixIndexInstruction]');
        // console.log('element:', element.toCode(), element.type && element.type.hash);
        // console.log('index:', index.toCode());
        // console.log('this.type:', this.type && this.type.hash)
    }

    
    get index(): IExprInstruction {
        return this._index;
    }


    get element(): IExprInstruction {
        return this._element;
    }


    toCode(): string {
        let code: string = "";
        {
            code += this.element.toCode();
            {
                code += "[" + this.index.toCode() + "]";
            }
        }
        return code;
    }

    
    isConst(): boolean {
        return this.element.isConst() && this.index.isConst();
    }
}


