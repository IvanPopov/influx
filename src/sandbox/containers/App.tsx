import * as fs from 'fs';
import * as React from 'react';
import autobind from 'autobind-decorator';
import { render } from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Popup, Form, Tab, Container, Segment, Grid } from 'semantic-ui-react'
import AceEditor, { Marker, Annotation } from 'react-ace';

import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { ParserParameters, ASTView } from '../components';
import { common as commonAccessor, mapProps } from '../reducers';
import IStoreState, { IParserParams, IFileState } from '../store/IStoreState';
import { IDispatch, sourceCode as sourceActions, mapActions } from '../actions';
import { IMarkerRange } from '../actions/ActionTypes';
import { IMap } from '../../lib/idl/IMap';


import { IEditSession } from 'brace';
import 'brace/mode/c_cpp';
import 'brace/theme/github';



process.chdir(`${__dirname}/../../`); // making ./build as cwd


function getMarkerHTML(html, markerLayer, session, config, range, markerClass) {
    let stringBuilder = [];
    // markerLayer.drawTextMarker(stringBuilder, range, markerClass, config);
    markerLayer.drawSingleLineMarker(stringBuilder, range, `${markerClass} ace_start ace_br15`, config);
    return stringBuilder;
}

let parseHTML = str => new DOMParser().parseFromString(str, 'text/html').body.childNodes;

function customUpdateWithOverlay(markerClass: string, markerRange) {
    return (html, markerLayer, session, config) => {
        let markerHTML = getMarkerHTML(html, markerLayer, session, config, markerRange, markerClass);
        let markerElement = parseHTML(markerHTML.join(''))[0] as Element;
        
        let proxy = <div >foo</div>;
        render(proxy, markerElement);
        render(<Popup trigger={ proxy } content='Add users to your feed' />, markerElement);

        // $(markerElement).css('pointer-events', 'auto');
        // Since we have the actual DOM element, we can bind event handlers to it
        // $(markerElement).mouseenter(() => {
        //     this.popup.setState({ show: true });
        // });

        markerElement.appendChild(document.getElementById('test'));
        markerLayer.element.appendChild(markerElement);
    };
}



class SourceEditor extends React.Component<{ content: string; name?: string, onChange?: (content) => void; markers: IMap<IMarkerRange> }> {

    state = {
        showWhitespaces: false
    };

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

    private get aceAnnotations(): Annotation[] {

        return [{
            row: 5,
            column: 5,
            text: 'Example of an annotation.',
            type: 'text'
        }];
    }

    private get editorSession(): IEditSession {
        return (this.refs.aceEditor as any).editor.getSession();
    }

    componentDidMount() {
        // setTimeout(() => {

        let markerLogic = {
            update: null
        };
        markerLogic.update = customUpdateWithOverlay.call(
            markerLogic,
            'text-yellow',
            { start: { row: 1, column: 0 }, end: { row: 1, column: 10 } }
        );

        const marker = this.editorSession.addDynamicMarker(markerLogic, false);
    // }, 2000);
    }

    render() {
        const { props } = this;
        const { showWhitespaces } = this.state;

        return (
            <div>
                <Form>
                    <Form.Group inline>
                        <Form.Checkbox label='Show whitespaces' value='sm'
                            checked={ showWhitespaces }
                            onChange={ (e, { checked }) => { this.setState({ showWhitespaces: checked }) } }
                        />
                    </Form.Group>
                </Form>
                <AceEditor
                    ref="aceEditor"
                    name={ props.name }
                    mode="c_cpp"
                    theme="github"
                    width="100%"
                    height="calc(100vh - 145px)" // todo: fixme
                    onChange={ props.onChange }
                    fontSize={ 12 }
                    value={ props.content || '' }
                    markers={ this.aceMarkers }
                    annotations={ this.aceAnnotations }
                    setOptions={ {
                        showInvisibles: showWhitespaces,
                        showLineNumbers: true,
                        tabSize: 4,
                    } } />
            </div>
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
