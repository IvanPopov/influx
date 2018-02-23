import { Tab, Container, Segment, Grid } from 'semantic-ui-react'
import autobind from 'autobind-decorator';
import * as fs from 'fs';
import * as React from 'react';
import * as CodeMirror from 'react-codemirror';
import { render } from 'react-dom';
import { connect } from 'react-redux';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { setSource } from '../actions/index';
import { ParserParameters } from '../components';
import SyntaxTreeView from '../components/SyntaxTreeView';
import { getGrammarText, getParseMode, getParserType, getSourceCode, getSourceFilename } from '../reducers';
import IStoreState from '../store/IStoreState';

// tslint:disable-next-line:no-import-side-effect
import 'codemirror/mode/clike/clike';

process.chdir(`${__dirname}/../../`); // making ./build as cwd

export interface IAppProps {
    sourceFile: { content: string; filename: string; };
    parser: { grammarText: string; mode: EParseMode; type: EParserType; };
    setSource: (content: string) => void;
}

class SourceEditor extends React.Component<{ content: string; onChange: (content) => void; }> {
    render() {
        return (
            <CodeMirror value={ this.props.content }
                options={ { mode: 'text/x-c++src', lineNumbers: true, theme: 'eclipse' } }
                onChange={ this.props.onChange } />
        );
    }
}

class App extends React.Component<IAppProps> {
    render() {
        const panes = [
            {
                menuItem: 'Sources',
                render: () => (
                    <Tab.Pane attached={ false }>
                        <Grid divided={ true }>
                            <Grid.Row columns={ 2 }>
                                <Grid.Column>
                                    <SourceEditor content={ this.props.sourceFile.content } onChange={ this.props.setSource } />
                                </Grid.Column>
                                <Grid.Column>
                                    <SyntaxTreeView parser={ this.props.parser }
                                        source={ { code: this.props.sourceFile.content, filename: this.props.sourceFile.filename } } />
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Tab.Pane>
                )
            },
            {
                menuItem: 'Grammar',
                render: () => (
                    <Tab.Pane attached={ false }>
                        <Grid>
                            <Grid.Row columns={ 1 }>
                                <Grid.Column>
                                    <ParserParameters />
                                </Grid.Column>
                            </Grid.Row>
                            <Grid.Row columns={ 1 }>
                                <Grid.Column>
                                    <CodeMirror value={ this.props.parser.grammarText || '' }
                                        options={ { lineNumbers: true, theme: 'eclipse' } } />
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Tab.Pane>
                )
            },
            {
                menuItem: 'Debug',
                render: () => (
                    <Tab.Pane attached={ false } >todo</Tab.Pane>
                )
            },
        ];

        return (
            <div>
                <Container style={ { marginTop: '1em' } }>
                    <Tab menu={ { secondary: false, pointing: false } } panes={ panes } />
                </Container>
            </div>
        );
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

export default connect<{}, {}, IAppProps>(mapStateToProps, { setSource })(App) as any;
