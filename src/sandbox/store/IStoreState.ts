import { EParserType, IRange } from '../../lib/idl/parser/IParser';
import { IMap } from '../../lib/idl/IMap';

export interface IFileState {
    filename: string;
    content: string;
    fetching: boolean;
    fetched: boolean;
    error: Error;
    markers: IMap<IRange>;
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
