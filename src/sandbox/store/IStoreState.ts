import { IMap } from '@lib/idl/IMap';
import { EParserType, IParseTree, IRange, IParserParams } from '@lib/idl/parser/IParser';
import { IScope, IInstructionCollector } from '@lib/idl/IInstruction';
import { ISubProgram } from '@lib/fx/bytecode/Bytecode';

export interface IMarker {
    range: IRange;
    type: 'warning' | 'error'| 'marker' | 'line';
    tooltip?: string;
    payload?: Object;
}

export interface IDebuggerState {
    options: {
        colorize: boolean;
        disableOptimizations: boolean;
        autocompile: boolean;
    }

    entryPoint: string;
    runtime: ISubProgram;
}

export interface IFileState {
    filename: string;               // source file's path
    content: string;                // source file's content
    error: Error;                   // source file loading's error

    parseTree: IParseTree;          // syntax analysis' results
    scope: IScope;                  // semantic analysis' results
    root: IInstructionCollector;    // semantic analysis' results

    markers: IMap<IMarker>;
    breakpoints: number[];

    debugger: IDebuggerState;
}

export interface IParserState extends IParserParams {
    filename: string;
    grammar: string;
    type: EParserType;
    mode: number;
}

export interface IStoreState {
    readonly sourceFile: IFileState;
    readonly parserParams: IParserState;
}

export default IStoreState;
