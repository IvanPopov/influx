import { StmtInstruction } from "./StmtInstruction";
import { IExprInstruction } from "./../../idl/IInstruction";
import { EInstructionTypes, EFunctionType, ITypedInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent return expr;
 * return ExprInstruction
 */
export class ReturnStmtInstruction extends StmtInstruction {
    private _operator: string;
    private _expr: IExprInstruction;

    constructor(pNode: IParseNode, expr: IExprInstruction) {
        super(pNode, EInstructionTypes.k_ReturnStmtInstruction);
        
        this._operator = "return";
        this._expr = expr;
    }


    get expr(): IExprInstruction {
        return this._expr;
    }


    prepareFor(eUsedMode: EFunctionType): void {
        var expr: ITypedInstruction = <ITypedInstruction>this.expr;
        if (isNull(expr)) {
            return;
        }

        if (eUsedMode === EFunctionType.k_Vertex) {
            if (expr.type.isBase()) {
                // this._isPositionReturn = true;
            }
            else {
                // this._isOnlyReturn = true;
            }
        }
        else if (eUsedMode === EFunctionType.k_Pixel) {
            // this._isColorReturn = true;
        }
    }

    toCode(): string {
        if (this.expr) {
            return "return " + this.expr.toCode() + ";";
        }
        else {
            return "return;";
        }
    }
}

