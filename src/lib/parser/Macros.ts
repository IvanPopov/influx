import { IMap } from "@lib/idl/IMap";
import { IMacro } from "@lib/idl/parser/IMacro";

export class Macros {
    stack: { root: IMacro, macros: IMap<IMacro>; }[] = [{ root: null, macros: {} }];

    get depth() {
        return this.stack.length;
    }

    get root(): IMacro{
        return this.stack[this.depth - 1].root;
    }

    push(source: IMacro) {
        this.stack.push({ root: source, macros: {} });
    }

    pop() {
        this.stack.pop();
    }

    set(macro: IMacro): void {
        this.stack[this.depth - 1].macros[macro.name] = macro;
    }

    unset(name: string): void {
        delete this.stack[this.depth - 1].macros[name];
    }

    get(name: string): IMacro {
        let i = this.depth - 1;
        while (true) {
            const { macros, root } = this.stack[i];
            
            // avoidance of recursive substitution
            if (root?.name === name && !root.bFunction) {
                return null;
            }

            const macro = macros[name];
            if (macro) {
                return macro;
            }

            if (i == 0) break;
            i = 0;
        };
        return null;
    }

    has(name: string): boolean {
        return this.get(name) !== null;
    }

    forEach(cb: (value: IMacro) => void): void {
        let overrides = new Set;
        for (let i = this.depth - 1; i >= 0; --i) {
            const macros = this.stack[i].macros;
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
        for (let i = this.depth - 1; i >= 0; --i) {
            const macros = this.stack[i].macros;
            for (const macro of Object.values(macros)) {
                if (!overrides.has(macro.name)) {
                    overrides.add(macro.name);
                    yield macro;
                }
            }
        }
    }
}
