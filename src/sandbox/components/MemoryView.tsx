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
            <Table unstackable fixed style={{ fontFamily: 'consolas' }}>
                <Table.Body>
                    { this.renderContent() }
                </Table.Body>
            </Table>
        );
    }


    renderContent() {
        const { props } = this;
        const { binaryData, layout } = props;

        const WIDTH_MAX = 8;
        const u8view = new Uint8Array(binaryData);

        let n = 0;
        
        let rows = [];
        let columns = [];

        let leftClosed;
        let rightClosed;

        layout.map((section, i) => {
            let written = 0;
            leftClosed = columns.length == 0;
            do {
                let segWidth = Math.min(section.range - written, WIDTH_MAX - columns.length);
                
                let content = [];
                for (let i = 0; i < segWidth; ++ i) {
                    content.push(<div className={ props.classes.memoryVal } 
                        style={ { width: `${100 / segWidth}%` } }>{`${u8view[n] < 16? '0': ''}${ u8view[n++].toString(16).toUpperCase() }`}</div>);
                    written ++;
                }
                rightClosed = written >= section.range;

                let style = {
                    padding: 0,
                    borderLeft: `1px solid ${leftClosed? '#a7a7a7': 'transparent'}`,
                    borderRight: `1px solid ${rightClosed? '#a7a7a7': 'transparent'}`,
                    borderTop: `${rows.length == 0? 1: 0}px solid #a7a7a7`,
                    borderBottom: `1px solid #a7a7a7`,
                }

                columns.push(<Table.Cell textAlign="center" colSpan={ segWidth } style={style}>{ content }</Table.Cell>);
                leftClosed = false;

                if (n % WIDTH_MAX == 0) {
                    rows.push(<Table.Row>{ columns }</Table.Row>);
                    columns = [];
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
        console.log(rows);
        return rows;
    }
}

export default MemoryView;

