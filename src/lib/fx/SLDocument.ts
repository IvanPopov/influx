import { isString } from "@lib/common";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";

import { Analyzer } from "./analisys/Analyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createSLDocument(textDocument: ITextDocument, flags?: number): Promise<ISLDocument>;
export async function createSLDocument(slastDocument: ISLASTDocument): Promise<ISLDocument>;
export async function createSLDocument(document: ISLASTDocument | ITextDocument, flags?: number): Promise<ISLDocument> {
    let textDocument = <ITextDocument>document;
    let slastDocument = <ISLASTDocument>document;

    if (isString(textDocument.source)) {    
        slastDocument = await createSLASTDocument(textDocument, flags);
    }
    
    const timeLabel = `createSLDocument(${slastDocument.uri})`;
    console.time(timeLabel);

    const analyzer = new Analyzer;
    const slDocument = await analyzer.parse(slastDocument);

    console.timeEnd(timeLabel);

    return slDocument;
}

