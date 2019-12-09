import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { createSLASTDocument } from '@lib/fx/SLASTDocument';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/idl/IDiagnostics';
import { ILanguageService, SLDocument } from '@lib/idl/ILanguageService';
import { IASTDocumentFlags } from '@lib/idl/parser/IParser';
import { Diagnostics } from '@lib/util/Diagnostics';
import { Color, ColorInformation, ColorPresentation, CompletionItem, CompletionList, Diagnostic, DiagnosticSeverity, FoldingRange, FormattingOptions, Hover, Position, Range, SymbolInformation, TextDocument, TextEdit } from 'vscode-languageserver-types';
import { FXCodeLenses } from './services/fx/codeLenses';
import { SLSignatureHelp } from './services/signatureHelp';


// import { SLValidation } from './services/validation';

// FIXME: use correct type
type SelectionRange = Range;

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

async function parse(flags: IASTDocumentFlags, textDocument: TextDocument) {
    const uri = textDocument.uri;
    const source = textDocument.getText();

    const slastDocument = await createSLASTDocument({ uri, source, flags });
    const semanticResults = FxAnalyzer.analyze(slastDocument);
    const diag = Diagnostics.mergeReports([slastDocument.diagnosticReport, semanticResults.diag]);

    return { ...semanticResults, diag };
}


export function getLanguageService(flags: IASTDocumentFlags): ILanguageService {
    const signatureHelp = new SLSignatureHelp();

    //
    // FX
    //
    
    const fxCodeLenses = new FXCodeLenses();

    return {
        async parseDocument(textDocument: TextDocument): Promise<{ document: SLDocument, diagnostics: Diagnostic[] }> { 
            const result = await parse(flags, textDocument);
            return { document: result.root, diagnostics: result.diag.messages.map(asDiagnostic) };
        },

        doResolve(item: CompletionItem): Thenable<CompletionItem> { return null; },
        doComplete(textDocument: TextDocument, position: Position, slDocument: SLDocument): Thenable<CompletionList | null> { return null; },
        findDocumentSymbols(textDocument: TextDocument, slDocument: SLDocument): SymbolInformation[] { return []; },
        findDocumentColors(textDocument: TextDocument, slDocument: SLDocument): Thenable<ColorInformation[]> { return null; },
        getColorPresentations(textDocument: TextDocument, slDocument: SLDocument, color: Color, range: Range): ColorPresentation[] { return []; },
        doHover(textDocument: TextDocument, position: Position, slDocument: SLDocument): Thenable<Hover | null> { return null; },
        format(textDocument: TextDocument, range: Range, options: FormattingOptions): TextEdit[] { return []; },
        getFoldingRanges(textDocument: TextDocument): FoldingRange[] { return []; },
        getSelectionRanges(textDocument: TextDocument, positions: Position[], slDocument: SLDocument): SelectionRange[] { return []; },
        
        doSignatureHelp: signatureHelp.doSignatureHelp.bind(signatureHelp),

        //
        // FX
        //

        doFxCodeLenses: fxCodeLenses.doProvide.bind(fxCodeLenses)
    }
}
