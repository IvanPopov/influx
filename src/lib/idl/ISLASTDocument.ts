import { IMacro } from "./parser/IMacro";
import { IASTDocument, IRange } from "./parser/IParser";

export interface ISLASTDocument extends IASTDocument {
    includes: Map<string, IRange>;
    unreachableCode: IRange[];
    macros: IMacro[];
    unresolvedMacros: IMacro[];
}
