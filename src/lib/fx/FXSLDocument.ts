import { isNumber, isObject, isString } from "@lib/common";
import { IScope } from "@lib/idl/IInstruction";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";

import { FxAnalyzer } from "./analisys/FxAnalyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createFXSLDocument(textDocument: ITextDocument, flags?: number, scope?: IScope): Promise<ISLDocument>;
export async function createFXSLDocument(slastDocument: ISLASTDocument, scope?: IScope): Promise<ISLDocument>;
export async function createFXSLDocument(param1: ISLASTDocument | ITextDocument, param2?: number | IScope): Promise<ISLDocument> {
    let textDocument: ITextDocument;
    let slastDocument: ISLASTDocument;
    let scope: IScope;

    if (isString(arguments[0].source)) {    
        textDocument = <ITextDocument>arguments[0];
        slastDocument = await createSLASTDocument(textDocument, isNumber(arguments[1]) ? arguments[1] : undefined);
        scope = arguments[2];
    } else {
        slastDocument = <ISLASTDocument>arguments[0];
        scope = arguments[1];
    }
    
    const analyzer = new FxAnalyzer;
    return await analyzer.parse(slastDocument, scope);
}

