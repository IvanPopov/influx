import { EChunkType } from '@lib/fx/bytecode/Bytecode';
import { CdlRaw, cdlview } from '@lib/fx/bytecode/DebugLayout';
import VM from '@lib/fx/bytecode/VM';
import { EOperation } from '@lib/idl/bytecode/EOperations';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Icon, Table } from 'semantic-ui-react';


export interface IBytecodeViewProps extends IFileState {
    code: Uint8Array;
    cdl: CdlRaw;

    actions: typeof sourceActions;
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


    render() {
        const { props } = this;
        const { code } = props;

        let chunks = VM.decodeChunks(code);

        let ilist = VM.decodeCodeChunk(chunks[EChunkType.k_Code]);
        
        return (
            // fixed
            <div>
                <Table size="small" unstackable basic compact style={ { fontFamily: 'consolas' } }>
                    <Table.Body>
                        { this.renderOpList(ilist) }
                    </Table.Body>
                </Table>
                <Button animated onClick={ () => { VM.evaluate(code) } }>
                    <Button.Content visible>Run</Button.Content>
                    <Button.Content hidden>
                        <Icon name='rocket' />
                    </Button.Content>
                </Button>
            </div>
        );
    }


    renderOpList(ilist: Uint32Array) {
        let list = [];
        for (let i = 0; i < ilist.length; i += 4) {
            list.push(this.renderOp(ilist.subarray(i, i + 4)));
        }
        return list;
    }


    renderOp(op: Uint32Array) {
        let code: EOperation = op[0];
        let args = [op[1], op[2], op[3]];
        switch (op[3]) {
            default:
                return this.renderOpInternal(code, args.map(v => `${v}`));
        }
    }

    showSourceLine(pc: number) {
        console.log(cdlview(this.props.cdl).sourceFileFromPc(pc));
    }

    hideSourceLine(oc: number) {

    }
    
    renderOpInternal(code: EOperation, args: string[]) {
        let i = this.state.count++;
        return (
            <Table.Row key={`op-${code}-${i}`} onMouseOver={ () => this.showSourceLine(i) } onMouseOut={ () => this.hideSourceLine(i) }>
                <Table.Cell></Table.Cell>
                <Table.Cell>{ hex4(i) }</Table.Cell>
                <Table.Cell>{ EOperation[code].substr(2).toLowerCase() }</Table.Cell>
                <Table.Cell>{ args.join(' ') }</Table.Cell>
            </Table.Row>
        );
    }
}

export default connect<{}, {}, IBytecodeViewProps>(mapProps(getSourceCode), mapActions(sourceActions))(BytecodeView) as any;