import { createFXSLDocument } from '@lib/fx/FXSLDocument';
import { ILanguageService } from '@lib/idl/ILanguageService';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IASTDocumentFlags } from '@lib/idl/parser/IParser';
import { Color, ColorInformation, ColorPresentation, CompletionItem, CompletionList, FoldingRange, FormattingOptions, Hover, Position, Range, SymbolInformation, TextDocument, TextEdit } from 'vscode-languageserver-types';

import { FXCodeLenses } from './services/fx/codeLenses';
import { SLSignatureHelp } from './services/signatureHelp';
import { createSLASTDocument } from '@lib/fx/SLASTDocument';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';

// import { SLValidation } from './services/validation';

// FIXME: use correct type
type SelectionRange = Range;


export function getLanguageService(flags: IASTDocumentFlags): ILanguageService {
    const signatureHelp = new SLSignatureHelp();

    //
    // FX
    //
    
    const fxCodeLenses = new FXCodeLenses();

    return {
        async $parseSLASTDocument(textDocument: TextDocument): Promise<ISLASTDocument> {
            const uri = textDocument.uri;
            const source = textDocument.getText();
            const slastDocument = await createSLASTDocument({ uri, source }, flags);
            return slastDocument;
        },

        async $parseSLDocument(slastDocument: ISLASTDocument): Promise<ISLDocument> {
            return await createFXSLDocument(slastDocument);
        },


        async parseDocument(textDocument: TextDocument): Promise<ISLDocument> { 
            const uri = textDocument.uri;
            const source = textDocument.getText();
            return await createFXSLDocument({ uri, source }, flags);
        },

        doResolve(item: CompletionItem): Thenable<CompletionItem> { return null; },
        doComplete(textDocument: TextDocument, position: Position, slDocument: ISLDocument): Thenable<CompletionList | null> { return null; },
        findDocumentSymbols(textDocument: TextDocument, slDocument: ISLDocument): SymbolInformation[] { return []; },
        findDocumentColors(textDocument: TextDocument, slDocument: ISLDocument): Thenable<ColorInformation[]> { return null; },
        getColorPresentations(textDocument: TextDocument, slDocument: ISLDocument, color: Color, range: Range): ColorPresentation[] { return []; },
        doHover(textDocument: TextDocument, position: Position, slDocument: ISLDocument): Thenable<Hover | null> { return null; },
        format(textDocument: TextDocument, range: Range, options: FormattingOptions): TextEdit[] { return []; },
        getFoldingRanges(textDocument: TextDocument): FoldingRange[] { return []; },
        getSelectionRanges(textDocument: TextDocument, positions: Position[], slDocument: ISLDocument): SelectionRange[] { return []; },
        
        doSignatureHelp: signatureHelp.doSignatureHelp.bind(signatureHelp),

        //
        // FX
        //

        doFxCodeLenses: fxCodeLenses.doProvide.bind(fxCodeLenses)
    }
}
