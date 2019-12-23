import { assert } from "@lib/common";
import { IPosition, IRange } from "@lib/idl/parser/IParser";

export function positionMin(a: IPosition, b: IPosition): IPosition {
    assert(String(a.file) === String(b.file));
    return {
        offset: Math.min(a.offset, b.offset),
        line: Math.min(a.line, b.line),
        column: Math.min(a.column, b.column),
        file: a.file
    };
}

export function positionMax(a: IPosition, b: IPosition): IPosition {
    assert(String(a.file) === String(b.file));
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

export const checkRange = (range: IRange, offset: number) => range.start.offset <= offset && range.end.offset > offset;