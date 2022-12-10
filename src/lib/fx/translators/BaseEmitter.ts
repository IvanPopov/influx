import { assert } from "@lib/common";
import { createOutput, IOutput } from "./Output";

export class BaseEmitter {
    private blocks: IOutput[] = [];
    private stack: IOutput[] = [];

    private top() { return this.stack[this.depth() - 1]; }
    
    private findOrCreateOutput(name?: string) {
        const i = this.blocks.findIndex(block => name && block.name === name);
        const block = i !== -1
            ? this.blocks.splice(i, 1)[0]
            : createOutput({ name });
        return block;
    }

    protected depth() { 
        return this.stack.length;
    }

    begin(block?: string) {
        this.stack.push(this.findOrCreateOutput(block));
    }

    /**
     * @param prologue Move block to the beginning.
     */
    end(prologue = false) {
        const block = this.stack.pop();
        
        if (block.isEmpty()) {
            return;
        }

        if (!prologue) {
            this.blocks.push(block);
        } else {
            this.blocks = [ block, ...this.blocks ];
        }
    }

    push(pad?) {
        this.top().push(pad);
    }

    pop() {
        this.top().pop();
    }

    emitNewline(n = 1) { Array(n).fill(0).forEach(i => this.top()?.newline()); }
    emitKeyword(kw: string) { this.top()?.keyword(kw); }
    emitNoSpace() { this.top()?.ignoreNextSpace(); }
    emitSpace() { this.emitChar(' '); this.emitNoSpace(); }
    emitChar(char: string) { this.top()?.add(char); }
    emitLine(line: string) { 
        this.emitChar(line);
        this.emitNewline(); 
    }

    clear(): void {
        assert(this.stack.length == 0);
        this.blocks = [];
    }

    toString(): string {
        const res = this.blocks
            .map(block => block.toString())
            .filter(code => !!code)
            .join('\n\n');
        this.clear();
        return res;
    }

    valueOf(): string {
        return this.toString();
    }
}