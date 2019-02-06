import * as React from 'react';
import injectSheet from 'react-jss'

import { Table, Button, Icon } from 'semantic-ui-react'
import { IWithStyles } from './';

import { IInstruction as IOperation } from '../../lib/idl/bytecode/IInstruction';
import { EOperations } from '../../lib/idl/bytecode/EOperations';

export interface IBytecodeViewProps {
    opList: IOperation[];
    onRun: () => void;
}

function minWidth(str: string, len: number = 0, char: string = ' ') {
    for (let i = 0, slen = str.length; i < Math.max(0, len - slen); ++i) {
        str = char + str;
    } 
    return str;
}

const REG_NAMES = {
    [0x100] : 'rax' // todo: get register adresses from bytecode generator
}

const hex2 = (v: number) => `0x${minWidth(v.toString(16), 2, '0')}`;
const hex4 = (v: number) => `0x${minWidth(v.toString(16), 4, '0')}`;
const reg = (v: number) => REG_NAMES[v] || `[${hex2(v >>> 0)}]`;    // register address;
const addr = (v: number) => `%${hex4(v >>> 0)}%`;                   // global memory address;

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
            <div>
            <Table size="small" unstackable basic compact style={ { fontFamily: 'consolas' } }>
                <Table.Body>
                    { opList.map((op, i) => this.renderOp(op)) }
                </Table.Body>
            </Table>
            <Button animated onClick={ props.onRun || (() => {}) }>
                <Button.Content visible>Run</Button.Content>
                <Button.Content hidden>
                    <Icon name='rocket' />
                </Button.Content>
            </Button>
            </div>
        );
    }

    renderOp(op: IOperation) {
        switch (op.code) {
            case EOperations.k_Label:
                return this.renderLabel(op);
            default:
                return this.renderOpInternal(op.code, op.args.map(v => v.toString()));
        }
    }

    
    renderOpInternal(code: EOperations, args: string[]) {
        let i = this.state.count++;
        return (
            <Table.Row key={`op-${code}-${i}`}>
                <Table.Cell></Table.Cell>
                <Table.Cell>{ hex4(i) }</Table.Cell>
                <Table.Cell>{ EOperations[code].substr(2).toLowerCase() }</Table.Cell>
                <Table.Cell>{ args.join(' ') }</Table.Cell>
            </Table.Row>
        );
    }

    renderLabel(op: IOperation) {
        let i = this.state.count;
        return (
            <Table.Row key={`op-label-${i}`}>
                <Table.Cell colSpan={ 4 }>{ op.args[0].toString() }</Table.Cell>
            </Table.Row>
        );
    }
}

export default BytecodeView;