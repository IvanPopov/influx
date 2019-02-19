// import 'module-alias/register';
import isElectron from 'is-electron-renderer';
import { parser, sourceCode } from '@sandbox/actions';
import { App } from '@sandbox/containers';
import logic from '@sandbox/logic';
import reducer from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
// import * as reactDevTools from 'electron-react-devtools';
import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, Middleware } from 'redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

if (isElectron) {
    // reactDevTools.install();
}


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

store.dispatch(sourceCode.openFile(`${isElectron? './dist/electron': ''}/assets/fx/tests/simplest_func.fx`));
store.dispatch(parser.openGrammar(`${isElectron? './dist/electron': ''}/assets/HLSL.gr`));

console.log('is this running in electron.js?: ', isElectron);
const runtime = isElectron ? 'electron.js' : 'a web browser';
console.log('This is ' + runtime + "!!!");
