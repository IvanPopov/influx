import { IPosition, IFile } from "./parser/IParser";

export interface ITextDocument {
    uri: IFile;
    source: string;
    offset?: IPosition;
}


