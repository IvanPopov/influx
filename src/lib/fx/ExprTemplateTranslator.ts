import { IMap } from "../idl/IMap";
import { IAFXSimpleInstruction, IAFXInstruction } from "../idl/IAFXInstruction";
import { isNull } from "../common";
import { SimpleInstruction } from "./instructions/SimpleInstruction";

export class ExprTemplateTranslator {
    private _pInToOutArgsMap: IMap<number> = null;
    private _pExprPart: IAFXSimpleInstruction[] = null;

    constructor(sExprTemplate: string) {
        this._pInToOutArgsMap = <IMap<number>>{};
        this._pExprPart = <IAFXSimpleInstruction[]>[];

        var pSplitTemplate: string[] = sExprTemplate.split(/(\$\d+)/);

        for (var i: number = 0; i < pSplitTemplate.length; i++) {
            if (pSplitTemplate[i]) {
                if (pSplitTemplate[i][0] !== '$') {
                    this._pExprPart.push(new SimpleInstruction(pSplitTemplate[i]));
                }
                else {
                    this._pExprPart.push(null);
                    this._pInToOutArgsMap[this._pExprPart.length - 1] = ((<number><any>(pSplitTemplate[i].substr(1))) * 1 - 1);
                }
            }
        }
    }

    toInstructionList(pArguments: IAFXInstruction[]): IAFXInstruction[] {
        var pOutputInstructionList: IAFXInstruction[] = <IAFXInstruction[]>[];

        for (var i: number = 0; i < this._pExprPart.length; i++) {
            if (isNull(this._pExprPart[i])) {
                pOutputInstructionList.push(pArguments[this._pInToOutArgsMap[i]]);
            }
            else {
                pOutputInstructionList.push(this._pExprPart[i]);
            }
        }

        return pOutputInstructionList;
    }
}
