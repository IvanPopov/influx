import { EffectParser } from '@lib/fx/EffectParser';
import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/idl/IDiagnostics';
import { IInstructionCollector } from '@lib/idl/IInstruction';
import { ILanguageService, SLDocument } from '@lib/idl/ILanguageService';
import { EParsingFlags, IParserEngine, IParserParams } from '@lib/idl/parser/IParser';
import { ParserEngine } from '@lib/parser/Parser';
import { Diagnostics } from '@lib/util/Diagnostics';
import { Color, ColorInformation, ColorPresentation, CompletionItem, CompletionItemKind, CompletionList, Diagnostic, DiagnosticSeverity, DocumentSymbol, FoldingRange, FoldingRangeKind, FormattingOptions, Hover, InsertTextFormat, Location, MarkedString, MarkupContent, MarkupKind, Position, Range, SignatureHelp, SymbolInformation, SymbolKind, TextDocument, TextEdit } from 'vscode-languageserver-types';

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

async function parse(parser: IParserEngine, flags: EParsingFlags, textDocument: TextDocument) {
    const parsingResults = await parser.parse(textDocument.getText(), textDocument.uri, flags);
    const semanticResults = FxAnalyzer.analyze(parser.getSyntaxTree(), textDocument.uri);
    const diag = Diagnostics.mergeReports([parser.getDiagnostics(), semanticResults.diag]);

    return { ...semanticResults, diag };
}


export function getLanguageService(parser: IParserEngine, flags: EParsingFlags): ILanguageService {
    const signatureHelp = new SLSignatureHelp();

    //
    // FX
    //
    
    const fxCodeLenses = new FXCodeLenses();

    return {
        async parseDocument(textDocument: TextDocument): Promise<{ document: SLDocument, diagnostics: Diagnostic[] }> { 
            const result = await parse(parser, flags, textDocument);
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
