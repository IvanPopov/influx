import { createFXSLDocument } from '@lib/fx/FXSLDocument';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/idl/IDiagnostics';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { Diagnostics } from "@lib/util/Diagnostics";
import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from "vscode-languageserver-types";

function asDiagnostic(diagEntry: IDiagnosticMessage): Diagnostic {
    const { code, content, start, end, category } = diagEntry;

    const severities = {
        [EDiagnosticCategory.k_Error]: DiagnosticSeverity.Error,
        [EDiagnosticCategory.k_Warning]: DiagnosticSeverity.Warning
    };

    return {
        range: Range.create(start.line, start.column, end.line, end.column),
        severity: severities[category],
        code, 
        message: content
    };
}

export class SLValidation {
    async doValidation(textDocument: TextDocument, slDocument: ISLDocument): Promise<Diagnostic[]> {
        if (!textDocument) {
            return null;
        }
        
        const uri = textDocument.uri;
        const source = textDocument.getText();

        const fxslDocument = await createFXSLDocument({ uri, source });
        return fxslDocument.diagnosticReport.messages.map(asDiagnostic);
    }
}