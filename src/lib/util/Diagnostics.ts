import { EDiagnosticCategory, IDiagnosticEntry, IDiagnosticMessage, IDiagnosticReport } from "@lib/idl/IDiagnostics";

import { IMap } from "../idl/IMap";
import { IPosition, IRange } from "../idl/parser/IParser";

function locToString(loc: IPosition) {
    return `${loc.line},${loc.column}`;
}


function rangeToString(range: IRange) {
    return `${locToString(range.start)}:${locToString(range.end)}`;
}


function readKey(desc: Object, key: string) {
    let keyParts: string[] = key.split('.');
    if (keyParts.length > 1) {
        return readKey(desc[keyParts[0]], keyParts.splice(1).join('.'));
    }
    return desc[keyParts[0]];
}


function fillPattern(pattern: string, desc: Object): string {
    return pattern.replace(/{([a-zA-Z.]+)}/g, (match, key) => {
        return readKey(desc, key);
    });
}

export class DiagnosticException<DESC_T> extends Error {
    host: Diagnostics<DESC_T>;

    constructor(host: Diagnostics<DESC_T>, mesg: IDiagnosticMessage) {
        super(mesg.content);
        Error.captureStackTrace(this, DiagnosticException);
    }
}



export class Diagnostics <DESC_T>{
    protected _name: string;
    protected _codePrefix: string;
    protected _entries: IDiagnosticEntry<DESC_T>[];

    constructor(name: string, codePrefix: string) {
        this._name = name;
        this._codePrefix = (codePrefix || '').toUpperCase();
        this.reset();
    }

    protected emitException(): void {
        throw new DiagnosticException<DESC_T>(this, this.getLastError());
    }

    reset() {
        this._entries = [];
    }

    resolve(): IDiagnosticReport {
        let report: IDiagnosticReport = { errors: 0, warnings: 0, messages: [] };

        for (let entry of this._entries) {
            let message = this.resolveEntry(entry);

            switch(message.category) {
                case EDiagnosticCategory.k_Warning:
                    report.warnings ++;
                    break;
                case EDiagnosticCategory.k_Error:
                    report.errors ++;
                    break;
            }
            report.messages.push(message);
        }

        return report;
    }

    private resolveEntry(entry: IDiagnosticEntry<DESC_T>): IDiagnosticMessage {
        // let { category, desc } = entry;

        // let categoryName = (EDiagnosticCategory[category]).toLowerCase();
        let loc: string = null;
        let range: IRange;
        let start: IPosition;
        let end: IPosition;
        let file = this.resolveFilename(entry.category, entry.code, entry.desc);

        if (range = this.resolveRange(entry.category, entry.code, entry.desc)) {
            ({ start, end } = range);
            loc = rangeToString(range);
        } 
        else {
            start = this.resolvePosition(entry.category, entry.code, entry.desc);
            loc = locToString(start);
        }

        let content = `${this.resolveDescription(entry.code, entry.category, entry.desc)}`;
        let code = `${this._codePrefix}${entry.code}`;
        let category = entry.category;
        return { code, category, content, file, start, end };
    }

    protected resolveFilename(category: EDiagnosticCategory, code: number, desc: DESC_T): string {
        return '[unknown]';
    }

    protected resolvePosition(category: EDiagnosticCategory, code: number, desc: DESC_T): IPosition {
        return { file: null, line: 0, column: 0 };
    }

    protected resolveRange(category: EDiagnosticCategory, code: number, desc: DESC_T): IRange {
        return null;
    }

    protected resolveDescription(code:number, category: EDiagnosticCategory, desc: DESC_T): string {
        let diagMesgs = this.diagnosticMessages();
        if (!diagMesgs) {
            console.error(`Diagnostic messages of '${this._name}' not found.`);
            return '[no description found]';
        }

        if (!diagMesgs[code]) {
            return `[no description found for code '${code}']`;
        }

        return fillPattern(diagMesgs[code], desc);
    }

    protected diagnosticMessages(): IMap<string> {
        return null;
    }

    error(code: number, desc: DESC_T) { 
        this._entries.push({ category: EDiagnosticCategory.k_Error, code, desc });
    }

    warning(code: number, desc: DESC_T) { 
        this._entries.push({ category: EDiagnosticCategory.k_Warning, code, desc });
    }

    // add error and emit an exception in order to interrupt processing
    critical(code: number, desc: DESC_T) {
        this.error(code, desc);
        this.emitException();
    }

    prettyPrint(): string {
        return null;//JSON.stringify(this._errors, null, '\t');
    }

    hasErrors(): boolean {
        return this._entries.filter(entry => entry.category === EDiagnosticCategory.k_Error).length > 0;
    }

    getLastError(): IDiagnosticMessage {
        for (let i = this._entries.length - 1; i >= 0; --i) {
            if (this._entries[i].category === EDiagnosticCategory.k_Error) {
                return this.resolveEntry(this._entries[i]);
            }
        }
        return null;
    }

    static mergeReports(reportList: IDiagnosticReport[]): IDiagnosticReport {
        let result: IDiagnosticReport = { errors: 0, warnings: 0, messages: [] };

        reportList.forEach((report) => {
            result.errors += report.errors;
            result.warnings += report.warnings;
            result.messages = result.messages.concat(report.messages);
        });

        return result;
    }

    static stringify(report: IDiagnosticReport): string {
        return report.messages.map(mesg => mesg.content).join('\n');
    }

    static asRange(mesg: IDiagnosticMessage): IRange {
        let range: IRange = { start: mesg.start, end: mesg.end };

        if (!range.end) {
            range.end = { ...range.start };
        }

        const { start, end } = range;

        if (end.line == start.line && end.column == start.column) {
            end.column +=1;
        }

        return range;
    }
}