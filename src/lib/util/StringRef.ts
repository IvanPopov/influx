import { isString } from "@lib/common";

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

    static make(val: string | StringRef): StringRef {
        if (!isString(val)) {
            return <StringRef>val;
        }

        const sval = val as string;
        
        let ref = StringRef.storage[sval];
        if (ref) {
            return ref;
        }

        ref = new StringRef(sval);
        StringRef.storage[sval] = ref;
        return ref;
    }

    static storage: { [val: string]: StringRef; } = {};
}

