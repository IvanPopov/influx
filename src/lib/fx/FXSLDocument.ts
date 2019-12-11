import { isString } from "@lib/common";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";

import { FxAnalyzer } from "./analisys/FxAnalyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createFXSLDocument(textDocument: ITextDocument, flags?: number): Promise<ISLDocument>;
export async function createFXSLDocument(slastDocument: ISLASTDocument): Promise<ISLDocument>;
export async function createFXSLDocument(document: ISLASTDocument | ITextDocument, flags?: number): Promise<ISLDocument> {
    let textDocument = <ITextDocument>document;
    let slastDocument = <ISLASTDocument>document;

    if (isString(textDocument.source)) {    
        slastDocument = await createSLASTDocument(textDocument, flags);
    }
    
    const analyzer = new FxAnalyzer;
    return await analyzer.parse(slastDocument);
}

