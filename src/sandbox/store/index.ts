import ActionTypes from '@sandbox/actions/ActionTypes';
import logic from '@sandbox/logic';
import reducer from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import { applyMiddleware, createStore, Middleware } from 'redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { createLogger } from 'redux-logger';

declare const PRODUCTION: boolean;

const logger = createLogger({
    collapsed: true,
    diff: false
});


const reduxImmutableState = reduxImmutableStateInvariant({
    ignore: [
        'sourceFile.slastDocument',
        'sourceFile.slDocument',
        'sourceFile.debugger.runtime',
        'sourceFile.emitter'
    ]
} as any);

// todo: add support for retail configuration
const middleware: Middleware[] = !PRODUCTION ?
    [/*thunk, */logic, logger, reduxImmutableState] :
    [logic];

export const store = createStore<IStoreState, ActionTypes, any, any>(
    reducer,
    applyMiddleware(...middleware)
);

