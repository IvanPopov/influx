import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/idl/IDiagnostics';
import { SLDocument } from "@lib/idl/ILanguageService";
import { ParserEngine } from "@lib/parser/Parser";
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
    async doValidation(textDocument: TextDocument, slDocument: SLDocument): Promise<Diagnostic[]> {
        if (!textDocument) {
            return null;
        }
        
        const parsingResults = await ParserEngine.parse(textDocument.getText(), { filename: textDocument.uri });
        const semanticResults = FxAnalyzer.analyze(parsingResults.ast, textDocument.uri);

        const diag = Diagnostics.mergeReports([parsingResults.diag, semanticResults.diag]);

        return diag.messages.map(asDiagnostic);
    }
}