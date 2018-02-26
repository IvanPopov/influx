import * as fs from 'fs';
import * as React from 'react';
import { render } from 'react-dom';
import { connect } from 'react-redux';
import autobind from 'autobind-decorator';
import { Tab, Container, Segment, Grid } from 'semantic-ui-react'

import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { ParserParameters, ASTView } from '../components';
import { common as commonAccessor, mapProps } from '../reducers';
import IStoreState, { IParserParams, IFileState } from '../store/IStoreState';

import AceEditor from 'react-ace';

import 'brace';
import 'brace/mode/c_cpp';
import 'brace/theme/github';

import { IDispatch, sourceCode as sourceActions, mapActions } from '../actions';
import { bindActionCreators } from 'redux';


process.chdir(`${__dirname}/../../`); // making ./build as cwd

class SourceEditor extends React.Component<{ content: string; name?:string, onChange?: (content) => void; }> {
    render() {
        const { props } = this;
        return (
            <AceEditor
            name={ props.name }
            mode="c_cpp"
            theme="github"
            width="100%"
            height="calc(100vh - 75px)" // todo: fixme
            onChange={ props.onChange }
            fontSize={ 12 }
            showPrintMargin={ true }
            showGutter={ true }
            value={ props.content || '' }
            setOptions={ {
                showLineNumbers: true,
                tabSize: 2,
            } } />
        );
    }
}

// todo: remove the inheritance of the type of data
export interface IAppProps extends IStoreState {
    actions: typeof sourceActions;
}

class App extends React.Component<IAppProps> {
    render() {
        const { props } = this;
        const panes = [
            {
                menuItem: 'Source File',
                pane: (
                    <Tab.Pane key="source">
                        <Grid divided={ true }>
                            <Grid.Row columns={ 2 }>
                                <Grid.Column>
                                    <SourceEditor name="source-code" content={ props.sourceFile.content } onChange={ props.actions.setContent } />
                                </Grid.Column>
                                <Grid.Column>
                                    <ASTView parser={ props.parserParams }
                                        source={ { code: props.sourceFile.content, filename: props.sourceFile.filename } } />
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Tab.Pane>
                )
            },
            {
                menuItem: 'Grammar',
                pane: (
                    <Tab.Pane key="grammar">
                        <ParserParameters />
                    </Tab.Pane>
                )
            }
        ];

        return (
            <div>
                <Container style={ { marginTop: '1em' } }>
                    <Tab panes={ panes } renderActiveOnly={ false } />
                </Container>
            </div>
        );
    }
}



export default connect<{}, {}, IAppProps>(mapProps(commonAccessor), mapActions(sourceActions))(App) as any;
