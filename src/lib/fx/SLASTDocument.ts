import { IDiagnosticReport } from '@lib/idl/IDiagnostics';
import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { IMacro } from '@lib/idl/parser/IMacro';
import { EOperationType, IASTConfig, IFile, IncludeResolver, IRange, IToken } from '@lib/idl/parser/IParser';
import { ASTDocument } from "@lib/parser/ASTDocument";
import { Preprocessor } from '@lib/parser/Preprocessor';
import { Diagnostics } from '@lib/util/Diagnostics';

import { defaultSLParser } from './SLParser';

// const readFile = fname => fetch(fname).then(resp => resp.text(), reason => console.warn('!!!', reason));

const PREDEFINED_TYPES = [
    'half2', 'half3', 'half4',
    'float2', 'float3', 'float4',
    'float2x2', 'float2x3', 'float2x4', 
    'float3x2', 'float3x3', 'float3x4', 
    'float4x2', 'float4x3', 'float4x4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4',
    'auto'
];


export class SLASTDocument extends ASTDocument implements ISLASTDocument {
    protected preprocessor: Preprocessor;

    constructor({ parser = defaultSLParser(), knownTypes = new Set(), ...settings }: IASTConfig = {}) {
        super({ parser, knownTypes: new Set([...PREDEFINED_TYPES, ...knownTypes]), ...settings });
    }


    get includes(): Map<string, IRange> {
        return this.preprocessor.includeMap;
    }


    get unreachableCode(): IRange[] {
        return this.preprocessor.unreachableCodeList;
    }


    get macros(): IMacro[] {
        return [ ...this.preprocessor.macros ];
    }


    get unresolvedMacros(): IMacro[] {
        return this.preprocessor.unresolvedMacros;
    }


    get uri(): IFile {
        return this.preprocessor.uri;
    }


    get diagnosticReport(): IDiagnosticReport {
        let preprocessorReport = this.preprocessor.getDiagnosticReport();
        let parserReport = this.diag.resolve();
        return Diagnostics.mergeReports([preprocessorReport, parserReport]);
    }


    protected init(config: IASTConfig) {
        super.init(config);
        const { knownTypes } = this;
        const { includeResolver } = config;
        this.preprocessor = new Preprocessor(this.parser.lexerEngine, { knownTypes, includeResolver });

        this.ruleFunctions.set('addType', this._addType.bind(this));
    }


    private _addType(): EOperationType {
        const tree = this.tree;
        const node = tree.lastNode;
        const typeId = node.children[node.children.length - 2].value;
        this.knownTypes.add(typeId);
        return EOperationType.k_Ok;
    }


    protected setTextDocument(textDocument: ITextDocument): void {
        this.preprocessor.setTextDocument(textDocument);
    }


    protected async readToken(): Promise<IToken> {
        const token = await this.preprocessor.readToken();
        
        // replacement of the original token location with the macro location
        const macroLoc = this.preprocessor.macroLocation();
        if (macroLoc) { 
            token.loc = macroLoc; 
        }

        return token;
    }
}


export async function createSLASTDocument(textDocument: ITextDocument, 
    opts : { flags?: number, knownTypes?: string[], includeResolver?: IncludeResolver } = {}): Promise<ISLASTDocument> {
    const { flags, knownTypes, includeResolver } = opts;
    const document = new SLASTDocument({ knownTypes: new Set([...(knownTypes || [])]), includeResolver });
    // const timeLabel = `createSLASTDocument(${textDocument.uri})`;
    // console.time(timeLabel);
    await document.parse(textDocument, flags);
    // console.timeEnd(timeLabel);
    return document;
}
