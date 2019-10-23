
import { isDef } from "@lib/common";
import { IFunctionDeclInstruction, IInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { isNull } from "util";
import assert = require("assert");
import DistinctColor from "@lib/util/DistinctColor";

enum EDebugLineFlags {
    k_NewStatement = 0x01
};

export class DebugLineRecord {
    pc: number;      // instruction addr;
    file?: number;
    line?: number;
    column?: number; 
    flags: number;  // bitflags like: NS PE etc.
    color?: number; // debug color, for easier code <=> asm matching
}

// process counter;
type PC = () => number;

function debugLine(pc: PC) {
    const files: string[] = [];
    const layout: DebugLineRecord[] = [];

    const lastRecord = () => layout[layout.length -1];

    // mark last record as 'new statement';
    function ns() {
        let rec = lastRecord();
        rec.flags |= EDebugLineFlags.k_NewStatement;
    }

    // add last instruction to record table;
    function step() {
        layout.push({ pc: pc(), flags: 0 })
    }

    // add filename to source files table and return index;
    function fileToIndex(file: string) {
        let idx = files.indexOf(file);
        if (idx == -1) {
            idx = files.length;
            files.push(file);
        }
        return idx;
    }

    function map(inst: IInstruction) {
        const loc = (inst && inst.sourceNode && inst.sourceNode.loc) || null;
        if (isNull(loc)) {
            return;
        }
        
        const pos = loc.start;
        const rec = lastRecord();
        rec.line = pos.line || 0;
        rec.column = pos.column || 0;
        rec.file = fileToIndex(`${pos.file}`);
    }


    function dump() {
        let line = undefined;
        let color = new DistinctColor;
        let cache = {};
        for (let i = layout.length - 1; i >= 0; i--) {
            let entry = layout[i];

            if (line != entry.line) color.pickNext();
            line = isDef(entry.line) ? entry.line : line;
            entry.line = line;
            cache[line] = isDef(cache[line])? cache[line] : color.value();
            entry.color = cache[line];
        }
        return { files, layout };
    }

    return {
        ns,         // mark last record as 'new statement';
        step,       // add last instruction(pc) to record table;
        map,        // specify last record source location

        dump
    }
}

enum ETagType {
    k_CompilationUnit,
    k_SubProgram
}

interface ITag {
    tagType: ETagType;
    children?: ITag[];
}

interface ICompilationUnit extends ITag {
    name: string; // path to file originally compiled;
    lowPc: number;
    highPc: number;
}

interface ISubProgram extends ITag {
    name: string;       // function name;
    type: number;       // tag addr;
    lowPc: number;
    highPc: number;
    declFile: string;   // file
    declLine: number;
}

function debugInfo(pc: PC) {

    function locate(decl: IVariableDeclInstruction, reg: number) {

    }

    function beginCompilationUnit(name: string = null): void {}
    function endCompilationUnit(): void {};

    function beginSubProgram(func: IFunctionDeclInstruction): void {}
    function endSubProgram(): void {}

    function dump() {

    }

    return {
        beginCompilationUnit,
        endCompilationUnit,
        beginSubProgram,
        endSubProgram,

        locate,

        dump
    }
}



export interface CdlRaw {
    line: ReturnType<ReturnType<typeof debugLine>['dump']>;
    info: ReturnType<ReturnType<typeof debugInfo>['dump']>;
}

export function debug (pc: PC) {
    const line = debugLine(pc);
    const info = debugInfo(pc);
   
    function dump(): CdlRaw {
        return {
            line: line.dump(),
            info: info.dump()
        }
    }

    // const { ns } = line;
    // const { beginCompilationUnit, endCompilationUnit, beginSubProgram, endSubProgram } = info;
    return { ...line, ...info, dump }; // todo: export only required;
}

type Color = number;

/**
 * Code Debug Layout View.
 */
export function cdlview(cdlRaw: CdlRaw) {
    if (isNull(cdlRaw)) {
        return null;
    }

    const { line, info } = cdlRaw;

    /**
     * @param pc Number of instruction.
     */
    function resolveFileLocation(pc: number) {
        let rec = line.layout[pc];
        assert(rec.pc == pc);
        return {
            file: isDef(rec.file) ? line.files[rec.file]: null,
            line: rec.line,
            column: rec.column
        };
    }

    /** 
     * @returns Valid breakpoint position from arbitrary line.
     */
    function resolveBreakpointLocation(ln: number): number {
        // todo: optimize it;
        let rec = line.layout.find(r => r.line >= ln && (r.flags & EDebugLineFlags.k_NewStatement) != 0);
        return (rec && rec.line) || -1;
    }


    function resolvePcColor(pc: number): Color {
        return line.layout[pc] ? line.layout[pc].color : 0xffffff;
    }

    function resolveLineColor(ln: number) {
        let rec = line.layout.find(r => r.line === ln);
        return rec ? rec.color : -1;
    }
    

    return {
        resolveFileLocation,
        resolveBreakpointLocation,
        resolvePcColor,
        resolveLineColor
    }
}

export default debug;

