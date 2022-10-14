import { createOutput, IOutput } from "./Output";

export class BaseEmitter {
    private blocks: IOutput[] = [];
    private stack: IOutput[] = [];

    private top() { return this.stack[this.depth() - 1]; }
    
    protected depth() { 
        return this.stack.length;
    }

    protected begin() {
        this.stack.push(createOutput());
    }

    /**
     * @param prologue Move block to the beginning.
     */
    protected end(prologue = false) {
        if (!prologue) {
            this.blocks.push(this.stack.pop());
        } else {
            this.blocks = [ this.stack.pop(), ...this.blocks ];
        }
    }

    protected push(pad?) {
        this.top().push(pad);
    }

    protected pop() {
        this.top().pop();
    }

    emitNewline() { this.top()?.newline(); }
    emitKeyword(kw: string) { this.top()?.keyword(kw); }
    emitNoSpace() { this.top()?.ignoreNextSpace(); }
    emitSpace() { this.emitChar(' '); this.emitNoSpace(); }
    emitChar(char: string) { this.top()?.add(char); }
    emitLine(line: string) { 
        this.emitChar(line);
        this.emitNewline(); 
    }

    toString(): string {
        return this.blocks
            .map(block => block.toString())
            .filter(code => !!code)
            .join('\n\n');
    }

    valueOf(): string {
        return this.toString();
    }
}