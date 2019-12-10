import { isString } from "@lib/common";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IASTDocument } from "@lib/idl/parser/IParser";

import { Analyzer } from "./analisys/Analyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createSLDocument(textDocument: ITextDocument, flags?: number): Promise<ISLDocument>;
export async function createSLDocument(slastDocument: IASTDocument): Promise<ISLDocument>;
export async function createSLDocument(document: IASTDocument | ITextDocument, flags?: number): Promise<ISLDocument> {
    let textDocument = <ITextDocument>document;
    let slastDocument = <IASTDocument>document;

    if (isString(textDocument.source)) {    
        slastDocument = await createSLASTDocument(textDocument, flags);
    }
    
    const analyzer = new Analyzer;
    return await analyzer.parse(slastDocument);
}

