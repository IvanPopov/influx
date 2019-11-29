/* tslint:disable:no-for-in */
/* tslint:disable:forin */
/* tslint:disable:typedef */


import { deepEqual, isNull } from '@lib/common';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import { IParserParams } from '@lib/idl/parser/IParser';
import { EDiagnosticCategory, IDiagnosticMessage } from '@lib/util/Diagnostics';
import DistinctColor from '@lib/util/DistinctColor';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { IWithStyles } from '@sandbox/components';
import { getCommon, mapProps } from '@sandbox/reducers';
import { getParser } from '@sandbox/reducers/parserParams';
import { getFileState } from '@sandbox/reducers/sourceFile';
import IStoreState, { IFileState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as monaco from 'monaco-editor';
import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from 'monaco-languageclient/lib/monaco-converter';
import * as React from 'react';
import injectSheet from 'react-jss';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParameterInformation, SignatureInformation } from 'vscode-languageserver-types';
// tslint:disable-next-line:no-submodule-imports
import Worker from 'worker-loader!./LanguageService';

import styles from './styles.jss';

const m2p = new MonacoToProtocolConverter();
const p2m = new ProtocolToMonacoConverter();

namespace LanguageService {
    const worker = new Worker();

    // TODO: split all requests by documents
    let pendingValidationRequests: {
        resolve: (value: IDiagnosticMessage[]) => void;
        reject: () => void;
    }[] = [];

    // TODO: split all requests by documents
    let pendingCodeLensesRequests: {
        resolve: (value: monaco.languages.CodeLensList) => void;
        reject: () => void;
        document: TextDocument;
    }[] = [];

    worker.onmessage = (event) => {
        const data = event.data;
        switch (data.type) {
            case 'validation':
                {
                    const promise = pendingValidationRequests.pop();
                    promise.resolve(data.payload as IDiagnosticMessage[]);

                    // kick off all requests that depends on parsing only after validation
                    pendingCodeLensesRequests.forEach(req =>
                        worker.postMessage({ type: 'provide-code-lenses', payload: { uri: req.document.uri } }));
                }
                break;
            case 'provide-code-lenses':
                {
                    const promise = pendingCodeLensesRequests.pop();
                    promise.resolve({ lenses: p2m.asCodeLenses(data.payload), dispose() { } });
                }
                break;
            default:
        }
    };

    export async function validate(document: TextDocument): Promise<IDiagnosticMessage[]> {
        worker.postMessage({ type: 'validation', payload: { text: document.getText(), uri: document.uri } });
        // tslint:disable-next-line:promise-must-complete
        return new Promise<IDiagnosticMessage[]>((resolve, reject) => {
            pendingValidationRequests = [{ resolve, reject }, ...pendingValidationRequests];
        });
    }

    export async function install(params: IParserParams) {
        worker.postMessage({ type: 'install', payload: params });
    }

    export async function provideCodeLenses(document: TextDocument, token: monaco.CancellationToken) {
        // tslint:disable-next-line:promise-must-complete
        return new Promise<monaco.languages.CodeLensList>((resolve, reject) => {
            pendingCodeLensesRequests = [{ resolve, reject, document }, ...pendingCodeLensesRequests];
        });
    }
}

const LANGUAGE_ID = 'hlsl';

interface ILang extends monaco.languages.ILanguageExtensionPoint {
    loader: () => Promise<ILangImpl>;
}

interface ILangImpl {
    conf: monaco.languages.LanguageConfiguration;
    language: monaco.languages.IMonarchLanguage;
}

async function loadLanguage(def: ILang): Promise<void> {
    const mod = await def.loader();
    monaco.languages.setMonarchTokensProvider(def.id, mod.language);
    monaco.languages.setLanguageConfiguration(def.id, mod.conf);
}

function registerLanguage(def: ILang): void {
    monaco.languages.register(def);
    monaco.languages.onLanguage(def.id, () => { loadLanguage(def); });
}

