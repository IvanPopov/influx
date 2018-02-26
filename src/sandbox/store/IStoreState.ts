import { EParserType } from '../../lib/idl/parser/IParser';
import { IMarkerRange } from '../actions/ActionTypes';
import { IMap } from '../../lib/idl/IMap';

export interface IFileState {
    filename: string;
    content: string;
    fetching: boolean;
    fetched: boolean;
    error: Error;
    markers: IMap<IMarkerRange>;
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
