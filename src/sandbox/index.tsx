import { parser } from '@sandbox/actions';
import ActionTypes from '@sandbox/actions/ActionTypes';
import { App } from '@sandbox/containers';
import logic, { LOCATION_NOT_FOUND } from '@sandbox/logic';
import reducer from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import { ConnectedRouter } from 'connected-react-router';
import * as isElectron from 'is-electron-renderer';
import * as React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { applyMiddleware, createStore, Middleware } from 'redux';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import { createLogger } from 'redux-logger';
import { history } from '@sandbox/reducers/router';
import { Message, Segment, Container, Modal, Header } from 'semantic-ui-react';

require('semantic-ui-less/semantic.less');

// global defines from webpack's config;
declare const VERSION: string;
declare const COMMITHASH: string;
declare const BRANCH: string;
declare const MODE: string;
declare const PRODUCTION: boolean;

if (isElectron) {
    require('electron-react-devtools').install();
}

const logger = createLogger({
    collapsed: true,
    diff: false
});


const reduxImmutableState = reduxImmutableStateInvariant({
    ignore: [
        'sourceFile.parseTree',
        'sourceFile.analysis',
        'sourceFile.debugger.runtime',
        'sourceFile.pipeline'
    ]
} as any);

// todo: add support for retail configuration
const middleware: Middleware[] = !PRODUCTION ?
    [/*thunk, */logic, logger, reduxImmutableState] :
    [logic];

const store = createStore<IStoreState, ActionTypes, any, any>(
    reducer,
    applyMiddleware(...middleware)
);

// const initialState: IStoreState = store.getState();
// const defaultName = initialState.sourceFile.filename;

render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <Switch>
                <Route path='/:view/:fx/:name?/:pass?/:property?' component={App} />
                <Route exact path={LOCATION_NOT_FOUND}>
                    <Modal open basic size='small'>
                        <Header icon='archive' content='Location not found :/' />
                        <Modal.Content>
                        </Modal.Content>
                    </Modal>
                </Route>
            </Switch>
        </ConnectedRouter>
    </Provider>,
    document.getElementById('app')
);


// store.dispatch(sourceCode.openFile(`./assets/fx/tests/part.fx`));
// store.dispatch(sourceCode.openFile(`./assets/fx/tests/${DEFAULT_FX_NAME}`));
store.dispatch(parser.openGrammar(`./assets/HLSL.gr`));

console.log(`%c Is this running in electron.js?: ${isElectron}`, 'background: #222; color: #bada55');
console.log(`%c This is ${isElectron ? 'electron' : 'a web browser'}!!!`, 'background: #222; color: #bada55');
console.log(`%c ver: ${VERSION} (${COMMITHASH}, ${BRANCH}), mode=${MODE}, production=${PRODUCTION}`, 'background: #222; color: #bada55');