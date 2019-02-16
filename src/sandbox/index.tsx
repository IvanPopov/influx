import * as reactDevTools from 'electron-react-devtools';
reactDevTools.install();

import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { applyMiddleware, createStore, Middleware } from 'redux';
import { parser, sourceCode } from './actions';
import { App } from './containers';
import reducer from './reducers';
import logic from './logic';
import IStoreState from './store/IStoreState';

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
