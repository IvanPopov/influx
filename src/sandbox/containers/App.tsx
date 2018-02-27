import * as fs from 'fs';
import * as React from 'react';
import autobind from 'autobind-decorator';
import { render } from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Popup, Form, Tab, Container, Segment, Grid } from 'semantic-ui-react'
import injectSheet from 'react-jss'

import { EParseMode, EParserType, IRange } from '../../lib/idl/parser/IParser';
import { ParserParameters, ASTView, IWithStyles } from '../components';
import { common as commonAccessor, mapProps } from '../reducers';
import IStoreState, { IParserParams, IFileState } from '../store/IStoreState';
import { IDispatch, sourceCode as sourceActions, mapActions } from '../actions';
import { IMap } from '../../lib/idl/IMap';

// import from submodules
import AceEditor, { Marker, Annotation } from '../deps/react-ace';
import { IEditSession, Editor } from '../deps/brace';
import '../deps/brace/mode/c_cpp';
import '../deps/brace/theme/github';



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


class Range {
    start: { row: number, column: number };
    end: { row: number, column: number };
    constructor(startRow, startColumn, endRow, endColumn) {
        this.start = {
            row: startRow,
            column: startColumn
        };

        this.end = {
            row: endRow,
            column: endColumn
        };
    }

    isEqual(range) {
        return this.start.row === range.start.row &&
            this.end.row === range.end.row &&
            this.start.column === range.start.column &&
            this.end.column === range.end.column;
    };
    toString() {
        return ("Range: [" + this.start.row + "/" + this.start.column +
            "] -> [" + this.end.row + "/" + this.end.column + "]");
    };

    contains(row, column) {
        return this.compare(row, column) == 0;
    };
    compareRange(range) {
        var cmp,
            end = range.end,
            start = range.start;

        cmp = this.compare(end.row, end.column);
        if (cmp == 1) {
            cmp = this.compare(start.row, start.column);
            if (cmp == 1) {
                return 2;
            } else if (cmp == 0) {
                return 1;
            } else {
                return 0;
            }
        } else if (cmp == -1) {
            return -2;
        } else {
            cmp = this.compare(start.row, start.column);
            if (cmp == -1) {
                return -1;
            } else if (cmp == 1) {
                return 42;
            } else {
                return 0;
            }
        }
    };
    comparePoint(p) {
        return this.compare(p.row, p.column);
    };
    containsRange(range) {
        return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
    };
    intersects(range) {
        var cmp = this.compareRange(range);
        return (cmp == -1 || cmp == 0 || cmp == 1);
    };
    isEnd(row, column) {
        return this.end.row == row && this.end.column == column;
    };
    isStart(row, column) {
        return this.start.row == row && this.start.column == column;
    };
    setStart(row, column) {
        if (typeof row == "object") {
            this.start.column = row.column;
            this.start.row = row.row;
        } else {
            this.start.row = row;
            this.start.column = column;
        }
    };
    setEnd(row, column) {
        if (typeof row == "object") {
            this.end.column = row.column;
            this.end.row = row.row;
        } else {
            this.end.row = row;
            this.end.column = column;
        }
    };
    inside(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column) || this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    insideStart(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    insideEnd(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    compare(row, column) {
        if (!this.isMultiLine()) {
            if (row === this.start.row) {
                return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
            }
        }

        if (row < this.start.row)
            return -1;

        if (row > this.end.row)
            return 1;

        if (this.start.row === row)
            return column >= this.start.column ? 0 : -1;

        if (this.end.row === row)
            return column <= this.end.column ? 0 : 1;

        return 0;
    };
    compareStart(row, column) {
        if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };
    compareEnd(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else {
            return this.compare(row, column);
        }
    };
    compareInside(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };
    clipRows(firstRow, lastRow) {
        if (this.end.row > lastRow)
            var end = { row: lastRow + 1, column: 0 };
        else if (this.end.row < firstRow)
            var end = { row: firstRow, column: 0 };

        if (this.start.row > lastRow)
            var start = { row: lastRow + 1, column: 0 };
        else if (this.start.row < firstRow)
            var start = { row: firstRow, column: 0 };

        return Range.fromPoints(start || this.start, end || this.end);
    };
    extend(row, column) {
        var cmp = this.compare(row, column);

        if (cmp == 0)
            return this;
        else if (cmp == -1)
            var start = { row: row, column: column };
        else
            var end = { row: row, column: column };

        return Range.fromPoints(start || this.start, end || this.end);
    };

    isEmpty() {
        return (this.start.row === this.end.row && this.start.column === this.end.column);
    };
    isMultiLine() {
        return (this.start.row !== this.end.row);
    };
    clone() {
        return Range.fromPoints(this.start, this.end);
    };
    collapseRows() {
        if (this.end.column == 0)
            return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row - 1), 0);
        else
            return new Range(this.start.row, 0, this.end.row, 0);
    };
    toScreenRange(session) {
        var screenPosStart = session.documentToScreenPosition(this.start);
        var screenPosEnd = session.documentToScreenPosition(this.end);

        return new Range(
            screenPosStart.row, screenPosStart.column,
            screenPosEnd.row, screenPosEnd.column
        );
    };
    moveBy(row, column) {
        this.start.row += row;
        this.start.column += column;
        this.end.row += row;
        this.end.column += column;
    };

