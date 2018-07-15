import { EParserType, IRange } from '../../lib/idl/parser/IParser';
import { IMap } from '../../lib/idl/IMap';
import { AnyAction } from 'redux';

export interface IMarker {
    range: IRange;
    type: 'error' | 'marker';
    tooltip?: string;
}

export interface IFileState {
    filename: string;
    content: string;
    fetching: boolean;
    fetched: boolean;
    error: Error;
    markers: IMap<IMarker>;
}

export interface IParserParams {
    filename: string;
    grammar: string;
    type: EParserType;
    mode: number;
}

export interface IStoreState {
    readonly sourceFile: IFileState;
    readonly parserParams: IParserParams;
}

export default IStoreState;
