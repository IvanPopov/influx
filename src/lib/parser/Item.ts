import { IRule, EParserType } from "../idl/parser/IParser";
import { IMap } from "../idl/IMap";
import { END_POSITION, T_EMPTY } from "./symbols";
import { isDef, assert } from "../common";
import { State } from "./State";


export class Item {
    private _rule: IRule;
    /**
     * Position in item. 
     * left: right0,   right1, ...., rightN;
     *               ^
     *               position
     */
    private _pos: number;
    /**
     * Index in parser.
     * (Uniq ID)
     */
    private _index: number;
    /**
     * Parent state.
     */
    private _state: State | null;

    private _expected: IMap<boolean>;
    private _isNewExpected: boolean;

    getRule(): IRule {
        return this._rule;
    }

    setRule(pRule: IRule): void {
        this._rule = pRule;
    }

    getPosition(): number {
        return this._pos;
    }

    setPosition(iPos: number): void {
        this._pos = iPos;
    }

    getState(): State | null {
        return this._state;
    }

    setState(pState: State): void {
        assert(!this._state);
        this._state = pState;
    }

    getIndex(): number {
        return this._index;
    }

    setIndex(iIndex: number): void {
        this._index = iIndex;
    }

    getIsNewExpected(): boolean {
        return this._isNewExpected;
    }

    setIsNewExpected(_isNewExpected: boolean) {
        this._isNewExpected = _isNewExpected;
    }

    getExpectedSymbols(): IMap<boolean> {
        return this._expected;
    }

    getLength(): number {
        return Object.keys(this._expected).length;
    }

    constructor(pRule: IRule, iPos: number, pExpected?: IMap<boolean>) {
        this._rule = pRule;
        this._pos = iPos;
        this._index = 0;
        this._state = null;

        this._isNewExpected = true;
        this._expected = {};

        if (arguments.length === 3) {
            var pKeys = Object.getOwnPropertyNames(<IMap<boolean>>arguments[2]);

            for (var i: number = 0; i < pKeys.length; i++) {
                this.addExpected(pKeys[i]);
            }
        }
    }

    isEqual(pItem: Item, eType: EParserType = EParserType.k_LR0): boolean {
        if (eType === EParserType.k_LR0) {
            return (this._rule === pItem.getRule() && this._pos === pItem.getPosition());
        }
        else if (eType === EParserType.k_LR1) {
            if (!(this._rule === pItem.getRule() && this._pos === pItem.getPosition() && this.getLength() === (<Item>pItem).getLength())) {
                return false;
            }
            var i: string = "";
            for (i in this._expected) {
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
        return (this._rule === pItem.getRule() && this._pos === pItem.getPosition() + 1);
    }

    isChildItem(pItem: Item): boolean {
        return (this._rule === pItem.getRule() && this._pos === pItem.getPosition() - 1);
    }

    mark(): string {
        var pRight: string[] = this._rule.right;
        if (this._pos === pRight.length) {
            return END_POSITION;
        }
        return pRight[this._pos];
    }

    end(): string {
        return this._rule.right[this._rule.right.length - 1] || T_EMPTY;
    }

    nextMarked(): string {
        return this._rule.right[this._pos + 1] || END_POSITION;
    }

    isExpected(sSymbol: string): boolean {
        return !!(this._expected[sSymbol]);
    }

    addExpected(sSymbol: string): boolean {
        if (this._expected[sSymbol]) {
            return false;
        }
        this._expected[sSymbol] = true;
        this._isNewExpected = true;
        return true;
    }

    toString(): string {
        let msg: string = this._rule.left + " -> ";
        let expected: string = "";
        let right: string[] = this._rule.right;

        for (let k = 0; k < right.length; k++) {
            if (k === this._pos) {
                msg += ". ";
            }
            msg += right[k] + " ";
        }

        if (this._pos === right.length) {
            msg += ". ";
        }

        if (isDef(this._expected)) {
            expected = ", ";
            let pKeys = Object.getOwnPropertyNames(this._expected);

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
