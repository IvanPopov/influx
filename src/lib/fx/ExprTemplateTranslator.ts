import { IMap } from "../idl/IMap";
import { ISimpleInstruction, IInstruction } from "../idl/IInstruction";
import { isNull } from "../common";
import { SimpleInstruction } from "./instructions/SimpleInstruction";

export class ExprTemplateTranslator {
    private _inToOutArgsMap: IMap<number> = null;
    private _exprPart: ISimpleInstruction[] = null;

    constructor(exprTemplate: string) {
        this._inToOutArgsMap = <IMap<number>>{};
        this._exprPart = <ISimpleInstruction[]>[];

        let pSplitTemplate: string[] = exprTemplate.split(/(\$\d+)/);
        for (let i: number = 0; i < pSplitTemplate.length; i++) {
            if (pSplitTemplate[i]) {
                if (pSplitTemplate[i][0] !== '$') {
                    this._exprPart.push(new SimpleInstruction(null, pSplitTemplate[i]));
                }
                else {
                    this._exprPart.push(null);
                    this._inToOutArgsMap[this._exprPart.length - 1] = ((<number><any>(pSplitTemplate[i].substr(1))) * 1 - 1);
                }
            }
        }
    }

    toInstructionList(args: IInstruction[]): IInstruction[] {
        let outputInstructionList: IInstruction[] = <IInstruction[]>[];

        for (let i: number = 0; i < this._exprPart.length; i++) {
            if (isNull(this._exprPart[i])) {
                outputInstructionList.push(args[this._inToOutArgsMap[i]]);
            }
            else {
                outputInstructionList.push(this._exprPart[i]);
            }
        }

        return outputInstructionList;
    }
}
