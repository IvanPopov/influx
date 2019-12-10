import { isString } from "@lib/common";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IASTDocument } from "@lib/idl/parser/IParser";

import { FxAnalyzer } from "./analisys/FxAnalyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createFXSLDocument(textDocument: ITextDocument, flags?: number): Promise<ISLDocument>;
export async function createFXSLDocument(slastDocument: IASTDocument): Promise<ISLDocument>;
export async function createFXSLDocument(document: IASTDocument | ITextDocument, flags?: number): Promise<ISLDocument> {
    let textDocument = <ITextDocument>document;
    let slastDocument = <IASTDocument>document;

    if (isString(textDocument.source)) {    
        slastDocument = await createSLASTDocument(textDocument, flags);
    }
    
    const analyzer = new FxAnalyzer;
    return await analyzer.parse(slastDocument);
}

