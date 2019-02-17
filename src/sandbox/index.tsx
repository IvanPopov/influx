// path mapping from package.json
// path remapping from package.json
import 'module-alias/register';


import * as reactDevTools from 'electron-react-devtools';
reactDevTools.install();

import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { applyMiddleware, createStore, Middleware } from 'redux';

import { parser, sourceCode } from '@sandbox/actions';
import { App } from '@sandbox/containers';
import reducer from '@sandbox/reducers';
import logic from '@sandbox/logic';
import IStoreState from '@sandbox/store/IStoreState';

const logger = createLogger({
  collapsed: true,
  diff: false
});

const reduxImmutableState = reduxImmutableStateInvariant({ ignore: ['sourceFile.parseTree'] } as any);

// todo: add support for retail configuration
const middleware: Middleware[] = [logic, thunk, logger, reduxImmutableState];

const store = createStore<IStoreState, any, any, any>(
  reducer,
  applyMiddleware(...middleware)
);
// console.log(store);
render(
  <Provider store={ store }>
    <App />
  </Provider>,
  document.getElementById('app')
);

store.dispatch(sourceCode.openFile('assets/fx/tests/simplest_func.fx'));
store.dispatch(parser.openGrammar('assets/HLSL.gr'));
