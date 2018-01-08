import autobind from 'autobind-decorator';
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
import { connect } from 'react-redux';
import { Dispatch } from 'react-redux';
import SwipeableViews from 'react-swipeable-views';
import { ParserParameters, TabContainer } from '../components';
import { getGrammarText, getSourceCode } from '../reducers';
import IStoreState from '../store/IStoreState';

// tslint:disable-next-line:no-import-side-effect
import 'codemirror/mode/clike/clike';

process.chdir(`${__dirname}/../../`); // making ./build as cwd

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
}

interface IAppState {
    readonly value: number;
}

class App extends React.Component<IAppProps & WithStyles<'container' | 'div'>, IAppState> {
    state: IAppState = { value: 0 };

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
                                <CodeMirror value={ this.props.sourceCode || '' }
                                    options={ { mode: 'text/x-c++src', lineNumbers: true, theme: 'eclipse' } } />
                            </TabContainer>
                            <div>
                                <Grid container style={ { width: 'auto', margin: 'auto' } }>
                                    <Grid item xs={ 12 } >
                                        <ParserParameters />
                                    </Grid>
                                    <Grid item xs={ 12 } >
                                        <CodeMirror value={ this.props.grammarText || '' }
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

    private handleChangeIndex = (index) => {
        this.setState({ value: index });
    }
}

function mapStateToProps(state: IStoreState) {
    return {
        sourceCode: getSourceCode(state),
        grammarText: getGrammarText(state)
    };
}

export default decorate<{}>(connect<{}, {}, IAppProps>(mapStateToProps, {})(App));
