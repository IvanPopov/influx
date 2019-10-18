import { EChunkType } from '@lib/fx/bytecode/Bytecode';
import { CdlRaw, cdlview } from '@lib/fx/bytecode/DebugLayout';
import * as VM from '@lib/fx/bytecode/VM';
import { EOperation } from '@lib/idl/bytecode/EOperations';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode, getDebugger } from '@sandbox/reducers/sourceFile';
import { IFileState, IDebuggerState } from '@sandbox/store/IStoreState';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Icon, Table } from 'semantic-ui-react';
import { isNull } from '@lib/common';
import DistinctColor from '@lib/util/DistinctColor';


export interface IBytecodeViewProps extends IDebuggerState {
    actions: typeof sourceActions;
}


export interface IBytecodeViewState {
    count: number;
    cdlView: ReturnType<typeof cdlview>;
}


function minWidth(str: string, len: number = 0, char: string = ' ') {
    for (let i = 0, slen = str.length; i < Math.max(0, len - slen); ++i) {
        str = char + str;
    }
    return str;
}

const REG_NAMES = {
    [0x100]: 'rax' // todo: get register adresses from bytecode generator
};



const hex2 = (v: number) => `0x${minWidth(v.toString(16), 2, '0')}`;
const hex4 = (v: number) => `0x${minWidth(v.toString(16), 4, '0')}`;
const reg = (v: number) => REG_NAMES[v] || `[${hex2(v >>> 0)}]`;    // register address;
const addr = (v: number) => `%${hex4(v >>> 0)}%`;                   // global memory address;
const any3 = (v: number) => `${minWidth(String(v), 3, ' ')}`;
const scode = (c: EOperation) => {
    let s = String(EOperation[c]);
    s = s.substr(2);

    let v = '';
    for (const char of s) {
        if (char === char.toUpperCase() && (char < '0' || char > '9') && v.length > 0) {
            v += '_';
        }

        v += char.toLowerCase();
    }

    switch (c) {
        case EOperation.k_I32MoveRegToReg:
            return 'i32_move';
        // case EOperation.k_I32LoadConst:
        //     return 'i32_load';
        default:
            return v;
    }
};


class BytecodeView extends React.Component<IBytecodeViewProps, IBytecodeViewState>  {

    state: IBytecodeViewState = {
        count: 0,
        cdlView: null
    };

    render() {
        const { props } = this;
        const { runtime: { code } } = props;

        if (isNull(code)) {
            return null;
        }

        const chunks = VM.decodeChunks(code);
        const ilist = VM.decodeCodeChunk(chunks[EChunkType.k_Code]);

        return (
            // fixed
            <div>
                <Table size='small' unstackable basic compact style={ { fontFamily: 'consolas', whiteSpace: 'pre' } }>
                    <Table.Body style={ {
                        maxHeight: 'calc(100vh - 432px)',
                        overflowY: 'auto',
                        display: 'block'
                    } }>
                        { this.renderOpList(ilist) }
                    </Table.Body>
                    { props.options.disableOptimizations &&
                        <Table.Footer>
                            <Table.Row >
                                <Table.Cell colSpan={ 4 } inverted warning textAlign='center'
                                    style={ { padding: '2px', fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' } }
                                >
                                    optimizations are disabled
                            </Table.Cell>
                            </Table.Row>
                        </Table.Footer>
                    }
                </Table>
                <Button animated onClick={ () => { alert(VM.evaluate(code)); } }>
                    <Button.Content visible>Run</Button.Content>
                    <Button.Content hidden>
                        <Icon name='rocket' />
                    </Button.Content>
                </Button>
            </div>
        );
    }


    renderOpList(ilist: Uint32Array) {
        const list = [];
        for (let i = 0; i < ilist.length; i += 4) {
            list.push(this.renderOp(ilist.subarray(i, i + 4)));
        }
        return list;
    }


    renderOp(op: Uint32Array) {
        const code: EOperation = op[0];
        const args = [op[1], op[2], op[3]];
        switch (op[3]) {
            default:
                return this.renderOpInternal(code, args.map(any3));
        }
    }

    showSourceLine(pc: number) {
        // console.log(this.state.cdlView.resolveFileLocation(pc));
    }

    hideSourceLine(oc: number) {

    }

    renderOpInternal(code: EOperation, args: string[]) {
        const i = this.state.count++;
        const { cdlView } = this.state;

        switch (code) {
            case EOperation.k_I32LoadInput:
            case EOperation.k_I32StoreInput:
                args.length = 3;
                break;
            case EOperation.k_F32ToI32:
            case EOperation.k_I32ToF32:
            case EOperation.k_I32LoadConst:
            case EOperation.k_I32MoveRegToReg:
                args.length = 2;
                break;
            case EOperation.k_Jump:
                args.length = 1;
                break;
            case EOperation.k_Ret:
                args.length = 0;
                break;
            default:
        }

        return (
            <Table.Row key={ `op-${code}-${i}` } 
                style={ { width: '100%', display: 'table', tableLayout: 'fixed', borderBottom: 'none' } }
                onMouseOver={ () => this.showSourceLine(i) } onMouseOut={ () => this.hideSourceLine(i) }>
                <Table.Cell
                    style={ this.props.options.colorize ?
                        {
                            padding: '0.2em 0',
                            opacity: 0.5,
                            background: DistinctColor.make(cdlView.resolvePcColor(i)).toRGBAString(),
                            width: '4px'
                        } : null
                    }></Table.Cell>
                <Table.Cell style={ { padding: '0.2em 0.7em' } }>{ hex4(i) }</Table.Cell>
                <Table.Cell style={ { padding: '0.2em 0.7em' } }>{ scode(code) }</Table.Cell>
                <Table.Cell style={ { padding: '0.2em 0.7em' } }>{ args.join(' ') }</Table.Cell>
            </Table.Row>
        );
    }

    static getDerivedStateFromProps(props: IBytecodeViewProps, state: IBytecodeViewState) {
        const count = 0;
        const cdlView = cdlview(props.runtime.cdl);

        return { count, cdlView };
    }
}

export default connect<{}, {}, IBytecodeViewProps>(mapProps(getDebugger), mapActions(sourceActions))(BytecodeView) as any;
