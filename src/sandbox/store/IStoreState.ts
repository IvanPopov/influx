import { EParserType, IRange, IParseTree } from '../../lib/idl/parser/IParser';
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
    error: Error;
    markers: IMap<IMarker>;
    breakpoints: number[];
    parseTree: IParseTree;
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
