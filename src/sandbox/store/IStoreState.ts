import { EParserType } from '../../lib/idl/parser/IParser';

export interface IFileState {
    filename: string;
    content: string;
    fetching: boolean;
    fetched: boolean;
    error: Error;
}

export interface IParserParams {
    grammar: string;
    type: EParserType;
    mode: number;
}

export interface IStoreState {
    readonly sourceFile: IFileState;
    readonly parserParams: IParserParams;
}

export default IStoreState;
