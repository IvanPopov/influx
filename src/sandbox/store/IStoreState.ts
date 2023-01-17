import { ISubProgram } from '@lib/fx/bytecode/Bytecode';
import { IMap } from '@lib/idl/IMap';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { EParserType, IParserParams, IRange } from '@lib/idl/parser/IParser';
import { RouterState } from 'connected-react-router';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { LGraph } from 'litegraph.js';
import { ITimeline } from '@lib/fx/timeline';
import * as S3D from '@lib/util/s3d/prjenv';
import { ITechnique } from '@lib/idl/ITechnique';
import { ControlValueType, PropertyValueType } from '@lib/fx/bundles/utils';

export interface IMarker {
    range: IRange;
    type: 'warning' | 'error' | 'marker' | 'line' | 'unreachable-code';
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

    revision: number;               // number of updates of file

    error: Error;                   // source file loading's error

    slastDocument: ISLASTDocument;
    slDocument: ISLDocument;
    rawDocument: ITextDocument;

    markers: IMap<IMarker>;
    breakpoints: number[];

    debugger: IDebuggerState;

    defines: string[];
}

export interface INodeConstant {
    name: string;
    value: string;
    type: string;
}

export interface INodePipeline {
    docs: string;               // current info of selected node
    graph: LGraph;
    revision: number;          // number of updates of graph
    env: ISLDocument;          // library extended with particle struct
    constants: INodeConstant[];
    capacity: number;
}

export type Vector2 = { x: number; y: number };
export type Vector3 = { x: number; y: number; z: number };
export type Vector4 = { x: number; y: number; z: number; w: number };
export type Color = { r: number; g: number; b: number; a: number };
export type ControlValues = IMap<ControlValueType>;

export interface IPlaygroundPresetEntry {
    name: string;
    type: string; 
    value: ControlValueType;
}

export interface IPlaygroundPreset {
    name: string;
    desc: string;
    data: IPlaygroundPresetEntry[];
}

export interface IPlaygroundControl {
    name: string;
    type: string;
    properties: IMap<PropertyValueType>;
}

export interface IPlaygroundControlsState {
    controls: IMap<IPlaygroundControl>;
    values: ControlValues;
    presets: IPlaygroundPreset[];
}



type PlaygroundPresets = IMap<ControlValues>;

export interface IPlaygroundState {
    technique: ITechnique;
    timeline: ITimeline;
    controls: IPlaygroundControlsState;
    presets: PlaygroundPresets;
    revision: number;               // number of updates of emitter
    wasm: boolean;                  // technique's backend mode
    shaderFormat: 'glsl' | 'hlsl';

    exportName: string;             // path on user disk (last 'save as' path)
    autosave: boolean;              // save file to disk on every change
}

export interface IParserState extends IParserParams {
    filename: string;
    grammar: string;
    type: EParserType;
    // TODO: rename option (or move it out of this scope)
    parsingFlags: number;
}


export interface ITranslatorParams {
    uiControlsGatherToDedicatedConstantBuffer: boolean;
    uiControlsConstantBufferRegister: number;

    globalUniformsGatherToDedicatedConstantBuffer: boolean;
    globalUniformsConstantBufferRegister: number;
}

/*
Case Handling: " insensitive\r"
Client address: " 192.168.41.74\r"
Client host: " ipopov\r"
Client name: " ipopov_\r"
Client root: " C"
Client stream: " //dev/main_ProgrammerNoArt\r"
Current directory: " c"
Peer address: " 172.16.166.10"
Proxy address: " p4.saber3d.net"
Proxy version: " P4P/LINUX26X86_64/2020.2/2179691 (2021/09/02)\r"
Server date: " 2022/07/14 23"
Server license: " Licensed\r"
Server services: " standard\r"
Server version: " P4D/LINUX26X86_64/2020.2/2179691 (2021/09/02)\r"
ServerID: " p4_main_commit\r"
User name: " ivan.popov\r"
*/

export interface IP4Info {
    "Case Handling": string;
    "Client address": string;
    "Client host": string;
    "Client name": string;
    "Client root": string;
    "Client stream": string;
    "Current directory": string;
    "Peer address": string;
    "Proxy address": string;
    "Proxy version": string;
    "Server date": string;
    "Server license": string;
    "Server services": string;
    "Server version": string;
    "ServerID": string;
    "User name": string;
}

export interface IS3DState {
    env: S3D.ProjectEnv,
    p4: IP4Info
}

//
//
//

export interface IDepotFolder {
    path: string;
    folders?: IDepotFolder[];
    files?: string[];
    totalFiles: number;
}

export interface IDepot {
    root: IDepotFolder;
}

//
//
//

export interface IStoreState {
    // current location
    readonly router: RouterState;

    // current working file
    readonly sourceFile: IFileState;
    readonly nodes: INodePipeline;

    // derived state from actual parsed source file
    readonly playground: IPlaygroundState;

    // global params
    readonly parserParams: IParserState;
    readonly translatorParams: ITranslatorParams;

    // perforce & s3d enviroment
    readonly s3d: IS3DState;

    // all available data from filesystem
    readonly depot: IDepot;
}

export default IStoreState;
