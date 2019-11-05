export function Output({ tab = '\t', nl = '\n' } = {}) {
    let data: string[] = [''];
    let nesting = 0;

    const push = () => ++nesting;
    const pop = () => --nesting;
    const toString = () => data.join(nl);
    const cl = () => data[data.length - 1];

    function add(val: string) {
        data[data.length - 1] += val;
    }

    function keyword(token: string) {
        cl() && add(' ');
        add(token);
    }

    function newline(count = 1) {
        for (let i = 0; i < count; ++i) data.push('');
        for (let i = 0; i < nesting; ++i) add(tab);
    }

    return {
        keyword,
        push,
        pop,
        newline,
        add,
        toString
    };
}


export type IOutput = ReturnType<typeof Output>;