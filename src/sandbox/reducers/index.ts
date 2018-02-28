import { AnyAction, combineReducers } from 'redux';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import IStoreState, { IParserParams, IFileState } from '../store/IStoreState';
import parserParams, * as fromParserParams from './parserParams';
import sourceFile from './sourceFile';

export default combineReducers<IStoreState>({ sourceFile, parserParams });

/**
 * selectors
 */

export const getCommon = (state: IStoreState): IStoreState => state;

// todo: use ReturnType for better readability.
export type ReturnType<T> = any;//T extends (...args: any[]) => infer R ? R : T;
export function mapProps<T extends { (state: IStoreState): any; }>(selector: T): (state: IStoreState) => ReturnType<T> {
    return (state) => selector(state);
}
