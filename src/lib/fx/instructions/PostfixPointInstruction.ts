import { ExprInstruction } from "./ExprInstruction";
import { EInstructionTypes, EFunctionType, ITypeUseInfoContainer, EVarUsedMode, IExprInstruction } from "../../idl/IInstruction";
import { IMap } from "../../idl/IMap";
import { IParseNode } from "../../idl/parser/IParser";


/*
 * Represent someExpr.id
 * EMPTY_OPERATOR Instruction IdInstruction
 */
export class PostfixPointInstruction extends ExprInstruction {
    private _bToFinalFirst: boolean;
    private _bToFinalSecond: boolean;

    constructor(pNode: IParseNode) {
        super(pNode, EInstructionTypes.k_PostfixPointInstruction);
        this._bToFinalFirst = true;
        this._bToFinalSecond = true;
    }

    prepareFor(eUsedMode: EFunctionType) {
        if (!this.instructions[0].visible) {
            this._bToFinalFirst = false;
        }

        if (!this.instructions[1].visible) {
            this._bToFinalSecond = false;
        }

        this.instructions[0].prepareFor(eUsedMode);
        this.instructions[1].prepareFor(eUsedMode);
    }

    toCode(): string {
        var sCode: string = "";

        sCode += this._bToFinalFirst ? this.instructions[0].toCode() : "";
        sCode += this._bToFinalFirst ? "." : "";
        sCode += this._bToFinalSecond ? this.instructions[1].toCode() : "";

        return sCode;
    }

    addUsedData(pUsedDataCollector: IMap<ITypeUseInfoContainer>,
        eUsedMode: EVarUsedMode = EVarUsedMode.k_Undefined): void {
        var pSubExpr: IExprInstruction = <IExprInstruction>this.instructions[0];
        var pPoint: IExprInstruction = <IExprInstruction>this.instructions[1];

        pSubExpr.addUsedData(pUsedDataCollector, EVarUsedMode.k_Undefined);
        pPoint.addUsedData(pUsedDataCollector, eUsedMode);
    }

    isConst(): boolean {
        return (<IExprInstruction>this.instructions[0]).isConst();
    }
}

