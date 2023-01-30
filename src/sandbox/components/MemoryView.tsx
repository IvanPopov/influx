import { CBUFFER0_REGISTER, IBCDocument } from '@lib/fx/bytecode/Bytecode';
import * as React from 'react';
import withStyles, { WithStylesProps } from 'react-jss';
import { Popup, Table } from 'semantic-ui-react';
import * as VM from '@lib/fx/bytecode/VM';

export const styles = {
    memoryVal: {
        display: `inline-block`,
        textAlign: `center`,
        zoom: 1
    }
};

export interface IMemoryViewProps extends WithStylesProps<typeof styles> {
    bcDocumnet: IBCDocument;
}

class MemoryView extends React.Component<IMemoryViewProps, {}> {

    render() {
        if (!this.props.bcDocumnet.program) {
            return null;
        }
        return (
            <Table unstackable fixed style={ { fontFamily: 'consolas, monospace', border: '0' } }>
                <Table.Body>
                    { this.renderContent() }
                </Table.Body>
            </Table>
        );
    }


    renderContent(): JSX.Element[] {
        const { props } = this;
        const bundle = VM.make(`[memory-view]`, props.bcDocumnet.program.code);

        if (!bundle) {
            console.error(`could not create bundle`);
            return null;
        }

        // temp hack to fix problem with unset CBUFFER0_REGISTER input if wasm bundle is used
        // without it bundle.getInput(CBUFFER0_REGISTER) return no input
        bundle.setConstant("[dummy]", new Uint8Array());

        const binaryData = VM.memoryToU8Array(bundle.getInput(CBUFFER0_REGISTER));
        const layout = bundle.getLayout();

        const WIDTH_MAX = 12;
        const u8view = new Uint8Array(binaryData.buffer, binaryData.byteOffset, binaryData.byteLength);
        // const f32view = new Float32Array(binaryData.buffer, binaryData.byteOffset, binaryData.byteLength);
        // const i32view = new Int32Array(binaryData.buffer, binaryData.byteOffset, binaryData.byteLength);

        let n = 0;

        let rows: JSX.Element[] = [];
        let columns: JSX.Element[] = [];

        let colLen = 0;

        let bLeftClosed: boolean;
        let bRightClosed: boolean;

        layout.map((constant, i) => {
            let written = 0;
            bLeftClosed = columns.length === 0;
            do {
                const segWidth = Math.min(constant.size - written, WIDTH_MAX - colLen);

                const n4 = n >> 2;
                const content = [];
                for (let i = 0; i < segWidth; ++i) {
                    content.push(
                        <div key={ `mvk-d-${n}` }
                            className={ `${props.classes.memoryVal}` }
                            style={ { width: `${100 / segWidth}%` } }>
                            { `${u8view[n] < 16 ? '0' : ''}${u8view[n++].toString(16).toUpperCase()}` }
                        </div>);
                    written++;
                }

                bRightClosed = written >= constant.size;

                const style = {
                    padding: 0,
                    borderLeft: `1px solid ${bLeftClosed ? '#ccc' : 'transparent'}`,
                    borderRight: `1px solid ${bRightClosed ? '#ccc' : 'transparent'}`,
                    borderTop: `${rows.length === 0 ? 1 : 0}px solid #ccc`,
                    borderBottom: `1px solid #ccc`,
                };

                columns.push(
                    <Table.Cell
                        key={ `mvk-tc-${colLen}` }
                        textAlign="center"
                        colSpan={ segWidth }
                        style={ style }>
                        {/* {['f32', 'i32'].indexOf(constant.type) !== -1 &&
                            <Popup inverted
                                content={ <div style={ { fontFamily: 'consolas, monospace' } }>f32: {f32view[n4]}<br/>i32: {i32view[n4]}</div> }
                                trigger={ <span>{content}</span> } />
                        } */}
                        {/* {['uniform'].indexOf(constant.type) !== -1 &&
                            <Popup inverted
                                content={ <div style={ { fontFamily: 'consolas, monospace' } }>{constant.value}</div> }
                                trigger={ <span style={ { opacity: 0.5 } }>{content}</span> } />
                        } */}
                        {/* {['unknown'].indexOf(constant.type) !== -1 &&
                            content
                        } */}
                        <Popup inverted={ true }
                                content={ <div style={ { fontFamily: 'consolas, monospace' } }>{constant.name}</div> }
                                trigger={ <span style={ { opacity: 0.5 } }>{content}</span> } />
                    </Table.Cell>
                );
                colLen += segWidth;
                bLeftClosed = false;

                if (n % WIDTH_MAX === 0) {
                    rows.push(<Table.Row key={ `mvk-tc-${rows.length}` }>{ columns }</Table.Row>);
                    columns = [];
                    colLen = 0;
                }
            } while (written < constant.size);
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

export default withStyles(styles)(MemoryView);

