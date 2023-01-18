import * as SystemScope from '@lib/fx/analisys/SystemScope';
import { CodeContext, CodeEmitter } from '@lib/fx/translators/CodeEmitter';
import { IFunctionDefInstruction } from '@lib/idl/IInstruction';

function alignL(content: string, len: number) {
    let diff = Math.max(0, len - content.length);
    return `${Array(diff).fill(' ').join('')}${content}`;
}


function alignR(content: string, len: number) {
    let diff = Math.max(0, len - content.length);
    return `${content}${Array(diff).fill(' ').join('')}`;
}

class Emitter<ContextT extends CodeContext> extends CodeEmitter<ContextT> {
    emitFunctionDefinition(ctx: ContextT, def: IFunctionDefInstruction): void {
        const { typeName } = this.resolveType(ctx, def.returnType);
        // this.emitKeyword(alignL(typeName, 10));
        // this.emitKeyword(alignR(def.name, 16));
        this.emitKeyword(typeName);
        this.emitKeyword(def.name);
        this.emitChar('(');
        this.emitNoSpace();
        this.emitParams(ctx, def.params);
        this.emitChar(')');
    }
}

export function debugPrint() {

    const ctx = new CodeContext;
    const emitter = new Emitter({ omitEmptyParams: true });

    const { functions, types, typeTemplates } = SystemScope.SCOPE;

    emitter.begin();
    for (let name in types) {
        const type = types[name];
        emitter.emitLine(`// ${type.name};`);
    }
    emitter.end();

    emitter.begin();
    for (let name in typeTemplates) {
        const tpl = typeTemplates[name];
        emitter.emitLine(`// ${tpl.name};`);
    }
    emitter.end();

    emitter.begin();
    for (let name in functions) {
        const overloads = functions[name];

        for (const fn of overloads) {
            emitter.emitFunctionDefinition(ctx, fn.def);
            emitter.emitChar(';');
            emitter.emitNewline();
        }

        emitter.emitNewline();
    }
    emitter.end();
    return emitter.toString();
}
