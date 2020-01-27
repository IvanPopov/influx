import { assert } from "@lib/common";
import { IPosition, IRange } from "@lib/idl/parser/IParser";

export function positionMin(a: IPosition, b: IPosition): IPosition {
    assert(a.file === b.file);
    return {
        offset: Math.min(a.offset, b.offset),
        line: Math.min(a.line, b.line),
        column: Math.min(a.column, b.column),
        file: a.file
    };
}

export function positionMax(a: IPosition, b: IPosition): IPosition {
    assert(a.file === b.file);
    return {
        offset: Math.max(a.offset, b.offset),
        line: Math.max(a.line, b.line),
        column: Math.max(a.column, b.column),
        file: a.file
    };
}


export function cloneRange(range: IRange): IRange {
    return { start: { ...range.start }, end: { ...range.end } };
}

// export function extendRange(parent: IRange, child: IRange): IRange {
//     if (child.start.file !== parent.start.file) {
//         return parent;
//     }

//     assert(parent.end.file === child.end.file);

//     if (child.start.line < parent.start.line) {
        
//         parent.start.column = child.start.column;
//         parent.start.line = child.start.line;
//         parent.start.file = child.start.file;
//         parent.start.offset = child.start.offset;

//     } else if (child.start.line === parent.start.line) {
//         // parent.start = positionMin(child.start, parent.start);

//         parent.start.column = Math.min(child.start.column, parent.start.column);
//         parent.start.line = Math.min(child.start.line, parent.start.line);
//         parent.start.offset = Math.min(child.start.offset, parent.start.offset);
//     }

//     if (child.end.line > parent.end.line) {

//         parent.end.column = child.end.column;
//         parent.end.line = child.end.line;
//         parent.end.file = child.end.file;
//         parent.end.offset = child.end.offset;

//     } else if (child.end.line === parent.end.line) {
//         // parent.end = positionMax(child.end, parent.end);

//         parent.end.column = Math.max(child.end.column, parent.end.column);
//         parent.end.line = Math.max(child.end.line, parent.end.line);
//         parent.end.offset = Math.max(child.end.offset, parent.end.offset);
//     }

//     return parent;
// }

export function extendRange(parent: IRange, child: IRange): IRange {
    if (child.start.file !== parent.start.file) {
        return parent;
    }

    if (child.start.line < parent.start.line) {
        parent.start = { ...child.start };
    } else if (child.start.line === parent.start.line) {
        parent.start = positionMin(child.start, parent.start);
    }

    if (child.end.line > parent.end.line) {
        parent.end = { ...child.end };
    } else if (child.end.line === parent.end.line) {
        parent.end = positionMax(child.end, parent.end);
    }

    return parent;
}

export function commonRange(...rangeList: IRange[]): IRange {
    const MAX_I32 = Number.MAX_SAFE_INTEGER;
    const MIN_I32 = Number.MIN_SAFE_INTEGER;

    const file = rangeList[0].start.file;

    let start: IPosition = { offset: MAX_I32, column: MAX_I32, line: MAX_I32, file };
    let end: IPosition = { offset: MIN_I32, column: MIN_I32, line: MIN_I32, file };

    rangeList.forEach(range => start = positionMin(start, range.start));
    rangeList.forEach(range => end = positionMax(end, range.end));

    return { start, end };
}

export function offset(source: IRange, offset: IPosition): IRange {
    if (offset) {
        // TODO: check that URIs the same
        const { start, end } = source;

        if (start.line === 0) {
            start.column += offset.column;
        }

        if (end.line === 0) {
            end.column += offset.column;
        }

        start.line += offset.line;
        end.line += offset.line;
    }

    return source;
}

export const checkRange = (range: IRange, offset: number) => range.start.offset <= offset && range.end.offset > offset;

// export function stringifyRange(range: IRange, depth = 0) {
//     if (!range) {
//         return '';
//     }

//     const offset = Array(depth).fill('---').join('') + (depth? ' ' : '');
//     const { start, end, source } = range;
//     const filename = String(start.file).split('/').reverse()[0];
//     return `${offset}${filename}:${start.line}:${start.column}-${end.line}:${end.column}\n${stringifyRange(source, depth + 1)}`;
// } 
