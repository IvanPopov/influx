// tslint:disable:typedef
// tslint:disable:max-func-body-length
// tslint:disable:cyclomatic-complexity


import { cdlview } from '@lib/fx/bytecode';
import { u32Asf32, u32Asi32 } from '@lib/fx/bytecode/common';
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

// todo: don't use TS specific bundle helpers
import { CBUFFER0_REGISTER, CBUFFER_TOTAL, SRV0_REGISTER, SRV_TOTAL, UAV0_REGISTER, UAV_TOTAL } from '@lib/fx/bytecode/Bytecode';
import * as TSVM from '@lib/fx/bytecode/VM/ts/bundle';
import { isDefAndNotNull } from '@lib/util/s3d/type';

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

const constant = (v: string) => `"${v}"`;
const float = (v: number) => String(v).indexOf('.') === -1 ? `${v}.f` : `${v}f`;
const fixPrecision = (v: number, precision = 2) => Math.floor(v * Math.pow(10, 2)) / Math.pow(10, 2);
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
        case EOperation.k_I32SetConst: return 'i32_set';
        case EOperation.k_I32LoadRegister: return 'i32_load';
        case EOperation.k_I32LoadRegistersPointer: return 'i32_load*';
        case EOperation.k_I32StoreRegisterPointer: return 'i32_store*';
        case EOperation.k_I32LoadInputPointer: return 'i32_load_input*';
        case EOperation.k_I32StoreInputPointer: return 'i32_store_input*';
        case EOperation.k_I32GreaterThanEqual: return 'i32_ge';
        case EOperation.k_I32LessThan: return 'i32_lt';
        case EOperation.k_U32GreaterThanEqual: return 'u32_ge';
        case EOperation.k_U32LessThan: return 'u32_lt';
        case EOperation.k_F32GreaterThanEqual: return 'f32_ge';
        case EOperation.k_F32LessThan: return 'f32_lt';
        case EOperation.k_I32Not: return 'i32_not';
        case EOperation.k_I32NotEqual: return 'i32_ne';
        default:
            return v;
    }
};

function JSNativeCall(a, b, c, d) {
    console.log(`callback!`, a, b, c, d);
    return 12;
}

class BytecodeView extends React.Component<IBytecodeViewProps, IBytecodeViewState>  {

    state: IBytecodeViewState = {
        count: 0,
        cdlView: null
    };

    static getDerivedStateFromProps(props: IBytecodeViewProps, state: IBytecodeViewState) {
        const count = 0;
        const cdlView = cdlview(props.bcDocument.program?.cdl);

        return { count, cdlView };
    }

