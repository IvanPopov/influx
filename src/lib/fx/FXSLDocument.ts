import { isNumber, isString } from "@lib/common";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";

import { FxAnalyzer } from "./analisys/FxAnalyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createFXSLDocument(textDocument: ITextDocument, flags?: number, document?: ISLDocument): Promise<ISLDocument>;
export async function createFXSLDocument(slastDocument: ISLASTDocument, document?: ISLDocument): Promise<ISLDocument>;
export async function createFXSLDocument(param1: ISLASTDocument | ITextDocument, param2?: number | ISLDocument, param3?: ISLDocument): Promise<ISLDocument> {
    let textDocument: ITextDocument;
    let slastDocument: ISLASTDocument;
    let slDocument: ISLDocument;

    if (isString(arguments[0].source)) {    
        const flags = isNumber(arguments[1]) ? <number>arguments[1] : undefined;
        textDocument = <ITextDocument>arguments[0];
        slastDocument = await createSLASTDocument(textDocument, flags);
        slDocument = arguments[2];
    } else {
        slastDocument = <ISLASTDocument>arguments[0];
        slDocument = arguments[1];
    }
    
    const analyzer = new FxAnalyzer;
    return await analyzer.parse(slastDocument, slDocument);
}

