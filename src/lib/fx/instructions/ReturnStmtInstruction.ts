import { StmtInstruction } from "./StmtInstruction";
import { EInstructionTypes, EFunctionType, ITypedInstruction } from "../../idl/IInstruction";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent return expr;
 * return ExprInstruction
 */
export class ReturnStmtInstruction extends StmtInstruction {
    private _isPositionReturn: boolean;
    private _isColorReturn: boolean;
    private _isOnlyReturn: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_ReturnStmtInstruction);
        this.operator = "return";
        this._isPositionReturn = false;
        this._isColorReturn = false;
        this._isOnlyReturn = false;
    }

    prepareFor(eUsedMode: EFunctionType): void {
        var pReturn: ITypedInstruction = <ITypedInstruction>this.instructions[0];
        if (isNull(pReturn)) {
            return;
        }

        if (eUsedMode === EFunctionType.k_Vertex) {
            if (pReturn.type.isBase()) {
                this._isPositionReturn = true;
            }
            else {
                this._isOnlyReturn = true;
            }
        }
        else if (eUsedMode === EFunctionType.k_Pixel) {
            this._isColorReturn = true;
        }

        for (var i: number = 0; i < this.instructions.length; i++) {
            this.instructions[i].prepareFor(eUsedMode);
        }
    }

    toCode(): string {
        if (this._isPositionReturn) {
            return "Out.POSITION=" + this.instructions[0].toCode() + "; return;";
        }
        if (this._isColorReturn) {
            //return "gl_FragColor=" + this.instructions[0].toCode() + "; return;";
            return "resultColor=" + this.instructions[0].toCode() + "; return;";
        }
        if (this._isOnlyReturn) {
            return "return;"
        }

        if (this.instructions.length > 0) {
            return "return " + this.instructions[0].toCode() + ";";
        }
        else {
            return "return;";
        }
    }
}

