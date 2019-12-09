import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/idl/IDiagnostics';
import { SLDocument } from "@lib/idl/ILanguageService";
import { AbstractParser } from "@lib/parser/AbstractParser";
import { Diagnostics } from "@lib/util/Diagnostics";
import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from "vscode-languageserver-types";
import { createSLASTDocument } from '@lib/fx/SLASTDocument';

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
    async doValidation(textDocument: TextDocument, slDocument: SLDocument): Promise<Diagnostic[]> {
        if (!textDocument) {
            return null;
        }
        
        const uri = textDocument.uri;
        const source = textDocument.getText();

        const slastDocument = await createSLASTDocument({ uri, source });
        const semanticResults = FxAnalyzer.analyze(slastDocument);

        const diag = Diagnostics.mergeReports([slastDocument.diagnosticReport, semanticResults.diag]);

        return diag.messages.map(asDiagnostic);
    }
}