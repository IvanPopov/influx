export function createOutput({ tab = '\t', nl = '\n', name = null } = {}) {
    let data: string[] = [''];
    let nesting = [];
    let count = 0;
    let noNextSpace = false;

    const push = (pad = tab) => (nesting.push(pad), count && newline());
    const pop = () => (nesting.pop(), count && newline());
    const toString = () => data.join(nl);
    const ignoreNextSpace = () => noNextSpace = true;

    function add(val: string) {
        if (!count) {
            for (let i = 0; i < nesting.length; ++i) val = nesting[i] + val;
        }
        
        data[data.length - 1] += val;
        count++;
        noNextSpace = false;
    }

    function keyword(token: string) {
        !noNextSpace && count && add(' ');
        add(token);
    }

    function newline() {
        data.push('');
        count = 0;
    }

    return {
        keyword,
        ignoreNextSpace,
        push,
        pop,
        newline,
        add,
        toString,
        name
    };
}


export type IOutput = ReturnType<typeof createOutput>;