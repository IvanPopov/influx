import * as React from 'react';
import injectSheet from 'react-jss'

import { Table, TableCell } from 'semantic-ui-react'
import { IWithStyles } from './';

import { IInstruction as IOperation } from '../../lib/idl/bytecode/IInstruction';
import { EOperations } from '../../lib/idl/bytecode/EOperations';

export interface IBytecodeViewProps {
    opList: IOperation[];
}

function minWidth(str: string, len: number = 0, char: string = ' ') {
    for (let i = 0, slen = str.length; i < Math.max(0, len - slen); ++i) {
        str = char + str;
    } 
    return str;
}

const hex4 = (v: number) => `0x${minWidth(v.toString(16), 4, '0')}`;
const addr = (v: number) => `[${hex4(v >>> 0)}]`;

class BytecodeView extends React.Component<IBytecodeViewProps, {}>  {
    render () {
        const { props } = this;
        const { opList } = props;
        
        return (
            // fixed
            <Table size="small" unstackable basic compact style={ { fontFamily: 'consolas' } }>
                <Table.Body>
                    { opList.map((op, i) => this.renderOp(op, i)) }
                </Table.Body>
            </Table>
        );
    }

    renderOp(op: IOperation, i : number) {
        return (
            <Table.Row key={`op-${op.op}-${i}`}>
                <Table.Cell>{ hex4(i) }</Table.Cell>
                <Table.Cell>{ EOperations[op.op] }</Table.Cell>
                <Table.Cell>{ addr(op.dest) }</Table.Cell>
                <Table.Cell>{ op.args.map(v => `${addr(v)} `) }</Table.Cell>
            </Table.Row>
        )
    }
}

export default BytecodeView;