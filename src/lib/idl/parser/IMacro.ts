import { IToken } from "@lib/idl/parser/IParser";

export interface IMacro {
    name: string;
    text: IToken;
    bFunction: boolean;
    params: string[];
    // TODO: add comment, rename
    bRegionExpr: boolean;
}
