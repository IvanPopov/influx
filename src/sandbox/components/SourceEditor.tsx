import autobind from 'autobind-decorator';
import * as React from 'react';
import { render } from 'react-dom';
import injectSheet from 'react-jss'
import { Label, Popup, Form, Tab, Container, Segment, Grid } from 'semantic-ui-react'

// import from submodules
import AceEditor, { Marker, Annotation } from '../deps/react-ace';
import * as brace from '../deps/brace';
import '../deps/brace/mode/c_cpp';
import '../deps/brace/theme/github';

import { ParserParameters, ASTView, IWithStyles } from '../components';
import IStoreState, { IParserParams, IFileState, IMarker } from '../store/IStoreState';
import { IMap } from '../../lib/idl/IMap';

const AceRange = brace.acequire("ace/range").Range;

export const styles = {
    yellowMarker: {
        backgroundColor: 'yellow',
        position: 'absolute'
    },
    errorMarker: {
        // backgroundColor: 'red',
        position: 'absolute',
        background: 'url(http://i.imgur.com/HlfA2is.gif) bottom repeat-x'
    }
}


export interface ISourceEditorProps extends IWithStyles<typeof styles> {
    content: string;
    name?: string,
    onChange?: (content) => void;
    markers: IMap<IMarker>
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
    tooltip: string;

    constructor(range, className: string, tooltip: string) {
        this.marker = range;
        this.className = className;
        this.inFront = false;
        this.tooltip = tooltip;
    }

    update(html, markerLayer, session, config) {
        let markerElement = this.getMarker(html, markerLayer, session, config) as HTMLDivElement;

        // let proxy = <MarkerProxy />;
        const proxy = <div style={ { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } }></div>;

        render(proxy, markerElement);
        render(<Popup trigger={ proxy } content={ this.tooltip } />, markerElement);
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
        const { classes } = props;

        const types = {
            marker: classes.yellowMarker,
            error: classes.errorMarker
        };

        let markers: Array<Marker | DynamicMarker> = [];
        for (let key in props.markers) {
            let { range, type, tooltip, range: { start, end } } = props.markers[key];

            if (!tooltip) {
                markers.push({
                    startRow: start.line,
                    startCol: start.column,
                    endRow: end.line,
                    endCol: end.column,
                    type: 'text',
                    className: types[type]
                });
            } else {
                markers.push(new DynamicMarker(
                    new AceRange(start.line, start.column, end.line, end.column),
                    types[type],
                    tooltip
                ));
            }
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
                    height="calc(100vh - 140px)" // todo: fixme
                    onChange={ props.onChange }
                    fontSize={ 12 }
                    value={ props.content || '' }
                    markers={ this.aceMarkers as any }
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

export default SourceEditor;