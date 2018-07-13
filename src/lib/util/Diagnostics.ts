import { IPosition, IRange } from "../idl/parser/IParser";
import { IMap } from "../idl/IMap";


enum EDiagnosticCategory {
    WARNING,
    ERROR
}


interface IDiagnosticEntry<DESC_T> {
    category: EDiagnosticCategory;
    code: number;
    desc: DESC_T;
}


type IDiagnosticDescription = string;

export interface DiagnosticMessage {
    code: number;
    category: EDiagnosticCategory;
    content: string;
}

export interface IDiagnosticReport {
    name: string;

    errors: number;
    warnings: number;

    messages: DiagnosticMessage[];
}

export interface IFileLine {
    file: string;
    line: number;
}


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
    return pattern.replace(/{([a-z.]+)}/, (match, key) => {
        return readKey(desc, key);
    });
}

export class Diagnostics <DESC_T>{
    protected _name: string;
    protected _entries: IDiagnosticEntry<DESC_T>[] = [];

    constructor(diagName: string) {
        this._name = diagName;
    }

    protected emitException(mesg: string = "critical occured"): void {
        throw new Error(mesg);
    }

    resolve(): IDiagnosticReport {
        let report = { name: this._name, errors: 0, warnings: 0, messages: [] };

        for (let entry of this._entries) {
            let message = this.resolveEntry(entry);

            switch(message.category) {
                case EDiagnosticCategory.WARNING:
                    report.warnings ++;
                    break;
                case EDiagnosticCategory.ERROR:
                    report.errors ++;
                    break;
            }
            report.messages.push(message);
        }

        return report;
    }

    private resolveEntry(entry: IDiagnosticEntry<DESC_T>): DiagnosticMessage {
        let { code, category, desc } = entry;

        let categoryName = (EDiagnosticCategory[category]).toLowerCase();
        let range = this.resolveRange(desc);
        let loc: string = null;

        if (range) {
            loc = rangeToString(range);
        } 
        else {
            loc = locToString(this.resolvePosition(desc));
        }

        let content = `${this.resolveFilename(desc)}(${loc}): ${categoryName} ${code}: ${this.resolveDescription(code, desc)}.`;

        return { code, category, content };
    }

    protected resolveFilename(desc: DESC_T): string {
        return '[unknown]';
    }

    protected resolvePosition(desc: DESC_T): IPosition {
        return { line: 0, column: 0 };
    }

    protected resolveRange(desc: DESC_T): IRange {
        return null;
    }

    protected resolveDescription(code:number, desc: DESC_T): string {
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
        this._entries.push({ category: EDiagnosticCategory.ERROR, code, desc });
    }

    warning(code: number, desc: DESC_T) { 
        this._entries.push({ category: EDiagnosticCategory.WARNING, code, desc });
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
        return this._entries.filter(entry => entry.category === EDiagnosticCategory.ERROR).length > 0;
    }
}