import { IInstructionCollector } from '@lib/idl/IInstruction';
import { Color, ColorInformation, ColorPresentation, CompletionItem, CompletionItemKind, CompletionList, Diagnostic, DiagnosticSeverity, DocumentSymbol, FoldingRange, FoldingRangeKind, FormattingOptions, Hover, InsertTextFormat, Location, MarkedString, MarkupContent, MarkupKind, Position, Range, SymbolInformation, SymbolKind, TextDocument, TextEdit } from 'vscode-languageserver-types';

export type HLSLDocument = IInstructionCollector;

type SelectionRange = Range;

export interface LanguageService {
    doValidation(document: TextDocument, hlslDocument: HLSLDocument): Thenable<Diagnostic[]>;
    parseDocument(document: TextDocument): HLSLDocument;
    doResolve(item: CompletionItem): Thenable<CompletionItem>;
    doComplete(document: TextDocument, position: Position, doc: HLSLDocument): Thenable<CompletionList | null>;
    findDocumentSymbols(document: TextDocument, doc: HLSLDocument): SymbolInformation[];
    findDocumentColors(document: TextDocument, doc: HLSLDocument): Thenable<ColorInformation[]>;
    getColorPresentations(document: TextDocument, doc: HLSLDocument, color: Color, range: Range): ColorPresentation[];
    doHover(document: TextDocument, position: Position, doc: HLSLDocument): Thenable<Hover | null>;
    format(document: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
    getFoldingRanges(document: TextDocument): FoldingRange[];
    getSelectionRanges(document: TextDocument, positions: Position[], doc: HLSLDocument): SelectionRange[];
}

export function getLanguageService(): LanguageService {
    return {
        doValidation(document: TextDocument, hlslDocument: HLSLDocument) { console.log('LanguageService::doValidation()'); return null; },
        parseDocument(document: TextDocument): HLSLDocument { return null; },
        doResolve(item: CompletionItem): Thenable<CompletionItem> { return null; },
        doComplete(document: TextDocument, position: Position, doc: HLSLDocument): Thenable<CompletionList | null> { return null; },
        findDocumentSymbols(document: TextDocument, doc: HLSLDocument): SymbolInformation[] { return []; },
        findDocumentColors(document: TextDocument, doc: HLSLDocument): Thenable<ColorInformation[]> { return null; },
        getColorPresentations(document: TextDocument, doc: HLSLDocument, color: Color, range: Range): ColorPresentation[] { return []; },
        doHover(document: TextDocument, position: Position, doc: HLSLDocument): Thenable<Hover | null> { return null; },
        format(document: TextDocument, range: Range, options: FormattingOptions): TextEdit[] { return []; },
        getFoldingRanges(document: TextDocument): FoldingRange[] { return []; },
        getSelectionRanges(document: TextDocument, positions: Position[], doc: HLSLDocument): SelectionRange[] { return []; }
    }
}
