// helper class to always pass strings by pointer and not by value;
export class StringRef {
    constructor(readonly content: string) {

    }

    valueOf(): string {
        return this.content;
    }

    toString(): string {
        return this.content;
    }

    toSource(): string {
        return this.content;
    }

    static make(val: any): StringRef {
        return new StringRef(`${val}`);
    }
}

