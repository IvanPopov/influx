import { ITextDocument } from "@lib/idl/ITextDocument";
import { IPosition } from "@lib/idl/parser/IParser";
import { StringRef } from "@lib/util/StringRef";

export function createTextDocument(uri: string | StringRef, source: string, offset: IPosition = null): ITextDocument {
    uri = StringRef.make(uri);
    return { uri, source, offset };
}

export function createSyncTextDocument(uri: string | StringRef, source: string, offset: IPosition = null): ITextDocument {
    return createTextDocument(uri, source, offset);
}