// register the HLSL language with Monaco
registerLanguage({
    id: LANGUAGE_ID,
    extensions: ['.fx', '.vsh', '.psh', '.hsh', '.dsh', '.csh'],
    aliases: ['HLSL', 'hlsl', 'openhlsl'],
    mimetypes: ['application/hlsl'],
    loader: () => import('./hlsl')
});


const options: monaco.editor.IEditorConstructionOptions = {
    selectOnLineNumbers: true,
    fontSize: 12,
    renderWhitespace: 'none',
    lineHeight: 14,
    minimap: {
        enabled: false
    },
    automaticLayout: true,
    glyphMargin: true,
    theme: 'vs-dark',
    language: LANGUAGE_ID,
    lineDecorationsWidth: 0,
    cursorSmoothCaretAnimation: true,
    fontLigatures: true
};



export interface ISourceEditorProps extends IStoreState, IWithStyles<typeof styles> {
    name?: string;
    actions: typeof sourceActions;
}



@injectSheet(styles)
class SourceEditor extends React.Component<ISourceEditorProps> {

    codeLensProvider: monaco.IDisposable = null;
    hoverProvider: monaco.IDisposable = null;
    completionProvider: monaco.IDisposable = null;
    documentSymbolProvider: monaco.IDisposable = null;
    signatureHelpProvider: monaco.IDisposable = null;

    mouseDownEvent: monaco.IDisposable = null;

    // cache for previously set decorations/breakpoints
    decorations: string[] = [];

    pendingValidationRequests = new Map<string, number>();


    // cache for params
    parserParamsCache: IParserParams = null;

    setupDecorations(): monaco.editor.IModelDeltaDecoration[] {
        const { props } = this;
        const { classes } = props;

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        const cls = {
            error: classes.errorMarker,
            warning: classes.warningMarker
        };


        const file = this.getFile();
        for (const key in file.markers) {
            const { range, type, tooltip, range: { start, end }, payload } = file.markers[key];
            if (!tooltip && type === 'marker') {
                decorations.push({
                    range: new monaco.Range(start.line + 1, start.column + 1, end.line + 1, end.column + 1),
                    options: { inlineClassName: classes.yellowMarker }
                });
            } else {
                switch (type) {
                    case 'error':
                        decorations.push({
                            range: new monaco.Range(start.line + 1, start.column + 1, end.line + 1, end.column + 1),
                            options: { className: cls[type], hoverMessage: { value: tooltip } },
                        });
                        break;
                    case 'line':
                        decorations.push({
                            range: new monaco.Range(start.line + 1, 0, start.line + 1, 0),
                            options: {
                                isWholeLine: true,
                                className: classes[`dc_${DistinctColor.resolveColor(payload['color'])}`]
                            }
                        });
                        break;
                    default:
                }
            }
        }

        // fixme: clumsy code :/
        for (const key in file.breakpoints) {
            const lineNumber = file.breakpoints[key] + 1;
            decorations.push({
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: { glyphMarginClassName: classes.breakpoint },
            });
        }

        return decorations;
    }

    // handle content's update from outside of the editor
    UNSAFE_componentWillUpdate(nextProps) {
        const file = getFileState(nextProps);
        if (isNull(file.content)) {
            return;
        }

        if (file.content !== this.getContent()) {
            this.validate(file.content);
            this.getEditor().setValue(file.content);
            console.log('%c force reload content from outside', 'background: #ffd1c9; color: #ff3714');
        }
    }

    componentDidUpdate() {
        this.updateDecorations();

        // TEMP: temp solution for parser param sync
        const parserParamsNext = getParser(this.props);
        if (this.parserParamsCache !== parserParamsNext) {
            this.parserParamsCache = parserParamsNext;
            LanguageService.install(parserParamsNext);
        }
    }

    @autobind
    editorWillMount(editor) { }


    // tslint:disable-next-line:max-func-body-length
    @autobind
    editorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
        editor.getModel()
            .updateOptions({ tabSize: 4 });

