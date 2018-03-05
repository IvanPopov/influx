import { ExprInstruction } from "./ExprInstruction";
import { IDispatch } from "./../../../sandbox/actions/index";
import { IVariableDeclInstruction, IVariableTypeInstruction, EInstructionTypes, IExprInstruction, EVarUsedMode, ITypeUseInfoContainer } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent someExpr[someIndex]
 * EMPTY_OPERATOR Instruction ExprInstruction
 */
export class PostfixIndexInstruction extends ExprInstruction {
    // private _samplerArrayDecl: IVariableDeclInstruction = null;
    protected _element: IExprInstruction;
    protected _index: IExprInstruction;

    constructor(node: IParseNode, element: IExprInstruction, index: IExprInstruction) {
        super(node, (element.type as IVariableTypeInstruction).arrayElementType, EInstructionTypes.k_PostfixIndexInstruction);
        this._element = element;
        this._index = index;
    }

    
    get index(): IExprInstruction {
        return this._index;
    }


    get element(): IExprInstruction {
        return this._element;
    }


    toCode(): string {
        var sCode: string = "";

        {
            sCode += this.element.toCode();

            if (!(<IExprInstruction>this.element).type.collapsed) {
                sCode += "[" + this.index.toCode() + "]";
            }
        }

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this.element;
        var pIndex: IExprInstruction = <IExprInstruction>this.index;

        pSubExpr.addUsedData(pUsedDataCollector, eUsedMode);
        pIndex.addUsedData(pUsedDataCollector, EVarUsedMode.k_Read);

        if (pSubExpr.type.isFromVariableDecl() && pSubExpr.type.isSampler()) {
            // this._samplerArrayDecl = pSubExpr.type.parentVarDecl;
        }
    }

    isConst(): boolean {
        return (<IExprInstruction>this.element).isConst() &&
            (<IExprInstruction>this.index).isConst();
    }
}


