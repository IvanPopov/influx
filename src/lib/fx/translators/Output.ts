export function createOutput({ tab = '\t', nl = '\n' } = {}) {
    let data: string[] = [''];
    let nesting = 0;
    let count = 0;

    const push = () => (++nesting, count && newline());
    const pop = () => (--nesting, count && newline());
    const toString = () => data.join(nl);

    function add(val: string) {
        if (!count) {
            for (let i = 0; i < nesting; ++i) val = tab + val;
        }
        
        data[data.length - 1] += val;
        count++;
    }

    function keyword(token: string) {
        count && add(' ');
        add(token);
    }

    function newline() {
        data.push('');
        count = 0;
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


export type IOutput = ReturnType<typeof createOutput>;