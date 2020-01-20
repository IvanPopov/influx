import { IASTDocument, IRange } from "./parser/IParser";

export interface ISLASTDocument extends IASTDocument {
    includes: Map<string, IRange>;
    unreachableCode: IRange[];
}
