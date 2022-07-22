declare function require(moduleName: string): any;

import { isDef } from '@lib/common';
import { defaultSLGrammar } from '@lib/fx/SLParser';
import { depot, parser, s3d } from '@sandbox/actions';
import { App, Preview } from '@sandbox/containers';
import * as ipc from '@sandbox/ipc';
import { LOCATION_NOT_FOUND, LOCATION_PATTERN } from '@sandbox/logic';
import { history } from '@sandbox/reducers/router';
import { store } from '@sandbox/store';
import { ConnectedRouter } from 'connected-react-router';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Route, Switch } from 'react-router';
import { Header, Modal } from 'semantic-ui-react';

require('semantic-ui-less/semantic.less');

function appMain() {
    // fetch filesystem
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
}

function appPreview(name: string) {
    ReactDOM.render(
        <Preview name={ name } />,
        document.getElementById('app')
    );
}

function main() {
    if (ipc.isElectron()) {
        // require('electron-react-devtools').install();
        const argv = ipc.sync.argv();
        switch (argv['runtime'])
        {
            case 'preview':
                appPreview(argv['file']);
                // early exit
                return;
        }

        const projectRoot = argv['project'];
        if (isDef(projectRoot)) {
            store.dispatch(s3d.initEnv(projectRoot));
        }
    } 
    
    appMain();
}

main();

/// <reference path="./webpack.d.ts" />
console.log(`%c Is this running in electron.js?: ${ipc.isElectron()}`, 'background: #222; color: #bada55');
console.log(`%c This is ${ipc.isElectron() ? 'electron' : 'a web browser'}!!!`, 'background: #222; color: #bada55');
console.log(`%c ver: ${VERSION} (${COMMITHASH}, ${BRANCH}), mode=${MODE}, production=${PRODUCTION}, timestamp=${TIMESTAMP}`, 'background: #222; color: #bada55');

