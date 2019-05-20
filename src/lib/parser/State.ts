import { IMap } from "../idl/IMap";
import { EParserType, IRule } from "../idl/parser/IParser";
import { isDef } from "../common";
import { Item } from "./Item"

export class State {
    private _itemList: Item[];
    /**
     * 'symbol name => state' map
     */
    private _nextStates: IMap<State>;
    /**
     * Uniq id/index.
     * see: Parser._stateList
     */
    private _iIndex: number;
    /**
     * Number of items where symbol for which it state was build is placed as right part of rule.
     */
    private _nBaseItems: number;

    getIndex(): number {
        return this._iIndex;
    }

    setIndex(iIndex: number): void {
        this._iIndex = iIndex;
    }

    getItems(): Item[] {
        return this._itemList;
    }

    getNumBaseItems(): number {
        return this._nBaseItems;
    }

    getNextStates(): IMap<State> {
        return this._nextStates;
    }

    constructor() {
        this._itemList = <Item[]>[];
        this._nextStates = <IMap<State>>{};
        this._iIndex = 0;
        this._nBaseItems = 0;
    }

    hasItem(pItem: Item, eType: EParserType): Item | null {
        var i;
        var pItems: Item[] = this._itemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].isEqual(pItem, eType)) {
                return pItems[i];
            }
        }
        return null;
    }

    hasParentItem(pItem: Item): Item | null {
        var i;
        var pItems = this._itemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].isParentItem(pItem)) {
                return pItems[i];
            }
        }
        return null;
    }

    hasChildItem(pItem: Item): Item | null {
        var i;
        var pItems = this._itemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].isChildItem(pItem)) {
                return pItems[i];
            }
        }
        return null;
    }

    hasRule(pRule: IRule, iPos: number): boolean {
        var i: number = 0;
        var pItemList: Item[] = this._itemList;
        var pItem: Item;

        for (i = 0; i < this._nBaseItems; i++) {
            pItem = pItemList[i];
            if (pItem.getRule() === pRule && pItem.getPosition() === iPos) {
                return true;
            }
        }

        return false;
    }

    isEmpty(): boolean {
        return !(this._itemList.length);
    }

    isEqual(pState: State, eType: EParserType): boolean {
        var pItemsA: Item[] = this._itemList;
        var pItemsB: Item[] = pState.getItems();

        if (this._nBaseItems !== pState.getNumBaseItems()) {
            return false;
        }
        let nItems = this._nBaseItems;
        var i, j;
        var isEqual;
        for (i = 0; i < nItems; i++) {
            isEqual = false;
            for (j = 0; j < nItems; j++) {
                if (pItemsA[i].isEqual(pItemsB[j], eType)) {
                    isEqual = true;
                    break;
                }
            }
            if (!isEqual) {
                return false;
            }
        }
        return true;
    }

    public push(pItem: Item): void {
        if (this._itemList.length === 0 || pItem.getPosition() > 0) {
            this._nBaseItems += 1;
        }
        pItem.setState(this);
        this._itemList.push(pItem);
    }


    public tryPush_LR0(pRule: IRule, iPos: number): boolean {
        let items = this._itemList;
        for (let i = 0; i < items.length; i++) {
            if (items[i].getRule() === pRule && items[i].getPosition() === iPos) {
                return false;
            }
        }
        let item = new Item(pRule, iPos);
        this.push(item);
        return true;
    }


    public tryPush_LR(pRule: IRule, iPos: number, expectedSymbol: string): boolean {
        let items = this._itemList;

        for (let i = 0; i < items.length; i++) {
            if (items[i].getRule() === pRule && items[i].getPosition() === iPos) {
                return items[i].addExpected(expectedSymbol);
            }
        }

        let expected = { [expectedSymbol]: true };
        let item = new Item(pRule, iPos, expected);
        this.push(item);
        return true;
    }

    public getNextStateBySymbol(sSymbol: string): State | null {
        if (isDef(this._nextStates[sSymbol])) {
            return this._nextStates[sSymbol];
        }

        return null;
    }

    /**
     * 
     */
    public addNextState(symbol: string, state: State): boolean {
        if (isDef(this._nextStates[symbol])) {
            return false;
        } else {
            this._nextStates[symbol] = state;
            return true;
        }
    }

    public deleteNotBase(): void {
        this._itemList.length = this._nBaseItems;
    }

    public toString(isBase: boolean = true, grammarSymbols: IMap<string> = null): string {
        let itemList = this._itemList;

        let msg = "State " + this._iIndex + ":\n";
        let len = isBase ? this._nBaseItems : itemList.length;

        for (let j = 0; j < len; j++) {
            msg += "\t\t";
            msg += itemList[j].toString(grammarSymbols);
            msg += "\n";
        }

        return msg;
    }
}
