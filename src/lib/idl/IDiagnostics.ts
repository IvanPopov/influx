import { IPosition } from "./parser/IParser";

export enum EDiagnosticCategory {
    k_Warning,
    k_Error
}


export interface IDiagnosticEntry<DESC_T> {
    category: EDiagnosticCategory;
    code: number;
    desc: DESC_T;
}


type IDiagnosticDescription = string;

export interface IDiagnosticMessage {
    code: string;
    category: EDiagnosticCategory;
    start?: IPosition;
    end?: IPosition;
    file?: string;
    content: string;
}

export interface IDiagnosticReport {
    errors: number;
    warnings: number;

    messages: IDiagnosticMessage[];
}



export interface IDiagnostics<DESC_T> {
    reset(): void;
    resolve(): IDiagnosticReport;
    error(code: number, desc: DESC_T);
    warning(code: number, desc: DESC_T);
    critical(code: number, desc: DESC_T);
    prettyPrint(): string;
    hasErrors(): boolean;
    getLastError(): IDiagnosticMessage;
}
