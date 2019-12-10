import { IDiagnosticReport } from "./IDiagnostics";
import { IInstructionCollector } from "./IInstruction";

export interface ISLDocument {
    uri: string;
    root: IInstructionCollector;
    diagnosticReport: IDiagnosticReport;
}

