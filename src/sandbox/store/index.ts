/// <reference path="../webpack.d.ts" />

import ActionTypes from '@sandbox/actions/ActionTypes';
import commonLogic from '@sandbox/logic/common';
import depotLogic from '@sandbox/logic/depot';
import fxRuntimeLogic from '@sandbox/logic/fxRuntime';
import graphLogic from '@sandbox/logic/nodes';
import parsingLogic from '@sandbox/logic/parsing';
import s3dLogic from '@sandbox/logic/s3d';
import depot from '@sandbox/reducers/depot';
import nodes from '@sandbox/reducers/nodes';
import parserParams from '@sandbox/reducers/parserParams';
import playground from '@sandbox/reducers/playground';
import router from '@sandbox/reducers/router';
import s3d from '@sandbox/reducers/s3d';
import sourceFile from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import { applyMiddleware, combineReducers, createStore, Middleware } from 'redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { createLogger } from 'redux-logger';
import { createLogicMiddleware } from 'redux-logic';

const reducer = combineReducers<IStoreState>({ 
    sourceFile, 
    parserParams, 
    router, 
    playground, 
    nodes, 
    s3d, 
    depot
});

const logic = createLogicMiddleware([
    ...commonLogic,
    ...parsingLogic,
    ...fxRuntimeLogic,
    ...graphLogic,
    ...s3dLogic,
    ...depotLogic
]);


const logger = createLogger({
    collapsed: true,
    diff: false
});


const reduxImmutableState = reduxImmutableStateInvariant({
    ignore: [
        'sourceFile.slastDocument',
        'sourceFile.slDocument',
        'sourceFile.debugger.runtime',
        'playground.emitter',
        'playground.timeline',
        'nodes.graph',
        's3d.env'
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

