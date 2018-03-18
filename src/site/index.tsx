import * as React from 'react';
import { render } from 'react-dom';
import {  } from 'semantic-ui-react'
// import injectSheet from 'react-jss'

type Component<T> = React.StatelessComponent<T>;

const App = () => {
    return (
        <div>
            hello!!!
        </div>
    )
};


render(<App />, document.body);