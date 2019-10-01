import * as isElectron from 'is-electron-renderer';
import { parser, sourceCode } from '@sandbox/actions';
import { App } from '@sandbox/containers';
import logic from '@sandbox/logic';
import reducer from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, Middleware } from 'redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import { string } from 'prop-types';

require('semantic-ui-less/semantic.less');

if (isElectron) {
    require('electron-react-devtools').install();
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

store.dispatch(sourceCode.openFile(`./assets/fx/tests/part.fx`));
store.dispatch(parser.openGrammar(`./assets/HLSL.gr`));

console.log(`%c Is this running in electron.js?: ${isElectron}`, 'background: #222; color: #bada55');
console.log(`%c This is ${isElectron ? 'electron' : 'a web browser'}!!!`, 'background: #222; color: #bada55');

// global defines from webpack's config;
declare const VERSION: string;
declare const COMMITHASH: string;
declare const BRANCH: string;
console.log(`%c ver: ${VERSION} (${COMMITHASH}, ${BRANCH})`, 'background: #222; color: #bada55');