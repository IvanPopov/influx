import { AnyAction, combineReducers } from 'redux';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import IStoreState, { IParserParams, IFileState } from '../store/IStoreState';
import parserParams, * as fromParserParams from './parserParams';
import sourceFile from './sourceFile';

/**
 * selectors
 */

// most common selector;
export const getCommon = (state: IStoreState): IStoreState => state;

// helper function in order to get proper props from state using custom selector;
export function mapProps<T extends { (state: IStoreState): any; }>(selector: T): (state: IStoreState) => ReturnType<T> {
    return (state) => selector(state);
}

export default combineReducers<IStoreState>({ sourceFile, parserParams });