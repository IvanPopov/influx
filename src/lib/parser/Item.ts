import { EParserType, ExpectedSymbols, IRule } from "@lib/idl/parser/IParser";
import { END_POSITION } from "@lib/parser/symbols";


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

    expectedSymbols: ExpectedSymbols;

    constructor(rule: IRule, pos: number, expectedSymbols?: string[]) {
        this.rule = rule;
        this.pos = pos;
        this.index = 0;
        this.expectedSymbols = new Set<string>();

        if (expectedSymbols) {
            expectedSymbols.forEach(symbol => this.addExpected(symbol));
        }
    }

    isEqual(item: Item, type: EParserType = EParserType.k_LR0): boolean {
        if (type === EParserType.k_LR0) {
            return (this.rule === item.rule && this.pos === item.pos);
        } 
        
        if (type === EParserType.k_LR1) {
            if (!(this.rule === item.rule && this.pos === item.pos && this.expectedSymbols.size === item.expectedSymbols.size)) {
                return false;
            }

            for (const symbol of this.expectedSymbols) {
                if (!item.isExpected(symbol)) {
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

    symbolName(): string {
        const right = this.rule.right;
        if (this.pos === right.length) {
            return END_POSITION;
        }
        return right[this.pos];
    }

    // lastSymbolName(): string {
    //     return this.rule.right[this.rule.right.length - 1] || T_EMPTY;
    // }

    // // get next symbol name
    // nextSymbolName(): string {
    //     return this.rule.right[this.pos + 1] || END_POSITION;
    // }

    isExpected(symbol: string): boolean {
        return this.expectedSymbols.has(symbol);
    }

    addExpected(symbol: string): boolean {
        if (this.isExpected(symbol)) {
            return false;
        }
        this.expectedSymbols.add(symbol);
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

        if (this.expectedSymbols) {
            const expectedTokens = Array.from(this.expectedSymbols).map(k => Item.decodeSymbol(k, grammarSymbols));

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
