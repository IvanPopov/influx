import { isString } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import { ISLASTDocument } from "@lib/idl/ISLASTDocument";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { ITextDocument } from "@lib/idl/ITextDocument";
import { IncludeResolver } from "@lib/idl/parser/IParser";

import { Analyzer, IExprSubstCallback } from "./analisys/Analyzer";
import { createSLASTDocument } from "./SLASTDocument";

export async function createSLDocument(document: ISLASTDocument | ITextDocument,  
        opts : { flags?: number, includeResolver?: IncludeResolver } = {}): Promise<ISLDocument> {
    let textDocument = <ITextDocument>document;
    let slastDocument = <ISLASTDocument>document;

    if (isString(textDocument.source)) {    
        let { flags, includeResolver } = opts;
        slastDocument = await createSLASTDocument(textDocument, { flags, includeResolver });
    }
    
    const timeLabel = `createSLDocument(${slastDocument.uri})`;
    console.time(timeLabel);

    const analyzer = new Analyzer;
    const slDocument = await analyzer.parse(slastDocument);

    console.timeEnd(timeLabel);

    return slDocument;
}


// export async function extendSLDocument2(addition: ISLASTDocument, base: ISLDocument, expressions?: IMap<IExprSubstCallback>): Promise<ISLDocument> {
//     const analyzer = new Analyzer;
//     const slDocument = analyzer.extend(addition, base, expressions);
//     return slDocument;
// }


export async function extendSLDocument(textAddition: ITextDocument, base: ISLDocument, expressions?: IMap<IExprSubstCallback>, 
    opts: { flags?: number, includeResolver?: IncludeResolver } = {}): Promise<ISLDocument> {
    let addition = null;
    if (textAddition)
    {
        let knownTypes = Object.keys(base.root.scope.types);
        let { flags, includeResolver } = opts;
        addition = await createSLASTDocument(textAddition, { flags, knownTypes, includeResolver });
    }
    const analyzer = new Analyzer;
    const slDocument = analyzer.extend(addition, base, expressions);
    return slDocument;
}

