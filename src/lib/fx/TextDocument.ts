import { ITextDocument } from "@lib/idl/ITextDocument";
import { IPosition, IFile } from "@lib/idl/parser/IParser";
import { StringRef } from "@lib/util/StringRef";

export function createTextDocument(uri: string | IFile, source: string, offset: IPosition = null): ITextDocument {
    uri = StringRef.make(`${uri}`);
    return { uri, source, offset };
}