    static fromPoints(start, end) {
        return new Range(start.row, start.column, end.row, end.column);
    }

    static comparePoints(p1, p2) {
        return p1.row - p2.row || p1.column - p2.column;
    }

};


class DynamicMarker {
    range2: Range;
    className: string;

    constructor(range: Range, className: string) {
        this.range2 = range;
        this.className = className;
    }


    update(html, markerLayer, session, config) {
        let markerElement = this.getMarker(html, markerLayer, session, config);
        // let proxy = <div >foo</div>;
        // render(proxy, markerElement);
        // render(<Popup trigger={proxy} content='Add users to your feed' />, markerElement);

        // $(markerElement).css('pointer-events', 'auto');
        // Since we have the actual DOM element, we can bind event handlers to it
        // $(markerElement).mouseenter(() => {
        //     this.popup.setState({ show: true });
        // });

        // markerElement.appendChild(document.getElementById('test'));
        markerLayer.element.appendChild(markerElement);
    }

    private getMarker(html, markerLayer, session, config): Node {
        const { range2, className } = this;
        let stringBuilder = [];

        if (range2.isMultiLine()) {
            markerLayer.drawTextMarker(stringBuilder, range2, className, config);
        }
        else {
            markerLayer.drawSingleLineMarker(stringBuilder, range2, `${className} ace_start ace_br15`, config);
        }

        return (new DOMParser()).parseFromString(stringBuilder.join(''), 'text/html').body.firstChild;
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
            let range = props.markers[key];
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
        (markers as any).push(new DynamicMarker(new Range(0, 0, 0, 10), this.props.classes.yellowMarker));
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


    private get editor(): Editor {
        return (this.refs.aceEditor as any).editor;
    }


    private get editorSession(): IEditSession {
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
                            checked={showWhitespaces}
                            onChange={(e, { checked }) => { this.setState({ showWhitespaces: checked }) }}
                        />
                    </Form.Group>
                </Form>
                <AceEditor
                    ref="aceEditor"
                    name={props.name}
                    mode="c_cpp"
                    theme="github"
                    width="100%"
                    height="calc(100vh - 145px)" // todo: fixme
                    onChange={props.onChange}
                    fontSize={12}
                    value={props.content || ''}
                    markers={this.aceMarkers}
                    annotations={this.aceAnnotations}
                    setOptions={{
                        showInvisibles: showWhitespaces,
                        showLineNumbers: true,
                        tabSize: 4,
                    }} />
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
                        <Grid divided={true}>
                            <Grid.Row columns={2}>
                                <Grid.Column>
                                    <SourceEditor name="source-code" content={props.sourceFile.content} onChange={props.actions.setContent} markers={props.sourceFile.markers} />
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
                    <Tab menu={{ secondary: true, pointing: true }} panes={panes} renderActiveOnly={false} />
                </Container>
            </div>
        );
    }
}



export default connect<{}, {}, IAppProps>(mapProps(commonAccessor), mapActions(sourceActions))(App) as any;
