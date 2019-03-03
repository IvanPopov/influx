import { IRule, EParserType } from "../idl/parser/IParser";
import { IMap } from "../idl/IMap";
import { END_POSITION, T_EMPTY } from "./symbols";
import { isDef } from "../common";
import { State } from "./State";


export class Item {
    private _pRule: IRule;
    private _iPos: number;
    private _iIndex: number;
    private _pState: State | null;

    private _pExpected: IMap<boolean>;
    private _isNewExpected: boolean;
    private _iLength: number;

    getRule(): IRule {
        return this._pRule;
    }

    setRule(pRule: IRule): void {
        this._pRule = pRule;
    }

    getPosition(): number {
        return this._iPos;
    }

    setPosition(iPos: number): void {
        this._iPos = iPos;
    }

    getState(): State | null {
        return this._pState;
    }

    setState(pState: State): void {
        this._pState = pState;
    }

    getIndex(): number {
        return this._iIndex;
    }

    setIndex(iIndex: number): void {
        this._iIndex = iIndex;
    }

    getIsNewExpected(): boolean {
        return this._isNewExpected;
    }

    setIsNewExpected(_isNewExpected: boolean) {
        this._isNewExpected = _isNewExpected;
    }

    getExpectedSymbols(): IMap<boolean> {
        return this._pExpected;
    }

    getLength(): number {
        return this._iLength;
    }

    constructor(pRule: IRule, iPos: number, pExpected?: IMap<boolean>) {
        this._pRule = pRule;
        this._iPos = iPos;
        this._iIndex = 0;
        this._pState = null;

        this._isNewExpected = true;
        this._iLength = 0;
        this._pExpected = <IMap<boolean>>{};

        if (arguments.length === 3) {
            var pKeys = Object.getOwnPropertyNames(<IMap<boolean>>arguments[2]);

            for (var i: number = 0; i < pKeys.length; i++) {
                this.addExpected(pKeys[i]);
            }
        }
    }

    isEqual(pItem: Item, eType: EParserType = EParserType.k_LR0): boolean {
        if (eType === EParserType.k_LR0) {
            return (this._pRule === pItem.getRule() && this._iPos === pItem.getPosition());
        }
        else if (eType === EParserType.k_LR1) {
            if (!(this._pRule === pItem.getRule() && this._iPos === pItem.getPosition() && this._iLength === (<Item>pItem).getLength())) {
                return false;
            }
            var i: string = "";
            for (i in this._pExpected) {
                if (!(<Item>pItem).isExpected(i)) {
                    return false;
                }
            }
            return true;
        }
        else {
            //We never must be here, for LALR(1) we work with LR0 items. This 'else'-stmt onlu for closure-compliler.
            return false;
        }
    }

    isParentItem(pItem: Item): boolean {
        return (this._pRule === pItem.getRule() && this._iPos === pItem.getPosition() + 1);
    }

    isChildItem(pItem: Item): boolean {
        return (this._pRule === pItem.getRule() && this._iPos === pItem.getPosition() - 1);
    }

    mark(): string {
        var pRight: string[] = this._pRule.right;
        if (this._iPos === pRight.length) {
            return END_POSITION;
        }
        return pRight[this._iPos];
    }

    end(): string {
        return this._pRule.right[this._pRule.right.length - 1] || T_EMPTY;
    }

    nextMarked(): string {
        return this._pRule.right[this._iPos + 1] || END_POSITION;
    }

    isExpected(sSymbol: string): boolean {
        return !!(this._pExpected[sSymbol]);
    }

    addExpected(sSymbol: string): boolean {
        if (this._pExpected[sSymbol]) {
            return false;
        }
        this._pExpected[sSymbol] = true;
        this._isNewExpected = true;
        this._iLength++;
        return true;
    }

    toString(): string {
        let msg: string = this._pRule.left + " -> ";
        let expected: string = "";
        let right: string[] = this._pRule.right;

        for (let k = 0; k < right.length; k++) {
            if (k === this._iPos) {
                msg += ". ";
            }
            msg += right[k] + " ";
        }

        if (this._iPos === right.length) {
            msg += ". ";
        }

        if (isDef(this._pExpected)) {
            expected = ", ";
            let pKeys = Object.getOwnPropertyNames(this._pExpected);

            for (let l: number = 0; l < pKeys.length; ++l) {
                expected += pKeys[l] + "/";
            }

            if (expected !== ", ") {
                msg += expected;
            }
        }

        msg = msg.slice(0, msg.length - 1);
        return msg;
    }
}
