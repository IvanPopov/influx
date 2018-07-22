import * as reactDevTools from 'electron-react-devtools';
reactDevTools.install();

import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, Middleware, Store } from 'redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { logger } from 'redux-logger';
import thunk from 'redux-thunk';
import { parser, sourceCode } from './actions';
import { App } from './containers';
import reducer from './reducers';
import IStoreState from './store/IStoreState';


// todo: add support for retail configuration
const middleware: Middleware[] = [ thunk, /*logger, */reduxImmutableStateInvariant() ];

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

store.dispatch(sourceCode.openFile('assets/fx/tests/flow.fx'));
store.dispatch(parser.openGrammar('assets/HLSL.gr'));
