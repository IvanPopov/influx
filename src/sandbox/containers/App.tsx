import * as fs from 'fs';
import * as React from 'react';
import autobind from 'autobind-decorator';
import { render } from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Label, Popup, Form, Tab, Container, Segment, Grid } from 'semantic-ui-react'
import injectSheet from 'react-jss'

import { EParseMode, EParserType, IRange } from '../../lib/idl/parser/IParser';
import { ParserParameters, ASTView, IWithStyles } from '../components';
import { getCommon, mapProps } from '../reducers';
import IStoreState, { IParserParams, IFileState } from '../store/IStoreState';
import { IDispatch, sourceCode as sourceActions, mapActions } from '../actions';
import { IMap } from '../../lib/idl/IMap';

// import from submodules
import AceEditor, { Marker, Annotation } from '../deps/react-ace';
import * as brace from '../deps/brace';
import '../deps/brace/mode/c_cpp';
import '../deps/brace/theme/github';

const AceRange = brace.acequire("ace/range").Range;


process.chdir(`${__dirname}/../../`); // making ./build as cwd

const styles = {
    yellowMarker: {
        backgroundColor: 'yellow',
        position: 'absolute'
    }
}


interface ISourceEditorProps extends IWithStyles<typeof styles> {
    content: string;
    name?: string,
    onChange?: (content) => void;
    markers: IMap<IRange>
}


// class MarkerProxy extends React.Component {
//     componentDidMount() {
//         this.props.onMouseEnter
//     }
//     render() {
//         return <div style={ { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }></div>;
//     }
// }

class DynamicMarker {
    marker: any; // AceRange
    className: string;
    inFront: boolean;

    constructor(range, className: string) {
        this.marker = range;
        this.className = className;
        this.inFront = false;
    }


    update(html, markerLayer, session, config) {
        let markerElement = this.getMarker(html, markerLayer, session, config) as HTMLDivElement;

        // let proxy = <MarkerProxy />;
        const proxy = <div style={ { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }></div>;

        render(proxy, markerElement);
        render(<Popup trigger={ proxy } content='Add users to your feed' />, markerElement);
        markerElement.style.pointerEvents = 'auto';
        markerLayer.element.appendChild(markerElement);
    }

    private getMarker(html, markerLayer, session, config): Element {
        const { marker, className } = this;
        let stringBuilder = [];

        if (marker.isMultiLine()) {
            markerLayer.drawTextMarker(stringBuilder, marker, className, config);
        }
        else {
            markerLayer.drawSingleLineMarker(stringBuilder, marker, `${className} ace_start ace_br15`, config);
        }

        return (new DOMParser()).parseFromString(stringBuilder.join(''), 'text/html').body.firstChild as Element;
    }
}

@injectSheet(styles)
class SourceEditor extends React.Component<ISourceEditorProps> {

    state = {
        showWhitespaces: false
    };

    private get aceMarkers() {
        const { props } = this;
        let markers: Marker[] = [];
        for (let key in props.markers) {
            let range = props.markers[ key ];
            let marker: Marker = {
                startRow: range.start.line,
                startCol: range.start.column,
                endRow: range.end.line,
                endCol: range.end.column,
                type: 'text',
                className: props.classes.yellowMarker
            }
            markers.push(marker);
        }
        (markers as any).push(new DynamicMarker(new AceRange(0, 0, 0, 10), this.props.classes.yellowMarker));
        return markers;
    }

    private get aceAnnotations(): Annotation[] {

        return [ {
            row: 5,
            column: 5,
            text: 'Example of an annotation.',
            type: 'text'
        } ];
    }


    private get editor(): brace.Editor {
        return (this.refs.aceEditor as any).editor;
    }


    private get editorSession(): brace.IEditSession {
        return this.editor.getSession();
    }

    componentDidMount() {
        // this.editorSession.addDynamicMarker(new DynamicMarker(new Range(0, 0, 0, 10), this.props.classes.yellowMarker), false);
    }

    componentDidUpdate() {
        // this.editorSession.addDynamicMarker(new DynamicMarker(new Range(0, 0, 0, 10), this.props.classes.yellowMarker), false);
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



export default connect<{}, {}, IAppProps>(mapProps(getCommon), mapActions(sourceActions))(App) as any;
