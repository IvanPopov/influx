import { assert, isDef } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { EParserType, IRule } from "@lib/idl/parser/IParser";

import { Item } from "./Item"

export class State {
    /**
     * Uniq id/index.
     */
    index: number;
    items: Item[];
    /**
     * 'symbol name => state' map
     * Aux.
     */
    nextStates: IMap<State>;
    /**
     * Number of items where symbol for which it state was build is placed as right part of rule.
     */
    numBaseItems: number;


    constructor() {
        this.items = <Item[]>[];
        this.nextStates = <IMap<State>>{};
        this.index = 0;
        this.numBaseItems = 0;
    }

    get baseItems(): Item[] {
        return this.items.slice(0, this.numBaseItems);
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

    hasRule(pRule: IRule, pos: number): boolean {
        return this.baseItems.findIndex(item => (item.rule === pRule && item.pos === pos)) !== -1;
    }

    isEmpty(): boolean {
        return !(this.items.length);
    }

    isEqual(state: State, type: EParserType): boolean {
        if (this.numBaseItems !== state.numBaseItems) {
            return false;
        }
        
        for (const baseItemA of this.baseItems) {
            let isEqual = false;
            for (const baseItemB of state.baseItems) {
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
            this.numBaseItems += 1;
        }
        assert(!item.state);
        item.state = this;
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
        return `State ${this.index}:\n` + 
            (isBase ? this.baseItems : this.items).map(item => `\t\t${item.toString(grammarSymbols)}\n`).join();
    }
}
