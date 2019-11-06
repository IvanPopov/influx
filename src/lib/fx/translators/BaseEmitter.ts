import { IOutput, createOutput } from "./Output";

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

    protected end() {
        this.blocks.push(this.stack.pop());
    }

    protected push() {
        this.top().push();
    }

    protected pop() {
        this.top().pop();
    }

    emitNewline() { this.top().newline(); }
    emitKeyword(kw: string) { this.top().keyword(kw); }
    emitChar(char: string) { this.top().add(char); }

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