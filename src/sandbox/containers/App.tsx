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
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { setSource } from '../actions/index';
import { ParserParameters, TabContainer } from '../components';
import SyntaxTreeView from '../components/SyntaxTreeView';
import { getGrammarText, getParseMode, getParserType, getSourceCode, getSourceFilename } from '../reducers';
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
    readonly sourceFile: {
        readonly content: string;
        readonly filename: string;
    };
    readonly parser: {
        readonly grammarText: string;
        readonly mode: EParseMode;
        readonly type: EParserType;
    };
    readonly setSource: (content: string) => void;
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
                                <Tab label='Debug' disabled />
                            </Tabs>
                        </AppBar>
                        <SwipeableViews
                            axis={ 'x' }
                            index={ this.state.value }
                            onChangeIndex={ this.handleChangeIndex }
                        >
                            <TabContainer dir='ltr'>
                                <Grid container style={ { width: 'auto', margin: 'auto' } }>
                                    <Grid item xs={ 6 } >
                                        <CodeMirror value={ this.props.sourceFile.content || '' }
                                            options={ { mode: 'text/x-c++src', lineNumbers: true, theme: 'eclipse' } } 
                                            onChange={ this.props.setSource } />
                                    </Grid>
                                    <Grid item xs={ 6 } >
                                        <SyntaxTreeView parser={ this.props.parser } 
                                            source={ { code: this.props.sourceFile.content, filename: this.props.sourceFile.filename } } />
                                    </Grid>
                                </Grid>
                            </TabContainer>
                            <div>
                                <Grid container style={ { width: 'auto', margin: 'auto' } }>
                                    <Grid item xs={ 12 } >
                                        <ParserParameters />
                                    </Grid>
                                    <Grid item xs={ 12 } >
                                        <CodeMirror value={ this.props.parser.grammarText || '' }
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
        sourceFile: {
            content: getSourceCode(state),
            filename: getSourceFilename(state)
        },
        parser: {
            grammarText: getGrammarText(state),
            mode: getParseMode(state),
            type: getParserType(state)
        }
    };
}

export default decorate<{}>(connect<{}, {}, IAppProps>(mapStateToProps, { setSource })(App));