    render() {
        const { props } = this;
        const { program } = props.bcDocument;

        if (!isDefAndNotNull(program)) {
            return null;
        }

        const { code, cdl } = program;

        if (!isDefAndNotNull(code)) {
            return null;
        }

        const chunks = TSVM.decodeChunks(code);
        const ilist = TSVM.decodeCodeChunk(chunks[EChunkType.k_Code]);
        const externs = TSVM.decodeExternsChunk(chunks[EChunkType.k_Externs]);
        

        return (
            // fixed
            <div>
                <Table size='small' unstackable basic compact style={ { fontFamily: 'consolas, monospace', whiteSpace: 'pre' } }>
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
                                <Table.Cell colSpan={ 5 } inverted={1 as any} warning textAlign='center'
                                    style={ { padding: '2px', fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' } }
                                >
                                    optimizations are disabled
                            </Table.Cell>
                            </Table.Row>
                        </Table.Footer>
                    }
                </Table>
                <Button animated onClick={ async () => {
                    const bundle = VM.make("[evaluate]", code);

                    if (!bundle) {
                        alert(`[ERROR] Could not evaluate bundle.`);
                        return;
                    }

                    const externs = bundle.getExterns();
                    console.log(externs);
                    const ex = externs.find(ex => ex.name === "JSNativeFunc");
                    if (ex) {
                        bundle.setExtern(ex.id, JSNativeCall);
                    }            

                    // force bind shadow constant buffer 
                    bundle.setConstant("@", new Uint8Array()); // temp hack for CPP VM setup
                    
                    const result = VM.asNativeViaCDL(bundle.play(), cdl);
                    alert(JSON.stringify(result, null, '   '));
                } }>
                    <Button.Content visible>Run</Button.Content>
                    <Button.Content hidden>
                        <Icon className='rocket' />
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
                return this.renderOpInternal(code, args);
        }
    }

    showSourceLine(pc: number) {
        // console.log(this.state.cdlView.resolveFileLocation(pc));
    }

    hideSourceLine(oc: number) {

    }


    // tslint:disable-next-line:max-func-body-length:
    // tslint:disable-next-line:cyclomatic-complexity
    renderOpInternal(code: EOperation, args: number[]) {
        const i = this.state.count++;
        const { cdlView } = this.state;

        switch (code) {
            case EOperation.k_I32SetConst:
                args.length = 3;
                // op, const, hint
                break;

            case EOperation.k_I32LoadRegister:
                args.length = 2;
                break;

            case EOperation.k_I32LoadRegistersPointer:
            case EOperation.k_I32StoreRegisterPointer:
                args.length = 3;
                break;

            case EOperation.k_I32LoadInput:
            case EOperation.k_I32StoreInput:
                args.length = 3;
                break;

            case EOperation.k_I32LoadInputPointer:
            case EOperation.k_I32StoreInputPointer:
                args.length = 4;
                break;
            case EOperation.k_I32TextureLoad:
                args.length = 3;
                break;
            case EOperation.k_I32ExternCall:
                args.length = 2;
                break;

            case EOperation.k_I32Not:
                args.length = 2;
                break;

            case EOperation.k_I32Equal:
            case EOperation.k_I32NotEqual:
            case EOperation.k_I32GreaterThanEqual:
            case EOperation.k_I32LessThan:
            case EOperation.k_U32GreaterThanEqual:
            case EOperation.k_U32LessThan:
            case EOperation.k_F32GreaterThanEqual:
            case EOperation.k_F32LessThan:
            case EOperation.k_I32LogicalOr:
            case EOperation.k_I32LogicalAnd:
                args.length = 3;
                break;

            case EOperation.k_F32ToI32:
            case EOperation.k_I32ToF32:
            case EOperation.k_F32ToU32:
            case EOperation.k_U32ToF32:
                args.length = 2;
                break;

            case EOperation.k_I32Add:
            case EOperation.k_I32Sub:
            case EOperation.k_I32Div:
            case EOperation.k_I32Mul:
                args.length = 3;
                break;

            case EOperation.k_I32Min:
            case EOperation.k_I32Max:
                args.length = 3;
                break;

            case EOperation.k_F32Add:
            case EOperation.k_F32Sub:
            case EOperation.k_F32Div:
            case EOperation.k_F32Mul:
                args.length = 3;
                break;

            case EOperation.k_F32Sin:
            case EOperation.k_F32Cos:
            case EOperation.k_F32Frac:
            case EOperation.k_F32Sqrt:
            case EOperation.k_F32Floor:
            case EOperation.k_F32Ceil:
                args.length = 2;
                break;

            case EOperation.k_F32Max:
            case EOperation.k_F32Min:
            case EOperation.k_F32Pow:
                args.length = 3;
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

        // tslint:disable-next-line:switch-default
        switch (code) {
            case EOperation.k_I32SetConst:
                args[1] = args[2] === 1 ? fixPrecision(u32Asf32(args[1])) : u32Asi32(args[1]);
        }

        //
        // Convert all arguments to strings
        //

        let sArgs = args.map(String);

        const pointer = (x: number) => `%${x}`;
        const register = (x: number) => `r${x}`;
        const shaderRegister = (x: number) =>  {
            if (x >= CBUFFER0_REGISTER && x - CBUFFER0_REGISTER < CBUFFER_TOTAL) 
                return `b${x - CBUFFER0_REGISTER}`;
            if (x >= SRV0_REGISTER && x - SRV0_REGISTER < SRV_TOTAL) 
                return `t${x - SRV0_REGISTER}`;
            if (x >= UAV0_REGISTER && x - UAV0_REGISTER < UAV_TOTAL) 
                return `u${x - UAV0_REGISTER}`;
            console.error(`invalid slot: ${x}`);
            return `${x}`;
        }
        

        // tslint:disable-next-line:switch-default
        switch (code) {
            case EOperation.k_I32SetConst:
                sArgs[0] = register(args[0]);
                if (args[2] === 1) { // is float
                    sArgs[1] = float(args[1]);
                }
                sArgs[1] = constant(sArgs[1]);
                sArgs.length = 2;
                break;
            case EOperation.k_I32LoadRegister:
                sArgs[0] = register(args[0]);
                sArgs[1] = register(args[1]);
                break;
            case EOperation.k_I32LoadRegistersPointer:
                sArgs[0] = register(args[0]);
                sArgs[1] = pointer(args[1]);
                break;
            case EOperation.k_I32StoreRegisterPointer:
                sArgs[0] = pointer(args[0]);
                sArgs[1] = register(args[1]);
                break;
            case EOperation.k_I32LoadInput:
                // sArgs[0] = shaderRegister(args[0]);
                sArgs[1] = register(args[1]);
                break;
            case EOperation.k_I32StoreInput:
                sArgs[2] = register(args[2]);
                break;
            case EOperation.k_I32LoadInputPointer:
                sArgs[0] = shaderRegister(args[0]);
                sArgs[1] = register(args[1]);
                sArgs[2] = pointer(args[2]);
                break;
            case EOperation.k_I32StoreInputPointer:
                sArgs[1] = pointer(args[1]);
                sArgs[2] = register(args[2]);
                break;
            case EOperation.k_I32TextureLoad:
                sArgs[0] = register(args[0]);
                sArgs[1] = pointer(args[1]);
                sArgs[2] = register(args[2]);
                break;
            case EOperation.k_I32ExternCall:
                sArgs[0] = constant(sArgs[0]);
                sArgs[1] = register(args[1]);
                break;
            case EOperation.k_Jump:
                sArgs[0] = hex2(args[0]/* / InstructionList.STRIDE*/);
                break;
            default:
                sArgs = args.map(register);
        }

        sArgs = sArgs.map(any4);

        // let htmlArgs: JSX.Element[] = [];
        // const asSpan = (v: string) => (<span>&nbsp;{ v }&nbsp;</span>);

        // switch (code) {
        //     case EOperation.k_I32SetConst:
        //         htmlArgs[0] = asSpan(sArgs[0]);
        //         htmlArgs[1] = (<span style={ { color: 'gray' } }>&nbsp;{ sArgs[1] }&nbsp;</span>);
        //         break;
        //     default:
        //         htmlArgs = sArgs.map(asSpan);
        // }

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
                    {/* { htmlArgs } */}
                    { sArgs.join(' ') }
                </Table.Cell>
            </Table.Row>
        );
    }
}

export default connect<{}, {}, IBytecodeViewProps>(mapProps(getDebugger), mapActions(sourceActions))(BytecodeView) as any;
