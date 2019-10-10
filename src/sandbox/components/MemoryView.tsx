import { IWithStyles } from '@sandbox/components';
import * as React from 'react';
import injectSheet from 'react-jss';
import { Popup, Table } from 'semantic-ui-react';


export const styles = {
    memoryVal: {
        display: `inline-block`,
        textAlign: `center`,
        zoom: 1
    }
}

export interface IMemoryViewProps extends IWithStyles<typeof styles> {
    binaryData: ArrayBuffer;
    layout: { range: number }[];
}

@injectSheet(styles)
class MemoryView extends React.Component<IMemoryViewProps, {}> {

    render() {
        if (!this.props.binaryData) {
            return null;
        }
        return (
            <Table unstackable fixed style={ { fontFamily: 'consolas', border: '0' } }>
                <Table.Body>
                    { this.renderContent() }
                </Table.Body>
            </Table>
        );
    }


    renderContent() {
        const { props } = this;
        const { binaryData, layout } = props;

        const WIDTH_MAX = 12;
        const u8view = new Uint8Array(binaryData);
        const f32view = new Float32Array(binaryData);
        const i32view = new Int32Array(binaryData);

        let n = 0;

        let rows = [];
        let columns = [];
        let colLen = 0;

        let leftClosed;
        let rightClosed;

        layout.map((section, i) => {
            let written = 0;
            leftClosed = columns.length === 0;
            do {
                const segWidth = Math.min(section.range - written, WIDTH_MAX - colLen);

                const n4 = n >> 2;
                const content = [];
                for (let i = 0; i < segWidth; ++i) {
                    content.push(
                        <div key={ `mvk-d-${n}` }
                            className={ props.classes.memoryVal }
                            style={ { width: `${100 / segWidth}%` } }>
                            { `${u8view[n] < 16 ? '0' : ''}${u8view[n++].toString(16).toUpperCase()}` }
                        </div>);
                    written++;
                }

                rightClosed = written >= section.range;

                const style = {
                    padding: 0,
                    borderLeft: `1px solid ${leftClosed ? '#ccc' : 'transparent'}`,
                    borderRight: `1px solid ${rightClosed ? '#ccc' : 'transparent'}`,
                    borderTop: `${rows.length === 0 ? 1 : 0}px solid #ccc`,
                    borderBottom: `1px solid #ccc`,
                };

                columns.push(
                    <Table.Cell
                        key={ `mvk-tc-${colLen}` }
                        textAlign="center"
                        colSpan={ segWidth }
                        style={ style }>
                        {section.range === 4 &&
                            <Popup inverted
                                content={ <div style={ { fontFamily: 'consolas' } }>f32: {f32view[n4]}<br/>i32: {i32view[n4]}</div> } 
                                trigger={ <span>{content}</span> } />
                        }
                        {section.range !== 4 &&
                            content
                        }
                    </Table.Cell>
                );
                colLen += segWidth;
                leftClosed = false;

                if (n % WIDTH_MAX === 0) {
                    rows.push(<Table.Row key={ `mvk-tc-${rows.length}` }>{ columns }</Table.Row>);
                    columns = [];
                    colLen = 0;
                }
            } while (written < section.range);
        });
        if (columns.length > 0) {
            const csRest = WIDTH_MAX - n % WIDTH_MAX;
            if (csRest !== WIDTH_MAX) {
                columns.push(
                    <Table.Cell
                        key={ `mvk-tc-${colLen}` }
                        textAlign="center"
                        colSpan={ csRest }
                        style={ { padding: 0 } }>
                    </Table.Cell>
                );
            }
            rows.push(<Table.Row key={ `mvk-tc-${rows.length}` }>{ columns }</Table.Row>);
        }
        return rows;
    }
}

export default MemoryView;

