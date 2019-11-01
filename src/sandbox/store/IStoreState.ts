import { IAnalyzeResult as ISemanticAnalysisResult } from '@lib/fx/Analyzer';
import { ISubProgram } from '@lib/fx/bytecode/Bytecode';
import { IMap } from '@lib/idl/IMap';
import { EParserType, IParserParams, IParseTree, IRange } from '@lib/idl/parser/IParser';

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
    };

    entryPoint: string;

    // (current debugger runtime)
    // BytecodeView shows instructions
    // with additional debug info, like colorization using
    // cdl view.
    runtime: ISubProgram;
}


export interface IFileState {
    filename: string;               // source file's path
    content: string;                // source file's content
    error: Error;                   // source file loading's error

    parseTree: IParseTree;              // syntax analysis' results
    analysis: ISemanticAnalysisResult;

    markers: IMap<IMarker>;
    breakpoints: number[];

    debugger: IDebuggerState;
    pipeline: any; // todo: add type.
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
