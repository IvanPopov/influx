import { defaultSLGrammar } from '@lib/fx/SLParser';
import { parser, s3d, depot } from '@sandbox/actions';
import { App } from '@sandbox/containers';
import { LOCATION_NOT_FOUND, LOCATION_PATTERN } from '@sandbox/logic';
import { history } from '@sandbox/reducers/router';
import { ConnectedRouter } from 'connected-react-router';
import isElectron from 'is-electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux';
import { Route, Switch } from 'react-router';
import { Header, Modal } from 'semantic-ui-react';
import { store } from '@sandbox/store';

require('semantic-ui-less/semantic.less');

if (isElectron()) {
    // require('electron-react-devtools').install();
    const ipc = require('electron').ipcRenderer;
    const argv = ipc.sendSync('argv', {});
    const projectRoot = argv['project'] as string;
    store.dispatch(s3d.initEnv(projectRoot));
}

store.dispatch(depot.update());
// make grammar available for editing
store.dispatch(parser.setGrammar(defaultSLGrammar()));

ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <Switch>
                <Route exact path={LOCATION_NOT_FOUND}>
                    <Modal open basic size='small'>
                        <Header icon='archive' content='Location not found :/' />
                        <Modal.Content>
                        </Modal.Content>
                    </Modal>
                </Route>
                <Route path={LOCATION_PATTERN} component={App} />
            </Switch>
        </ConnectedRouter>
    </Provider>,
    document.getElementById('app')
);

/// <reference path="./webpack.d.ts" />
console.log(`%c Is this running in electron.js?: ${isElectron()}`, 'background: #222; color: #bada55');
console.log(`%c This is ${isElectron() ? 'electron' : 'a web browser'}!!!`, 'background: #222; color: #bada55');
console.log(`%c ver: ${VERSION} (${COMMITHASH}, ${BRANCH}), mode=${MODE}, production=${PRODUCTION}, timestamp=${TIMESTAMP}`, 'background: #222; color: #bada55');
