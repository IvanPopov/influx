import { LOCATION_PATTERN, PATH_PARAMS_TYPE } from '@sandbox/logic';
import IStoreState from '@sandbox/store/IStoreState';
import { matchPath } from 'react-router';
import { combineReducers } from 'redux';

import parserParams from './parserParams';
import router from './router';
import sourceFile from './sourceFile';
import playground from './playground';
import nodes from './nodes';
import s3d from './s3d';
import depot from './depot';

/**
 * selectors
 */

// most common selector;
// markers are very expensive for react update :/
export const getCommon = (state: IStoreState): IStoreState => state;
// ({ ...state, sourceFile: { ...state.sourceFile, markers: null } });

export const getLocation = (state: IStoreState): string => state.router.location.pathname;
export const matchLocation = (state: IStoreState) =>
    matchPath<PATH_PARAMS_TYPE>(getLocation(state), { path: LOCATION_PATTERN, exact: false });

// helper function in order to get proper props from state using custom selector;
export function mapProps<T extends { (state: IStoreState): any; }>(selector: T): (state: IStoreState) => ReturnType<T> {
    return (state) => selector(state);
}

export default combineReducers<IStoreState>({ sourceFile, parserParams, router, playground, nodes, s3d, depot });