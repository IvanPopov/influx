import Preview from '@sandbox/containers/Preview';
import * as ipc from '@sandbox/ipc';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

require('semantic-ui-less/semantic.less');

const { file } = ipc.sync.argv();

ReactDOM.render(
    <Preview name={ file } />,
    document.getElementById('app')
);

