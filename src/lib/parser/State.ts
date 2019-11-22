import { assert } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { EParserType, IRule } from "@lib/idl/parser/IParser";

import { Item } from "./Item";

export class State {
    index: number;
    nextStates: IMap<State>;

    private items: Item[];
    private numBaseItems: number;
    // for debug only
    private numOtherItems: number;

    constructor() {
        this.nextStates = {};
        this.index = 0;

        this.items = [];
        this.numBaseItems = 0;
        this.numOtherItems = 0;
    }


    eachItem(cb: (item: Item, i?: number) => void) {
        // NOTE: do not try to change this for loop
        for (let i = 0; i < this.items.length; ++i) {
            cb(this.items[i], i);
        }
    }


    eachBaseItem(cb: (item: Item, i?: number) => void) {
        // NOTE: do not try to change this for loop
        for (let i = 0; i < this.numBaseItems; ++i) {
            cb(this.items[i], i);
        }
    }

    
    isExpected(symbol: string): boolean {
        return !!this.items.find(item => item.isExpected(symbol));
    }


    hasItem(value: Item, type: EParserType): Item {
        return this.items.find(item => item.isEqual(value, type)) || null;
    }

    
    hasParentItem(value: Item): Item {
        return this.items.find(item => item.isParentItem(value)) || null;
    }

    
    hasChildItem(value: Item): Item {
        return this.items.find(item => item.isChildItem(value)) || null;
    }

    
    hasRule(rule: IRule, pos: number): boolean {
        for (let i = 0; i < this.numBaseItems; ++i) {
            const item = this.items[i];
            if (item.rule === rule && item.pos === pos) {
                return true;
            }
        }
        return false;
    }

    
    isEmpty(): boolean {
        return !(this.items.length);
    }

    
    isEqual(state: State, type: EParserType): boolean {
        if (this.numBaseItems !== state.numBaseItems) {
            return false;
        }

        for (let i = 0; i < this.numBaseItems; ++i) {
            const baseItemA = this.items[i];

            let isEqual = false;
            for (let i = 0; i < state.numBaseItems; ++i) {
                const baseItemB = state.items[i];
                if (baseItemA.isEqual(baseItemB, type)) {
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

    
    push(item: Item): void {
        if (this.items.length === 0 || item.pos > 0) {
            assert(this.numOtherItems === 0);
            this.numBaseItems++;
        } else {
            this.numOtherItems++;
        }
        this.items.push(item);
    }


    tryPush_LR0(rule: IRule, pos: number): boolean {
        const sameItem = this.items.find(item => (item.rule === rule && item.pos === pos));
        if (sameItem) {
            return false;
        }

        const item = new Item(rule, pos);
        this.push(item);
        return true;
    }


    tryPush_LR(rule: IRule, pos: number, expectedSymbol: string): boolean {
        const sameItem = this.items.find(item => (item.rule === rule && item.pos === pos));
        if (sameItem) {
            return sameItem.addExpected(expectedSymbol);
        }

        const item = new Item(rule, pos, [expectedSymbol]);
        this.push(item);
        return true;
    }

    
    addNextState(symbol: string, state: State): boolean {
        if (this.nextStates[symbol]) {
            return false;
        }

        this.nextStates[symbol] = state;
        return true;
    }

    
    deleteNotBase(): void {
        this.items.length = this.numBaseItems;
    }

    
    toString(isBase: boolean = true, grammarSymbols: Map<string, string> = null): string {
        const items = isBase? this.items.slice(0, this.numBaseItems) : this.items;
        return `State ${this.index}:\n` +
            items.map(item => `\t\t${item.toString(grammarSymbols)}\n`).join();
    }
}
