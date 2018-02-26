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

// import installExtension, { REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } from 'electron-devtools-installer';
// import { composeWithDevTools } from 'redux-devtools-extension';

// installExtension(REACT_DEVELOPER_TOOLS)
//     .then((name) => console.log(`Added Extension:  ${name}`))
//     .catch((err) => console.log('An error occurred: ', err));
// installExtension(REDUX_DEVTOOLS)
//     .then((name) => console.log(`Added Extension:  ${name}`))
//     .catch((err) => console.log('An error occurred: ', err));

// todo: add support for retail configuration
const middleware: Middleware[] = [ thunk, /*logger, */reduxImmutableStateInvariant() ];

const store = createStore<IStoreState>(
  reducer,
  // composeWithDevTools(
  applyMiddleware(...middleware)
  // )
);

render(
  <Provider store={ store }>
    <App />
  </Provider>,
  document.getElementById('app')
);

store.dispatch(sourceCode.openFile('assets/fx/example.fx'));
store.dispatch(parser.openGrammar('assets/HLSL.gr'));
