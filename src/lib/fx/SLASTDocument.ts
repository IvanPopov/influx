import { ISLASTDocument } from '@lib/idl/ISLASTDocument';
import { ITextDocument } from '@lib/idl/ITextDocument';
import { EOperationType, EParserCode, IASTConfig, IRange, IToken } from '@lib/idl/parser/IParser';
import { ASTDocument, EParsingErrors, EParsingWarnings } from "@lib/parser/ASTDocument";
import { defaultSLParser } from './SLParser';
import { Preprocessor } from '@lib/parser/Preprocessor';
import { IDiagnosticReport } from '@lib/idl/IDiagnostics';
import { Diagnostics } from '@lib/util/Diagnostics';


// const readFile = fname => fetch(fname).then(resp => resp.text(), reason => console.warn('!!!', reason));

const PREDEFINED_TYPES = [
    'float2', 'float3', 'float4',
    'float2x2', 'float3x3', 'float4x4',
    'int2', 'int3', 'int4',
    'uint2', 'uint3', 'uint4',
    'bool2', 'bool3', 'bool4',
    'auto'
];


export class SLASTDocument extends ASTDocument implements ISLASTDocument {
    protected preprocessor: Preprocessor;


    constructor({ parser = defaultSLParser() }: IASTConfig = {}) {
        super({ parser, knownTypes: new Set(PREDEFINED_TYPES) });
    }


    get includes(): Map<string, IRange> {
        return this.preprocessor.includeList;
    }


    get unreachableCode(): IRange[] {
        return this.preprocessor.unreachableCodeList;
    }


    get uri(): string {
        return this.preprocessor.uri.toString();
    }


    get diagnosticReport(): IDiagnosticReport {
        let preprocessorReport = this.preprocessor.getDiagnosticReport();
        let parserReport = this.diag.resolve();
        return Diagnostics.mergeReports([preprocessorReport, parserReport]);
    }


    protected init(config: IASTConfig) {
        super.init(config);
        this.preprocessor = new Preprocessor(this.parser.lexerEngine, this.knownTypes);

        this.ruleFunctions.set('addType', this._addType.bind(this));
    }


    private _addType(): EOperationType {
        const tree = this.tree;
        const node = tree.lastNode;
        const typeId = node.children[node.children.length - 2].value;
        this.knownTypes.add(typeId);
        return EOperationType.k_Ok;
    }


    protected emitError(code: number, token: IToken) {
        this.diag.error(code, { ...this.preprocessor.lexer.getPosition(), token });
    }

    
    protected emitCritical(code: number, token: IToken = null) {
        this.diag.critical(code, { ...this.preprocessor.lexer.getPosition(), token });
    }


    protected setTextDocument(textDocument: ITextDocument): void {
        this.preprocessor.setTextDocument(textDocument);
    }


    protected async readToken(allowMacro: boolean = true): Promise<IToken> {
        return await this.preprocessor.readToken(allowMacro);
    }

    // async parse(textDocument: ITextDocument, flags?: number): Promise<EParserCode> {
    //     const res = await super.parse(textDocument, flags);
    //     return res;
    // }
}


export async function createSLASTDocument(textDocument: ITextDocument, flags?: number): Promise<ISLASTDocument> {
    const document = new SLASTDocument();
    const timeLabel = `createSLASTDocument(${textDocument.uri})`;
    console.time(timeLabel);
    await document.parse(textDocument, flags);
    console.timeEnd(timeLabel);

    return document;
}
