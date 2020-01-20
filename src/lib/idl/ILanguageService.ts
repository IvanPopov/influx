import { ISLDocument } from '@lib/idl/ISLDocument';
import { CodeLens, Color, ColorInformation, ColorPresentation, CompletionItem, CompletionList, Diagnostic, FoldingRange, FormattingOptions, Hover, Position, Range, SignatureHelp, SymbolInformation, TextDocument, TextEdit } from 'vscode-languageserver-types';
import { ISLASTDocument } from './ISLASTDocument';

// FIXME: use correct type
type SelectionRange = Range;

export interface ILanguageService {
    $parseSLASTDocument(textDocument: TextDocument): Thenable<ISLASTDocument>;
    $parseSLDocument(slastDocument: ISLASTDocument): Thenable<ISLDocument>;

    parseDocument(textDocument: TextDocument): Thenable<ISLDocument>;
    doResolve(item: CompletionItem): Thenable<CompletionItem>;
    doComplete(textDocument: TextDocument, position: Position, slDocument: ISLDocument): Thenable<CompletionList | null>;
    findDocumentSymbols(textDocument: TextDocument, slDocument: ISLDocument): SymbolInformation[];
    findDocumentColors(textDocument: TextDocument, slDocument: ISLDocument): Thenable<ColorInformation[]>;
    getColorPresentations(textDocument: TextDocument, slDocument: ISLDocument, color: Color, range: Range): ColorPresentation[];
    doHover(textDocument: TextDocument, position: Position, slDocument: ISLDocument): Thenable<Hover | null>;
    format(textDocument: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
    getFoldingRanges(textDocument: TextDocument): FoldingRange[];
    getSelectionRanges(textDocument: TextDocument, positions: Position[], slDocument: ISLDocument): SelectionRange[];
    doSignatureHelp(textDocument: TextDocument, position: Position, slDocument: ISLDocument): SignatureHelp;

    // fx
    doFxCodeLenses(textDocument: TextDocument, slDocument: ISLDocument): CodeLens[];
}