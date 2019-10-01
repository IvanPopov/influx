import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { IWithStyles } from '@sandbox/components';
import * as brace from '@sandbox/deps/brace';
import '@sandbox/deps/brace/ext/language_tools'; // need for ace autocompletions;
import '@sandbox/deps/brace/mode/c_cpp';
// import '@sandbox/deps/brace/theme/github';
import '@sandbox/deps/brace/theme/ambiance';
import AceEditor, { Marker } from '@sandbox/deps/react-ace';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import * as React from 'react';
import { render } from 'react-dom';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { Popup } from 'semantic-ui-react';

// import jss from 'jss';
// import nested from 'jss-nested';
// jss.use(nested());



const AceRange = brace.acequire("ace/range").Range;

export const styles = {
    yellowMarker: {
        backgroundColor: 'yellow',
        opacity: 0.3,
        position: 'absolute'
    },
    // errorMarker: {
    //     // backgroundColor: 'red',
    //     position: 'absolute',
    //     // background: 'url(http://i.imgur.com/HlfA2is.gif) bottom repeat-x'
    //     borderBottom: '1px dotted red'
    // },

    errorMarker: {
        display: 'inline-block',
        position: 'relative',
        '&:before': {
            content: '"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"',
            fontSize: '0.6em',
            fontWeight: '700',
            fontFamily: 'Times New Roman, Serif',
            color: 'red',
            width: '100%',
            position: 'absolute',
            top: '12px',
            left: '-1px',
            overflow: 'hidden',
        }
    },

    breakpoint: {
        background: 'red',
        // borderRadius: '20px 0px 0px 20px',
        // boxShadow: '0px 0px 1px 1px red inset'
    }
}


export interface ISourceEditorProps extends IFileState, IWithStyles<typeof styles> {
    name?: string,

    validateBreakpoint: (line: number) => number;// todo: remove it;

    actions: typeof sourceActions;
}


class DynamicMarker {
    marker: any; // AceRange
    className: string;
    inFront: boolean;
    tooltip: string;
    type: string;

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
        render(<Popup trigger={ proxy } inverted content={ this.tooltip } />, markerElement);
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

    setupMarkers() {
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
        console.log(markers, props.markers);
        return markers;
    }


    get editor(): brace.Editor {
        return (this.refs.aceEditor as any).editor;
    }


    get session(): brace.IEditSession {
        return this.editor.getSession();
    }

    // shouldComponentUpdate(nextProps: ISourceEditorProps, nextState) {
    //     return this.editor.getValue() != nextProps.content;
    // }

    componentDidMount() {

    }

    componentDidUpdate() {
        let { editor, props, session } = this;

        editor.renderer.setShowGutter(true);

        editor.on("guttermousedown", e => {
            var target = e.domEvent.target;

            if (target.className.indexOf("ace_gutter-cell") == -1) {
                return;
            }
            // todo: uncomment this;
            // if (!editor.isFocused()){ 
            //     return;
            // }

            // todo: fix fixed padding;
            if (e.clientX > 25 + target.getBoundingClientRect().left) {
                return;
            }
            var row = e.getDocumentPosition().row;
            var breakpointsArray = editor.session.getBreakpoints();
            if (!(row in breakpointsArray)) {
                editor.session.setBreakpoint(props.validateBreakpoint(row), props.classes.breakpoint);
                props.actions.addBreakpoint(row);
            } else {
                editor.session.clearBreakpoint(row);
                props.actions.removeBreakpoint(row);
            }
            e.stop();
        });

        // editor.on('mousemove', e => {
        //     var position = e.getDocumentPosition();
        //     var token = editor.session.getTokenAt(position.row, position.column);
        //     console.log(token);
        // });

        // session.selection.on('changeCursor', (e, selection) => {
        //     var position = selection.getCursor();
        //     var token = editor.session.getTokenAt(position.row, position.column);
        //     console.log(token);
        // });

        // console.log(this.session.getMode());
        // this.session.getMode().$highlightRules.setFunctionKeywords(['foo', 'bar']) //...


        // var completions = [
        //     { id: 'id1', 'value': 'value1' },
        //     { id: 'id2', 'value': 'value2' }
        // ];

        // var autoCompleter = {
        //     getCompletions: (editor: brace.Editor, session: brace.IEditSession, pos: brace.Position, prefix, callback) => {
        //         console.log(arguments);
        //         if (prefix.length === 0) {
        //             callback(null, []);
        //             return;
        //         }
        //         callback(
        //             null,
        //             completions.map(function (c) {
        //                 return { value: c.id, caption: c.value };
        //             })
        //         );
        //     }
        // };

        // this.editor.setOptions({ 
        //     enableBasicAutocompletion: [ autoCompleter ],
        //     enableLiveAutocompletion: false,
        //     enableSnippets: false
        // });

        
        // (editor.session.$mode as any).$highlightRules.$keywords["partFx"] = "variable.language";
        // (editor.session.$mode as any).$highlightRules.$keywordList.push("partFx");
    }

    render() {
        const { props } = this;
        const { showWhitespaces } = this.state;

        return (
            <div>
                {/* <Form>
                    <Form.Group inline>
                        <Form.Checkbox label='Show whitespaces' value='sm'
                            checked={ showWhitespaces }
                            onChange={ (e, { checked }) => { this.setState({ showWhitespaces: checked }) } }
                        />
                    </Form.Group>
                </Form> */}
                <AceEditor
                    ref="aceEditor"
                    name={ props.name }
                    mode="c_cpp"
                    theme="ambiance"
                    width="100%"
                    height="calc(100vh - 41px)" // todo: fixme
                    onChange={ content => props.actions.setContent(content) }
                    fontSize={ 12 }
                    value={ props.content || '' }
                    markers={ this.setupMarkers() as any }
                    setOptions={ {
                        showInvisibles: showWhitespaces,
                        showLineNumbers: true,
                        tabSize: 4
                    } } />
            </div>
        );
    }
}

export default connect<{}, {}, ISourceEditorProps>(mapProps(getSourceCode), mapActions(sourceActions))(SourceEditor) as any;
