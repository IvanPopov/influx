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

const hex2 = (v: number) => `0x${minWidth(v.toString(16), 2, '0')}`;
const hex4 = (v: number) => `0x${minWidth(v.toString(16), 4, '0')}`;
const reg = (v: number) => `[${hex2(v >>> 0)}]`;    // register address;
const addr = (v: number) => `%${hex4(v >>> 0)}%`;   // global memory address;

class BytecodeView extends React.Component<IBytecodeViewProps, {}>  {

    state = {
        count: 0
    };

    componentWillReceiveProps() {
        this.setState({ count: 0 });
    }

    render () {
        const { props } = this;
        const { opList } = props;
        
        return (
            // fixed
            <Table size="small" unstackable basic compact style={ { fontFamily: 'consolas' } }>
                <Table.Body>
                    { opList.map((op, i) => this.renderOp(op)) }
                </Table.Body>
            </Table>
        );
    }

    renderOp(op: IOperation) {
        switch (op.code) {
            case EOperations.k_Load:
                return this.renderOpInternal(op.code, op.dest, [addr(op.args[0]), String(op.args[1])]);
            case EOperations.k_Add:
                return this.renderOpInternal(op.code, op.dest, op.args.map(v => reg(v)));
            default:
                return this.renderOpInternal(op.code, op.dest, op.args.map(v => `${hex4(v)}`));
        }
    }

    
    renderOpInternal(code: EOperations, dest: number, args: string[]) {
        let i = this.state.count++;
        return (
            <Table.Row key={`op-${code}-${i}`}>
                <Table.Cell>{ hex4(i) }</Table.Cell>
                <Table.Cell>{ EOperations[code].substr(2).toLowerCase() }</Table.Cell>
                <Table.Cell>{ reg(dest) }</Table.Cell>
                <Table.Cell>{ args.join(' ') }</Table.Cell>
            </Table.Row>
        );
    }
}

export default BytecodeView;