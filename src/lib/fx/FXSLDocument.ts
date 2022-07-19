import { isNumber, isString } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IncludeResolver } from "@lib/idl/parser/IParser";
import { IExprSubstCallback } from "./analisys/Analyzer";

import { FxAnalyzer } from "./analisys/FxAnalyzer";
import { createSLASTDocument } from "./SLASTDocument";

type Opts = { flags?: number, includeResolver?: IncludeResolver };

export async function createFXSLDocument(document: ISLASTDocument | ITextDocument, opts: Opts = {}, parent: ISLDocument = null): Promise<ISLDocument> {
    let textDocument: ITextDocument;
    let slastDocument: ISLASTDocument;

    if (isString((document as ITextDocument).source)) {    
        textDocument = <ITextDocument>document;
        slastDocument = await createSLASTDocument(textDocument, opts);
    } else {
        slastDocument = <ISLASTDocument>document;
    }
    
    const analyzer = new FxAnalyzer;
    return await analyzer.parse(slastDocument, parent);
}

export async function extendFXSLDocument(textAddition: ITextDocument, base: ISLDocument, expressions?: IMap<IExprSubstCallback>, opts: Opts = {}): Promise<ISLDocument> {
    let addition = null;
    if (textAddition)
    {
        const knownTypes = Object.keys(base.root.scope.types);
        const { flags, includeResolver } = opts;
        addition = await createSLASTDocument(textAddition, { flags, knownTypes, includeResolver });
    }
    const analyzer = new FxAnalyzer;
    const slDocument = analyzer.extend(addition, base, expressions);
    return slDocument;
}
