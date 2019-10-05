import { IMap } from '@lib/idl/IMap';
import { EParserType, IParseTree, IRange, IParserParams } from '@lib/idl/parser/IParser';
import { IScope, IInstructionCollector } from '@lib/idl/IInstruction';

export interface IMarker {
    range: IRange;
    type: 'error' | 'marker';
    tooltip?: string;
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
