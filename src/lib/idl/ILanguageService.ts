import { CodeLens, Color, ColorInformation, ColorPresentation, CompletionItem, CompletionItemKind, CompletionList, Diagnostic, DiagnosticSeverity, DocumentSymbol, FoldingRange, FoldingRangeKind, FormattingOptions, Hover, InsertTextFormat, Location, MarkedString, MarkupContent, MarkupKind, Position, Range, SignatureHelp, SymbolInformation, SymbolKind, TextDocument, TextEdit } from 'vscode-languageserver-types';

import { IInstructionCollector } from './IInstruction';

export type SLDocument = IInstructionCollector;

// FIXME: use correct type
type SelectionRange = Range;

export interface ILanguageService {
    parseDocument(textDocument: TextDocument): Thenable<{ document: SLDocument, diagnostics: Diagnostic[] }>;
    doResolve(item: CompletionItem): Thenable<CompletionItem>;
    doComplete(textDocument: TextDocument, position: Position, slDocument: SLDocument): Thenable<CompletionList | null>;
    findDocumentSymbols(textDocument: TextDocument, slDocument: SLDocument): SymbolInformation[];
    findDocumentColors(textDocument: TextDocument, slDocument: SLDocument): Thenable<ColorInformation[]>;
    getColorPresentations(textDocument: TextDocument, slDocument: SLDocument, color: Color, range: Range): ColorPresentation[];
    doHover(textDocument: TextDocument, position: Position, slDocument: SLDocument): Thenable<Hover | null>;
    format(textDocument: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
    getFoldingRanges(textDocument: TextDocument): FoldingRange[];
    getSelectionRanges(textDocument: TextDocument, positions: Position[], slDocument: SLDocument): SelectionRange[];
    doSignatureHelp(textDocument: TextDocument, position: Position, slDocument: SLDocument): SignatureHelp;

    // fx
    doFxCodeLenses(textDocument: TextDocument, slDocument: SLDocument): CodeLens[];
}