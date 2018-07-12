export interface ISourceLocation {
    file: string;
    line: number;
}


enum EDiagnosticCategory {
    WARNING,
    ERROR
}


interface IDiagnosticEntry<DESC_T> {
    categoty: EDiagnosticCategory;
    loc?: ISourceLocation;
    code: number;
    desc: DESC_T;
}


type IDiagnosticDescription = string;

export class DiagnosticReport <DESC_T>{
    protected _entries: IDiagnosticEntry<DESC_T>[] = [];

    // protected _diagDesc: { [ code: number ]: IDiagnosticDescription } = {};

    protected emitException(mesg: string = "critical occured"): void {
        throw new Error(mesg);
    }

    // fillDiagnosticDescription (desc: { [ code: number ]: IDiagnosticDescription }) {
    //     for (let code in desc) {
    //         if (this._diagDesc[code]) {
    //             this.emitException(`Diagnostic code '${code}' already used.`);
    //         }

    //         this._diagDesc[code] = desc[code];
    //     }
    // }

    error(code: number, desc: DESC_T) { 
        this._entries.push({ categoty: EDiagnosticCategory.ERROR, code, desc });
    }

    warning(code: number, desc: DESC_T) { 
        this._entries.push({ categoty: EDiagnosticCategory.WARNING, code, desc });
    }

    // add error and emit an exception in order to interrupt processing
    critical(code, desc) {
        this.error(code, desc);
        this.emitException();
    }

    prettyPrint(): string {
        return null;//JSON.stringify(this._errors, null, '\t');
    }

    hasErrors(): boolean {
        return this._entries.filter(entry => entry.categoty === EDiagnosticCategory.ERROR).length > 0;
    }
}