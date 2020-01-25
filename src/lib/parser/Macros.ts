import { IMap } from "@lib/idl/IMap";
import { IMacro } from "@lib/idl/parser/IMacro";

export class Macros {
    stack: IMap<IMacro>[] = [{}];

    push() {
        this.stack.push({});
    }

    pop() {
        this.stack.pop();
    }

    set(macro: IMacro): void {
        this.stack[this.stack.length - 1][macro.name] = macro;
    }

    get(name: string): IMacro {
        for (let i = this.stack.length - 1; i >= 0; --i) {
            const macros = this.stack[i];
            const macro = macros[name];
            if (macro) {
                return macro;
            }
        }
        return null;
    }

    has(name: string): boolean {
        return this.get(name) !== null;
    }

    forEach(cb: (value: IMacro) => void): void {
        let overrides = new Set;
        for (let i = this.stack.length - 1; i >= 0; --i) {
            const macros = this.stack[i];
            for (const macro of Object.values(macros)) {
                if (!overrides.has(macro.name)) {
                    overrides.add(macro.name);
                    cb(macro);
                }
            }
        }
    }

    *[Symbol.iterator]() {
        let overrides = new Set;
        for (let i = this.stack.length - 1; i >= 0; --i) {
            const macros = this.stack[i];
            for (const macro of Object.values(macros)) {
                if (!overrides.has(macro.name)) {
                    overrides.add(macro.name);
                    yield macro;
                }
            }
        }
    }
}
