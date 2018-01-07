import autobind from 'autobind-decorator';
import { ipcRenderer as AppDispatcher } from 'electron';
import * as fs from 'fs';
import AppBar from 'material-ui/AppBar';
import Grid from 'material-ui/Grid';
import Paper from 'material-ui/Paper';
import { StyledComponentProps, WithStyles, withStyles } from 'material-ui/styles';
import Tabs, { Tab } from 'material-ui/Tabs';
import Typography from 'material-ui/Typography';
import * as React from 'react';
import * as CodeMirror from 'react-codemirror';
import { render } from 'react-dom';
import SwipeableViews from 'react-swipeable-views';
import { ParserParameters, TabContainer } from './components';

// tslint:disable-next-line:no-import-side-effect
import 'codemirror/mode/clike/clike';

process.chdir(`${__dirname}/../`); // making ./build as cwd

const decorate = withStyles(theme => ({
    div: {
        width: 'auto'
    },
    container: {
        width: 'auto',
        margin: 'auto'
    }
}));

interface IAppProps {
    readonly sourceCode: string;
    readonly grammarText: string;
    readonly value: number;
}

class App extends React.Component<IAppProps & WithStyles<'container' | 'div'>> {
    state: IAppProps = {
        value: 0,
        sourceCode: '',
        grammarText: ''
    };

    componentDidMount() {
        AppDispatcher.on('source-loaded', this.sourceLoaded);
        AppDispatcher.on('grammar-loaded', this.grammarLoaded);
        AppDispatcher.send('app-rendered');
    }

    componentWillUnmount() {
        AppDispatcher.removeListener('source-loaded', this.sourceLoaded);
        AppDispatcher.removeListener('grammar-loaded', this.grammarLoaded);
    }

    render() {
        return (
            <Grid container style={ { width: 'auto', margin: 'auto' } }>
                <Grid item xs={ 12 } >
                    <div style={ { width: 'auto' } }>
                        <AppBar position='static' color='default'>
                            <Tabs
                                value={ this.state.value }
                                onChange={ this.handleChange }
                                indicatorColor='primary'
                                textColor='primary'
                                fullWidth
                            >
                                <Tab label='Sources' />
                                <Tab label='Grammar' />
                                <Tab label='Debug' />
                            </Tabs>
                        </AppBar>
                        <SwipeableViews
                            axis={ 'x' }
                            index={ this.state.value }
                            onChangeIndex={ this.handleChangeIndex }
                        >
                            <TabContainer dir='ltr'>
                                <CodeMirror value={ this.state.sourceCode }
                                    options={ { mode: 'text/x-c++src', lineNumbers: true, theme: 'eclipse' } } />
                            </TabContainer>
                            <div>
                                <Grid container style={ { width: 'auto', margin: 'auto' } }>
                                    <Grid item xs={ 12 } >
                                        <ParserParameters />
                                    </Grid>
                                    <Grid item xs={ 12 } >
                                        <CodeMirror value={ this.state.grammarText }
                                            options={ { lineNumbers: true, theme: 'eclipse' } } />
                                    </Grid>
                                </Grid>
                            </div>
                            <TabContainer dir='ltr'>Item Three</TabContainer>
                        </SwipeableViews>
                    </div>
                </Grid>
            </Grid>
        );
    }

    private handleChange = (event, value) => {
        this.setState({ value });
    }

    private handleChangeIndex = index => {
        this.setState({ value: index });
    }

    @autobind
    private sourceLoaded() {
        this.setState({ sourceCode: fs.readFileSync('./assets/fx/example.fx', 'utf8') });
    }

    @autobind
    private grammarLoaded() {
        this.setState({ grammarText: fs.readFileSync('./assets/HLSL.gr', 'utf8') });
    }
}

const AppStyled = decorate<{}>(App);
render(<AppStyled />, document.querySelector('#app'));
