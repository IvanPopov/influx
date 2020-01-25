import { IDiagnosticReport } from "./IDiagnostics";
import { IInstructionCollector } from "./IInstruction";
import { IFile } from "./parser/IParser";

export interface ISLDocument {
    uri: IFile;
    root: IInstructionCollector;
    diagnosticReport: IDiagnosticReport;
}

