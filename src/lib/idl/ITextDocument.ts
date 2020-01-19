import { IPosition } from "./parser/IParser";

export interface ITextDocument {
    uri: string;
    source: string;
    offset?: IPosition;
}
