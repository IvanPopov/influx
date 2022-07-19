import { createDefaultSLParser } from '@lib/fx/SLParser';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/idl/IDiagnostics';
import { ILanguageService } from '@lib/idl/ILanguageService';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { IncludeResolver, IParserParams, IRange } from '@lib/idl/parser/IParser';
import { getLanguageService } from '@lib/language-service/LanguageService';
import * as Comlink from 'comlink';
import { CodeLens, Diagnostic, DiagnosticSeverity, Position, Range, SignatureHelp, TextDocument, TextDocumentIdentifier } from 'vscode-languageserver-types';

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


function asDiagnostic(diagEntry: IDiagnosticMessage): Diagnostic {
    const { code, content, start, end, category } = diagEntry;

    const severities = {
        [EDiagnosticCategory.k_Error]: DiagnosticSeverity.Error,
        [EDiagnosticCategory.k_Warning]: DiagnosticSeverity.Warning
    };

    return {
        range: Range.create(start.line, start.column, (end || start).line, (end || start).column),
        severity: severities[category],
        code,
        message: content,
        source: `${start.file}`
    };
}

function resolveLocation(src: IRange, slastDocument: ISLASTDocument): IRange {
    if (!slastDocument) {
        return null;
    }

    const { includes, uri } = slastDocument;
    let dst = src;
    while (dst && String(uri) !== String(dst.start.file)) {
        dst = includes.get(String(dst.start.file));
    }
    return dst;
}


interface IDocumentCacheEntry {
    textDocument: TextDocument;
    slastDocument: ISLASTDocument;
    slDocument: ISLDocument;
}

class LanguageServiceProvider {
    private service: ILanguageService;
    private documents: Map<string, IDocumentCacheEntry> = new Map();

    init(parserParams: IParserParams, parsingFlags: number, includeResolver: IncludeResolver) {
        console.log('%c Creating parser for language service provider...', 'background: #222; color: #bada55');
        try {
            createDefaultSLParser(parserParams);
            console.log('%c [ DONE ]', 'background: #222; color: #bada55');
        } catch (e) {
            console.error('could not initialize parser.');
            return null;
        }

        this.service = getLanguageService({ flags: parsingFlags, includeResolver });
    }

    async validate(rawDocument): Promise<Diagnostic[]> {
        const textDocument = asTextDocument(rawDocument);

        const slastDocument = await this.service.$parseSLASTDocument(textDocument);
        const slDocument = await this.service.$parseSLDocument(slastDocument);
        this.documents.set(textDocument.uri, { textDocument, slastDocument, slDocument });

        slDocument.diagnosticReport.messages.forEach(msg => {
            const loc = resolveLocation(msg, slastDocument);
            if (!loc) {
                return;
            }

            const { start, end } = loc;
            msg.start = start;
            msg.end = end;
        });

        return slDocument.diagnosticReport.messages.map(asDiagnostic);
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

    // async provideUnreachableCodeBlocks(textDocumentIdentifier: TextDocumentIdentifier): Promise<Range[]> {
    //     if (!this.service) {
    //         return null;
    //     }

    //     const { textDocument, slastDocument } = await this.getDocument(textDocumentIdentifier);
    //     if (!slastDocument) {
    //         return [];
    //     }

    //     // return slastDocument.unreachableCode.map(range => Range.create(Position.create(), Position.create()));
    //     return [];
    // }

    private getDocument(textDocumentIdentifier: TextDocumentIdentifier): IDocumentCacheEntry {
        if (!this.documents.has(textDocumentIdentifier.uri)) {
            console.warn('could not find document', textDocumentIdentifier.uri);
            return { textDocument: null, slastDocument: null, slDocument: null };
        }
        return this.documents.get(textDocumentIdentifier.uri);
    }
}

export type ILanguageServiceProvider = LanguageServiceProvider;

Comlink.expose(new LanguageServiceProvider());

