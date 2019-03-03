import { IMap } from "../idl/IMap";
import { EParserType, IRule } from "../idl/parser/IParser";
import { isDef } from "../common";
import { Item } from "./Item"

export class State {
    private _pItemList: Item[];
    private _pNextStates: IMap<State>;
    private _iIndex: number;
    private _nBaseItems: number;

    getIndex(): number {
        return this._iIndex;
    }

    setIndex(iIndex: number): void {
        this._iIndex = iIndex;
    }

    getItems(): Item[] {
        return this._pItemList;
    }

    getNumBaseItems(): number {
        return this._nBaseItems;
    }

    getNextStates(): IMap<State> {
        return this._pNextStates;
    }

    constructor() {
        this._pItemList = <Item[]>[];
        this._pNextStates = <IMap<State>>{};
        this._iIndex = 0;
        this._nBaseItems = 0;
    }

    hasItem(pItem: Item, eType: EParserType): Item | null {
        var i;
        var pItems: Item[] = this._pItemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].isEqual(pItem, eType)) {
                return pItems[i];
            }
        }
        return null;
    }

    hasParentItem(pItem: Item): Item | null {
        var i;
        var pItems = this._pItemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].isParentItem(pItem)) {
                return pItems[i];
            }
        }
        return null;
    }

    hasChildItem(pItem: Item): Item | null {
        var i;
        var pItems = this._pItemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].isChildItem(pItem)) {
                return pItems[i];
            }
        }
        return null;
    }

    hasRule(pRule: IRule, iPos: number): boolean {
        var i: number = 0;
        var pItemList: Item[] = this._pItemList;
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
        return !(this._pItemList.length);
    }

    isEqual(pState: State, eType: EParserType): boolean {
        var pItemsA: Item[] = this._pItemList;
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
        if (this._pItemList.length === 0 || pItem.getPosition() > 0) {
            this._nBaseItems += 1;
        }
        pItem.setState(this);
        this._pItemList.push(pItem);
    }

    public tryPush_LR0(pRule: IRule, iPos: number): boolean {
        var i: number;
        var pItems: Item[] = this._pItemList;
        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].getRule() === pRule && pItems[i].getPosition() === iPos) {
                return false;
            }
        }
        var pItem: Item = new Item(pRule, iPos);
        this.push(pItem);
        return true;
    }

    public tryPush_LR(pRule: IRule, iPos: number, sExpectedSymbol: string): boolean {
        var i: number;
        var pItems: Item[] = <Item[]>(this._pItemList);

        for (i = 0; i < pItems.length; i++) {
            if (pItems[i].getRule() === pRule && pItems[i].getPosition() === iPos) {
                return pItems[i].addExpected(sExpectedSymbol);
            }
        }

        var pExpected: IMap<boolean> = <IMap<boolean>>{};
        pExpected[sExpectedSymbol] = true;

        var pItem: Item = new Item(pRule, iPos, pExpected);
        this.push(pItem);
        return true;
    }

    public getNextStateBySymbol(sSymbol: string): State | null {
        if (isDef(this._pNextStates[sSymbol])) {
            return this._pNextStates[sSymbol];
        }
        else {
            return null;
        }
    }

    public addNextState(sSymbol: string, pState: State): boolean {
        if (isDef(this._pNextStates[sSymbol])) {
            return false;
        }
        else {
            this._pNextStates[sSymbol] = pState;
            return true;
        }
    }

    public deleteNotBase(): void {
        this._pItemList.length = this._nBaseItems;
    }

    public toString(isBase: boolean = true): string {
        let len: number = 0;
        let sMsg: string;
        let pItemList: Item[] = this._pItemList;

        sMsg = "State " + this._iIndex + ":\n";
        len = isBase ? this._nBaseItems : pItemList.length;

        for (let j = 0; j < len; j++) {
            sMsg += "\t\t";
            sMsg += pItemList[j].toString();
            sMsg += "\n";
        }

        return sMsg;
    }
}
