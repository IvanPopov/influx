import { IOutput, Output } from "./Output";

export function createBaseEmitter() {

    let blocks: IOutput[] = [];
    let stack: IOutput[] = [];

    const depth = () => stack.length;
    const top = () => stack[stack.length - 1];
    const begin = () => stack.push(Output());
    const end = () => blocks.push(stack.pop());
    const push = () => top().push();
    const pop = () => top().pop();
    const kw = (kw: string) => top().keyword(kw);
    const nl = () => top().newline();
    const add = (val: string) => top().add(val);

    const toString = (): string => blocks
        .map(block => block.toString())
        .filter(code => !!code)
        .join('\n\n');

    return {
        begin,
        end,
        depth,

        push,
        pop,
        kw,
        nl,
        add,

        toString,

        resolveTypeName: null,
        resolveType: null,

        emitComplexType: null,
        emitVariableDecl: null,
        emitPrologue: null,
        emitFunction: null,
        emitExpression: null,
        emitFloat: null,
        emitBool: null,
        emitInteger: null,
        emitArithmetic: null,
        emitAssigment: null,
        emitIdentifier: null,
        emitCCall: null,
        emitFCall: null,
        emitStmt: null,
        emitBlock: null,
    };
}