        //
        // naive breakpoints implementation
        //

        this.mouseDownEvent = editor.onMouseDown((e: monaco.editor.IEditorMouseEvent) => {
            if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
                return;
            }

            const file = this.getFile();
            const { props } = this;
            const { breakpoints } = file;

            let { lineNumber } = e.target.position;

            lineNumber = cdlview(file.debugger.runtime.cdl)
                .resolveBreakpointLocation(lineNumber - 1);

            if (lineNumber === -1) {
                return;
            }

            if (breakpoints.indexOf(lineNumber) === -1) {
                props.actions.addBreakpoint(lineNumber);
            } else {
                props.actions.removeBreakpoint(lineNumber);
            }
        });

        const self = this;
        this.codeLensProvider = monaco.languages.registerCodeLensProvider(
            LANGUAGE_ID,
            {
                provideCodeLenses(model: monaco.editor.ITextModel, token: monaco.CancellationToken)
                    : monaco.languages.CodeLensList | monaco.Thenable<monaco.languages.CodeLensList> {
                    const document = self.createDocument(model);
                    return LanguageService.provideCodeLenses(document, token);
                }
            });


        this.completionProvider = monaco.languages.registerCompletionItemProvider(
            LANGUAGE_ID,
            {
                triggerCharacters: ['(', ',', '=', '+'],
                provideCompletionItems(model, position, context, token)
                    : monaco.Thenable<monaco.languages.CompletionList> {
                    const document = self.createDocument(model);
                    const wordUntil = model.getWordUntilPosition(position);
                    const defaultRange = new monaco.Range(
                        position.lineNumber, wordUntil.startColumn,
                        position.lineNumber, wordUntil.endColumn
                    );

                    // return jsonService.doComplete(document, 
                    // m2p.asPosition(position.lineNumber, position.column), jsonDocument).then((list) => {
                    //     return p2m.asCompletionResult(list, defaultRange);
                    // });

                    console.log('provideCompletionItems', defaultRange, wordUntil);

                    return null;
                },

                resolveCompletionItem(model, position, item, token)
                    : monaco.languages.CompletionItem | monaco.Thenable<monaco.languages.CompletionItem> {
                    // return jsonService.doResolve(m2p.asCompletionItem(item)).then(result => p2m.asCompletionItem(result, item.range));
                    console.log('resolveCompletionItem', m2p.asCompletionItem(item));
                    return null;
                }
            });

        this.signatureHelpProvider = monaco.languages.registerSignatureHelpProvider(
            LANGUAGE_ID,
            {
                signatureHelpTriggerCharacters: ['('],
                signatureHelpRetriggerCharacters: [','],
                provideSignatureHelp(model, position, token, context: monaco.languages.SignatureHelpContext)
                    : monaco.languages.ProviderResult<monaco.languages.SignatureHelpResult> {
                    console.log('provideSignatureHelp', arguments);

                    // const sh = SignatureHelp
                    const value = p2m.asSignatureHelp({
                        signatures: [
                            SignatureInformation.create('int foo(int FOO, int BAR)', 'bla bla bla', ParameterInformation.create('FOO'), ParameterInformation.create('BAR')),
                        ],
                        activeParameter: 1,
                        activeSignature: 0
                    });

                    return { value, dispose() { } };
                }
            }
        );

        // this.documentSymbolProvider = monaco.languages.registerDocumentSymbolProvider(
        //     LANGUAGE_ID, 
        //     {
        //     provideDocumentSymbols(model, token): monaco.languages.DocumentSymbol[] | monaco.Thenable<monaco.languages.DocumentSymbol[]> {
        //         const document = self.createDocument(model);
        //         // const jsonDocument = jsonService.parseJSONDocument(document);
        //         // return p2m.asSymbolInformations(jsonService.findDocumentSymbols(document, jsonDocument));

        //         // return p2m.asSymbolInformations();
        //     }
        // });

        // // const self = this;
        // this.hoverProvider = monaco.languages.registerHoverProvider(
        //     LANGUAGE_ID,
        //     {
        //         provideHover(model, position, token): monaco.languages.Hover | monaco.Thenable<monaco.languages.Hover> {
        //             // const document = self.createDocument(model);
        //             // const jsonDocument = jsonService.parseJSONDocument(document);
        //             // console.log(model, position, token);
        //             return null;
        //         }
        //     });
    }


    cleanPendingValidation(document: TextDocument): void {
        const request = this.pendingValidationRequests.get(document.uri);
        if (request !== undefined) {
            clearTimeout(request);
            this.pendingValidationRequests.delete(document.uri);
        }
    }


    validate(newContent?: string): void {
        const document = this.createDocument(this.getModel(), newContent);
        this.cleanPendingValidation(document);
        this.pendingValidationRequests.set(document.uri, setTimeout(() => {
            this.pendingValidationRequests.delete(document.uri);
            this.doValidate(document);
        }));
    }

    // tslint:disable-next-line:member-ordering
    static asMarker(diagEntry: IDiagnosticMessage): monaco.editor.IMarkerData {
        const { code, content, start, end, category } = diagEntry;

        const severities = {
            [EDiagnosticCategory.k_Error]: monaco.MarkerSeverity.Error,
            [EDiagnosticCategory.k_Warning]: monaco.MarkerSeverity.Warning
        };

        return {
            severity: severities[category],
            code,
            message: content,
            startLineNumber: start.line + 1,
            startColumn: start.column + 1,
            endLineNumber: end.line + 1,
            endColumn: end.column + 1
        };
    }

    async doValidate(document: TextDocument) {
        if (document.getText().length === 0) {
            this.cleanDiagnostics();
            return;
        }

        const messages = await LanguageService.validate(document);
        monaco.editor.setModelMarkers(this.getModel(), 'default', messages.map(msg => SourceEditor.asMarker(msg)));
    }


    cleanDiagnostics(): void {
        monaco.editor.setModelMarkers(this.getModel(), 'default', []);
    }


    @autobind
    async onChange(content, e) {
        this.validate(content);
        this.props.actions.setContent(content);
    }

    getEditor(): monaco.editor.ICodeEditor {
        // don't know better way :/
        return (this.refs.monaco as any).editor;
    }


    getModel() {
        // tslint:disable-next-line:newline-per-chained-call
        return this.getEditor().getModel();
    }

    getContent() {
        // tslint:disable-next-line:newline-per-chained-call
        return this.getModel().getValue();
    }


    createDocument(model: monaco.editor.IReadOnlyModel, newContent?: string) {
        return TextDocument.create(this.getFile().filename, model.getModeId(), model.getVersionId(), newContent || model.getValue());
    }


    updateDecorations() {
        this.decorations = this.getEditor().deltaDecorations(this.decorations, this.setupDecorations());
        return this.decorations;
    }


    shouldComponentUpdate(nextProps: ISourceEditorProps) {
        const src = getFileState(this.props);
        const dst = getFileState(nextProps);
        return this.getContent() !== dst.content ||
            !deepEqual(src.markers, dst.markers) ||
            !deepEqual(src.breakpoints, dst.breakpoints);
    }


    componentWillUnmount() {
        if (this.codeLensProvider) {
            this.codeLensProvider.dispose();
        }

        if (this.hoverProvider) {
            this.hoverProvider.dispose();
        }
    }


    render() {
        const file = this.getFile();
        return (
            <MonacoEditor
                ref='monaco'
                value={ (file.content) }

                width='100%'
                height='calc(100vh - 67px)' // todo: fixme

                options={ options }
                onChange={ this.onChange }
                editorDidMount={ this.editorDidMount }
                editorWillMount={ this.editorWillMount }
            />
        );
    }


    getFile(): IFileState {
        return getFileState(this.props);
    }
}

export default connect<{}, {}, ISourceEditorProps>(mapProps(getCommon), mapActions(sourceActions))(SourceEditor) as any;


