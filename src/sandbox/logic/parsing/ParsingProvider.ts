import { createFXSLDocument, IFXSLOptions } from '@lib/fx/FXSLDocument';
import { createSLASTDocument, ISLASTOptions } from '@lib/fx/SLASTDocument';
import { createDefaultSLParser } from '@lib/fx/SLParser';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { IParserParams } from '@lib/idl/parser/IParser';
import * as Comlink from 'comlink';

export class ParsingProvider {
    createDefaultSLParser(params?: IParserParams): void {
        console.log('%c Creating parser for parsing service provider...', 'background: #444; color: #bada55');
        try {
            createDefaultSLParser(params);
            console.log('%c [ DONE ]', 'background: #444; color: #bada55');
        } catch (e) {
            console.error('could not initialize parser.');
            return null;
        }
    }

    createSLASTDocument(document: ITextDocument, opts?: ISLASTOptions): Promise<ISLASTDocument> {
        return createSLASTDocument(document, opts);
    }

    createFXSLDocument(document: ISLASTDocument | ITextDocument, opts?: IFXSLOptions, parent?: ISLDocument): Promise<ISLDocument> {
        return createFXSLDocument(document, opts, parent);
    }
}

export type IParsingProvider = ParsingProvider;

Comlink.expose(new ParsingProvider());

