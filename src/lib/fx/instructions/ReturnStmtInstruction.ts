import { StmtInstruction } from "./StmtInstruction";
import { EAFXInstructionTypes, EFunctionType, IAFXTypedInstruction } from "../../idl/IAFXInstruction";
import { isNull } from "../../common";
import { IParseNode } from "../../idl/parser/IParser";


/**
 * Represent return expr;
 * return ExprInstruction
 */
export class ReturnStmtInstruction extends StmtInstruction {
    private _isPositionReturn: boolean = false;
    private _isColorReturn: boolean = false;
    private _isOnlyReturn: boolean = false;

    constructor(pNode: IParseNode) {
        super(pNode);
        this._pInstructionList = [null];
        this._sOperatorName = "return";
        this._eInstructionType = EAFXInstructionTypes.k_ReturnStmtInstruction;
    }

    prepareFor(eUsedMode: EFunctionType): void {
        var pReturn: IAFXTypedInstruction = <IAFXTypedInstruction>this.instructions[0];
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
            this._pInstructionList[i].prepareFor(eUsedMode);
        }
    }

    toCode(): string {
        if (this._isPositionReturn) {
            return "Out.POSITION=" + this._pInstructionList[0].toCode() + "; return;";
        }
        if (this._isColorReturn) {
            //return "gl_FragColor=" + this._pInstructionList[0].toCode() + "; return;";
            return "resultAFXColor=" + this._pInstructionList[0].toCode() + "; return;";
        }
        if (this._isOnlyReturn) {
            return "return;"
        }

        if (this.instructions.length > 0) {
            return "return " + this._pInstructionList[0].toCode() + ";";
        }
        else {
            return "return;";
        }
    }
}

