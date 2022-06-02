import { ISubProgram } from '@lib/fx/bytecode/Bytecode';
import { IMap } from '@lib/idl/IMap';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { EParserType, IParserParams, IRange } from '@lib/idl/parser/IParser';
import { IEmitter } from '@sandbox/containers/playground/idl/IEmitter';
import { RouterState } from 'connected-react-router';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { LGraph } from 'litegraph.js';

export interface IMarker {
    range: IRange;
    type: 'warning' | 'error'| 'marker' | 'line' | 'unreachable-code';
    tooltip?: string;
    payload?: Object;
}

export interface IDebuggerState {
    options: {
        colorize: boolean;
        disableOptimizations: boolean;
        autocompile: boolean;
        wasm: boolean;
    };

    expression: string;

    // (current debugger runtime)
    // BytecodeView shows instructions
    // with additional debug info, like colorization using
    // cdl view.
    runtime: ISubProgram;
}


export interface IFileState {
    uri: string;                    // source file's path
    content: string;                // source file's content

    error: Error;                   // source file loading's error

    slastDocument: ISLASTDocument;
    slDocument: ISLDocument;
    rawDocument: ITextDocument;

    markers: IMap<IMarker>;
    breakpoints: number[];

    debugger: IDebuggerState;
}

export interface INodePipeline {
    docs: string;               // current info of selected node
    graph: LGraph; 
    $revision: number;          // number of updates of graph
}

export interface IPlaygroundState {
    emitter: IEmitter;      // todo: add type.
    $revision: number;      // number of updates of emitter
}

export interface IParserState extends IParserParams {
    filename: string;
    grammar: string;
    type: EParserType;
    // TODO: rename option (or move it out of this scope)
    parsingFlags: number;
}

export interface IStoreState {
    readonly sourceFile: IFileState;
    readonly parserParams: IParserState;
    readonly router: RouterState;
    readonly playground: IPlaygroundState;
    readonly nodes: INodePipeline;
}

export default IStoreState;
