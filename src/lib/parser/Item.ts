import { assert, isDef, isDefAndNotNull } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { EParserType, IRule } from "@lib/idl/parser/IParser";

import { State } from "./State";
import { END_POSITION, T_EMPTY } from "./symbols";

export class Item {
    rule: IRule;
    /**
     * Position in item. 
     * left: right0,   right1, ...., rightN;
     *               ^
     *               position
     */
    pos: number;
    /**
     * Index in parser.
     * (Uniq ID)
     */
    index: number;
    /**
     * Parent state.
     */
    state: State | null;

    expectedSymbols: IMap<boolean>;

    getExpectedSymbolsCount(): number {
        return Object.keys(this.expectedSymbols).length;
    }

    constructor(rule: IRule, pos: number, expectedSymbols?: IMap<boolean>) {
        this.rule = rule;
        this.pos = pos;
        this.index = 0;
        this.state = null;
        this.expectedSymbols = {};

        if (expectedSymbols) {
            Object
                .getOwnPropertyNames(<IMap<boolean>>expectedSymbols)
                .forEach(name => this.addExpected(name));
        }
    }

    isEqual(item: Item, type: EParserType = EParserType.k_LR0): boolean {
        if (type === EParserType.k_LR0) {
            return (this.rule === item.rule && this.pos === item.pos);
        } 
        
        if (type === EParserType.k_LR1) {
            if (!(this.rule === item.rule && this.pos === item.pos && this.getExpectedSymbolsCount() === item.getExpectedSymbolsCount())) {
                return false;
            }

            for (let i in this.expectedSymbols) {
                if (!item.isExpected(i)) {
                    return false;
                }
            }
            return true;
        } 

        //We never must be here, for LALR(1) we work with LR0 items. This 'else'-stmt only for closure-compliler.
        return false;
    }

    isParentItem(item: Item): boolean {
        return (this.rule === item.rule && this.pos === item.pos + 1);
    }

    isChildItem(item: Item): boolean {
        return (this.rule === item.rule && this.pos === item.pos - 1);
    }

    mark(): string {
        const right = this.rule.right;
        if (this.pos === right.length) {
            return END_POSITION;
        }
        return right[this.pos];
    }

    end(): string {
        return this.rule.right[this.rule.right.length - 1] || T_EMPTY;
    }

    // get next symbol name
    nextMarked(): string {
        return this.rule.right[this.pos + 1] || END_POSITION;
    }

    isExpected(symbol: string): boolean {
        return !!(this.expectedSymbols[symbol]);
    }

    addExpected(symbol: string): boolean {
        if (this.expectedSymbols[symbol]) {
            return false;
        }
        this.expectedSymbols[symbol] = true;
        return true;
    }

    toString(grammarSymbols: Map<string, string> = null): string {
        const { left, right } = this.rule;

        let msg = `${left} -> `;

        msg += right
            .map(s => Item.decodeSymbol(s, grammarSymbols))
            .map((s, k) => (k === this.pos ? `. ${s}` : `${s}`))
            .join(' ');

        if (this.pos === right.length) {
            msg += " . ";
        }

        if (isDef(this.expectedSymbols)) {
            const expectedTokens = Object
                .getOwnPropertyNames(this.expectedSymbols)
                .map(k => Item.decodeSymbol(k, grammarSymbols));

            if (expectedTokens.length) {
                msg += ", " + expectedTokens.join(' ');
            }
        }

        return msg;
    }


    static decodeSymbol(s: string, grammarSymbols: Map<string, string>) {
        return (grammarSymbols ? ((grammarSymbols.get(s) && s !== grammarSymbols.get(s)) ? `'${grammarSymbols.get(s)}'` : s) : s);
    }
}
