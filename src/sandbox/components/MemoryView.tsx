import * as React from 'react';
import injectSheet from 'react-jss'

import { Table } from 'semantic-ui-react'
import { IWithStyles } from './';

export const styles = {
    memoryVal: {
        display: `inline-block`,
        textAlign: `center`,
        zoom: 1
    }
}

export interface IMemoryViewProps extends IWithStyles<typeof styles> {
    binaryData: ArrayBuffer;
    layout: { range: number } [];
}

@injectSheet(styles)
class MemoryView extends React.Component<IMemoryViewProps, {}> {

    render() {
        return (
            <Table unstackable fixed style={{ fontFamily: 'consolas', border: '0' }}>
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

        let n = 0;
        
        let rows = [];
        let columns = [];
        let colLen = 0;

        let leftClosed;
        let rightClosed;

        layout.map((section, i) => {
            let written = 0;
            leftClosed = columns.length == 0;
            do {
                let segWidth = Math.min(section.range - written, WIDTH_MAX - colLen);
                
                let content = [];
                for (let i = 0; i < segWidth; ++ i) {
                    content.push(<div key={`mvk-d-${n}`} className={ props.classes.memoryVal } 
                        style={ { width: `${100 / segWidth}%` } }>{`${u8view[n] < 16? '0': ''}${ u8view[n++].toString(16).toUpperCase() }`}</div>);
                    written ++;
                }
                rightClosed = written >= section.range;

                let style = {
                    padding: 0,
                    borderLeft: `1px solid ${leftClosed? '#ccc': 'transparent'}`,
                    borderRight: `1px solid ${rightClosed? '#ccc': 'transparent'}`,
                    borderTop: `${rows.length == 0? 1: 0}px solid #ccc`,
                    borderBottom: `1px solid #ccc`,
                }

                columns.push(<Table.Cell key={`mvk-tc-${colLen}`} textAlign="center" colSpan={ segWidth } style={style}>{ content }</Table.Cell>);
                colLen += segWidth;
                leftClosed = false;

                if (n % WIDTH_MAX == 0) {
                    rows.push(<Table.Row key={`mvk-tc-${rows.length}`}>{ columns }</Table.Row>);
                    columns = [];
                    colLen = 0;
                }
            } while (written < section.range);
        });
        if (columns.length > 0) {
            let csRest = WIDTH_MAX - n % WIDTH_MAX;
            if (csRest != WIDTH_MAX) {
                columns.push(<Table.Cell textAlign="center" colSpan={ csRest } style={{padding: 0}}></Table.Cell>);
            }
            rows.push(<Table.Row>{ columns }</Table.Row>);
        }
        return rows;
    }
}

export default MemoryView;

