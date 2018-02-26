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

import AceEditor, { Marker } from 'react-ace';

import 'brace';
import 'brace/mode/c_cpp';
import 'brace/theme/github';

import { IDispatch, sourceCode as sourceActions, mapActions } from '../actions';
import { bindActionCreators } from 'redux';
import { IMarkerRange } from '../actions/ActionTypes';
import { IMap } from '../../lib/idl/IMap';


process.chdir(`${__dirname}/../../`); // making ./build as cwd

class SourceEditor extends React.Component<{ content: string; name?:string, onChange?: (content) => void; markers: IMap<IMarkerRange> }> {

    private get aceMarkers() {
        const { props } = this;
        let markers: Marker[] = [];
        for (let key in props.markers) {
            let range = props.markers[key];
            let marker: Marker = {
                startRow: range.start.line,
                startCol: range.start.column,
                endRow: range.end.line,
                endCol: range.end.column,
                type: 'text',
                className: 'text-yellow'
            }
            markers.push(marker);
        }
        return markers;
    }

    render() {
        const { props } = this;

        return (
            <AceEditor
            name={ props.name }
            mode="c_cpp"
            theme="github"
            width="100%"
            height="calc(100vh - 115px)" // todo: fixme
            onChange={ props.onChange }
            fontSize={ 12 }
            value={ props.content || '' }
            markers = { this.aceMarkers }
            setOptions={ {
                showInvisibles: true,
                showLineNumbers: true,
                tabSize: 4,
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
                                    <SourceEditor name="source-code" content={ props.sourceFile.content } onChange={ props.actions.setContent } markers={ props.sourceFile.markers } />
                                </Grid.Column>
                                <Grid.Column>
                                    <ASTView />
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
                <Container 
                    // style={ { marginTop: '1em' } }
                >
                    <Tab menu={ { secondary: true, pointing: true } } panes={ panes } renderActiveOnly={ false } />
                </Container>
            </div>
        );
    }
}



export default connect<{}, {}, IAppProps>(mapProps(commonAccessor), mapActions(sourceActions))(App) as any;
