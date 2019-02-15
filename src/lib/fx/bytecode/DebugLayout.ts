
import { IPosition } from "./../../idl/parser/IParser";
import { flag } from "./../../bf/bf";
import { IFunctionDeclInstruction, IVariableDeclInstruction, IInstruction } from "./../../idl/IInstruction";
import { isNull } from "util";
import assert = require("assert");
import { isDef } from "../../../lib/common";
enum EDebugLineFlags {
    k_NewStatement = 0x01
};

export class DebugLineRecord {
    pc: number;      // instruction addr;
    file?: number;
    line?: number;
    column?: number; 
    flags: number;  // bitflags like: NS PE etc.
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
        let loc = (inst && inst.sourceNode && inst.sourceNode.loc) || null;
        if (isNull(loc)) {
            return;
        }
        let pos = loc.start;
        let rec = lastRecord();
        rec.line = pos.line || 0;
        rec.column = pos.column || 0;
        rec.file = fileToIndex(`${pos.file}`);
    }

    function dump() {
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


export function cdlview(cdlRaw: CdlRaw) {
    
    const { line, info } = cdlRaw;

    function sourceFileFromPc(pc: number) {
        let rec = line.layout[pc];
        assert(rec.pc == pc);
        return {
            file: isDef(rec.file) ? line.files[rec.file]: null,
            line: rec.line,
            column: rec.column
        };
    }
    
    return {
        sourceFileFromPc
    }
}

export default debug;

