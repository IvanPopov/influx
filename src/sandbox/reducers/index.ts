import IStoreState from '@sandbox/store/IStoreState';
import { combineReducers } from 'redux';
import parserParams from './parserParams';
import sourceFile from './sourceFile';
import router from './router';
import { PATH_PARAMS_TYPE, LOCATION_PATTERN } from '@sandbox/logic';
import { matchPath } from 'react-router';

/**
 * selectors
 */

// most common selector;
export const getCommon = (state: IStoreState): IStoreState => state;

export const getLocation = (state: IStoreState): string => state.router.location.pathname;
export const matchLocation = (state: IStoreState) =>
    matchPath<PATH_PARAMS_TYPE>(getLocation(state), { path: LOCATION_PATTERN, exact: false });

// helper function in order to get proper props from state using custom selector;
export function mapProps<T extends { (state: IStoreState): any; }>(selector: T): (state: IStoreState) => ReturnType<T> {
    return (state) => selector(state);
}

export default combineReducers<IStoreState>({ sourceFile, parserParams, router });