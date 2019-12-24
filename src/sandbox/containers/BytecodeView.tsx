// tslint:disable:typedef


import { isNull } from '@lib/common';
import { cdlview } from '@lib/fx/bytecode';
import { u8ArrayAsI32, u8ArrayAsF32 } from '@lib/fx/bytecode/common';
import * as VM from '@lib/fx/bytecode/VM';
import { EChunkType } from '@lib/idl/bytecode';
import { EOperation } from '@lib/idl/bytecode/EOperations';
import DistinctColor from '@lib/util/DistinctColor';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getDebugger } from '@sandbox/reducers/sourceFile';
import { IDebuggerState } from '@sandbox/store/IStoreState';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Icon, Table } from 'semantic-ui-react';

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
const any4 = (v: number | string) => `${minWidth(String(v), 4, ' ')}`;
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
        case EOperation.k_I32LoadRegister:
            return 'i32_move';
        case EOperation.k_I32LoadRegistersPointer:
            return 'i32_move*';
        case EOperation.k_I32LoadConstPointer:
            return 'i32_load_const*';
        case EOperation.k_I32LoadInputPointer:
            return 'i32_load_input*';
        // case EOperation.k_I32StoreInputPointer:
        //     return 'i32_store_input*';
        default:
            return v;
    }
};


class BytecodeView extends React.Component<IBytecodeViewProps, IBytecodeViewState>  {

    state: IBytecodeViewState = {
        count: 0,
        cdlView: null
    };

    static getDerivedStateFromProps(props: IBytecodeViewProps, state: IBytecodeViewState) {
        const count = 0;
        const cdlView = cdlview(props.runtime.cdl);

        return { count, cdlView };
    }

    render() {
        const { props } = this;
        const { runtime: { code }, layout } = props;

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
                                <Table.Cell colSpan={ 5 } inverted warning textAlign='center'
                                    style={ { padding: '2px', fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' } }
                                >
                                    optimizations are disabled
                            </Table.Cell>
                            </Table.Row>
                        </Table.Footer>
                    }
                </Table>
                <Button animated onClick={ async () => {
                    const u8a = await VM.evaluate(code);
                    switch(layout) {
                        case 'f32':
                            alert(u8ArrayAsF32(u8a));
                            break;
                        default:
                            alert(u8ArrayAsI32(u8a));
                    }
                } }>
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
        for (let i = 0; i < ilist.length; i += 5) {
            list.push(this.renderOp(ilist.subarray(i, i + 5)));
        }
        return list;
    }


    renderOp(op: Uint32Array) {
        const code: EOperation = op[0];
        const args = [op[1], op[2], op[3], op[4]];
        switch (op[3]) {
            default:
                return this.renderOpInternal(code, args.map(String));
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
            case EOperation.k_I32LoadInputPointer:
            case EOperation.k_I32StoreInput:
                args.length = 3;
                break;
            case EOperation.k_F32ToI32:
            case EOperation.k_I32ToF32:
            case EOperation.k_I32LoadConst:
            case EOperation.k_I32LoadConstPointer:
            case EOperation.k_I32LoadRegister:
            case EOperation.k_I32LoadRegistersPointer:
                args.length = 2;
                break;
            case EOperation.k_JumpIf:
            case EOperation.k_Jump:
                args.length = 1;
                break;
            case EOperation.k_Ret:
                args.length = 0;
                break;
            default:
        }

        const pointer = (x) => `%${x}`;

        // tslint:disable-next-line:switch-default
        switch (code) {
            case EOperation.k_I32LoadInputPointer:
                args[2] = pointer(args[2]);
                break;
            case EOperation.k_I32LoadConstPointer:
            case EOperation.k_I32LoadRegistersPointer:
                args[1] = pointer(args[1]);
                break;
        }

        // tslint:disable-next-line:no-parameter-reassignment
        args = args.map(any4);

        let specColor = null;

        if (this.props.options.colorize) {
            specColor = {
                padding: '0.2em 0',
                opacity: 0.5,
                background: DistinctColor.make(cdlView.resolvePcColor(i)).toRGBAString(),
                width: '4px'
            };
        }

        return (
            <Table.Row key={ `op-${code}-${i}` }
                style={ { width: '100%', display: 'table', tableLayout: 'fixed', borderBottom: 'none' } }
                onMouseOver={ () => this.showSourceLine(i) } onMouseOut={ () => this.hideSourceLine(i) }>
                <Table.Cell style={ specColor }></Table.Cell>
                <Table.Cell style={ { padding: '0.2em 0.7em', width: '50px' } }>{ hex4(i) }</Table.Cell>
                <Table.Cell style={ { padding: '0.2em 0.7em' } }>{ scode(code) }</Table.Cell>
                <Table.Cell colSpan={ 2 } style={ { padding: '0.2em 0.7em' } }>
                    { args.join(' ') }
                </Table.Cell>
            </Table.Row>
        );
    }
}

export default connect<{}, {}, IBytecodeViewProps>(mapProps(getDebugger), mapActions(sourceActions))(BytecodeView) as any;
