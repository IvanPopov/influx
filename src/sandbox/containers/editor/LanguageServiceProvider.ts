import { EffectParser } from '@lib/fx/EffectParser';
// import { ILanguageService, SLDocument } from '@lib/idl/IInstruction';
import { ILanguageService, SLDocument } from '@lib/idl/ILanguageService';
import { IParserParams } from '@lib/idl/parser/IParser';
import { getLanguageService } from '@lib/language-service/LanguageService';
import * as Comlink from 'comlink';
import { CodeLens, Diagnostic, Position, SignatureHelp, TextDocument, TextDocumentIdentifier } from 'vscode-languageserver-types';

/* tslint:disable:typedef */
/* tslint:disable:no-empty */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */

// supress all console messages for debugging/development purposes
// import NULL_LOGGER from '@lib/util/NullLogger';
// console = <any>NULL_LOGGER;


function asTextDocument({ _content, _languageId, _lineOffsets, _uri, _version }): TextDocument {
    return TextDocument.create(_uri, _languageId, _version, _content);
}


class LanguageServiceProvider {
    private service: ILanguageService;
    private documents: Map<string, { textDocument: TextDocument; slDocument: SLDocument }> = new Map();

    init(parserParams: IParserParams, parsingFlags: number) {
        //
        // Setup parser
        // TODO: simplify api
        //

        if (!parserParams.grammar) {
            console.warn('parser parameters are invalid.');
            return null;
        }

        console.log('%c Creating parser for language service provider...', 'background: #222; color: #bada55');
        const parser = new EffectParser();

        if (!parser.init(parserParams.grammar, parserParams.flags, parserParams.type)) {
            console.error('could not initialize parser.');
            return null;
        } else {
            console.log('%c [ DONE ]', 'background: #222; color: #bada55');
        }

        this.service = getLanguageService(parser, parsingFlags);
    }

    async validate(rawDocument): Promise<Diagnostic[]> {
        const textDocument = asTextDocument(rawDocument);

        const { document: slDocument, diagnostics } = await this.service.parseDocument(textDocument);
        this.documents.set(textDocument.uri, { textDocument, slDocument });

        return diagnostics;
    }

    async provideFxCodeLenses(textDocumentIdentifier: TextDocumentIdentifier): Promise<CodeLens[]> {
        if (!this.service) {
            return [];
        }

        const { textDocument, slDocument } = await this.getDocument(textDocumentIdentifier);
        return this.service.doFxCodeLenses(textDocument, slDocument);
    }

    async provideSignatureHelp(textDocumentIdentifier: TextDocumentIdentifier, position: Position): Promise<SignatureHelp> {
        if (!this.service) {
            return null;
        }

        const { textDocument, slDocument } = await this.getDocument(textDocumentIdentifier);
        return this.service.doSignatureHelp(textDocument, position, slDocument);
    }

    private getDocument(textDocumentIdentifier: TextDocumentIdentifier): { textDocument: TextDocument; slDocument: SLDocument } {
        if (!this.documents.has(textDocumentIdentifier.uri)) {
            console.warn('could not find document', textDocumentIdentifier.uri);
            return { textDocument: null, slDocument: null };
        }
        return this.documents.get(textDocumentIdentifier.uri);
    }
}

export type ILanguageServiceProvider = LanguageServiceProvider;

Comlink.expose(new LanguageServiceProvider());

