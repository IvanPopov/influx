import { ITextDocument } from "@lib/idl/ITextDocument";
import { IPosition } from "@lib/idl/parser/IParser";
import { StringRef } from "@lib/util/StringRef";

export async function createTextDocument(uri: string | StringRef, source: string, offset: IPosition = null): Promise<ITextDocument> {
    uri = StringRef.make(uri);
    return { uri, source, offset };
}
