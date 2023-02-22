/* tslint:disable:no-for-in */
/* tslint:disable:forin */
/* tslint:disable:typedef */


import { deepEqual, isNull } from '@lib/common';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import DistinctColor from '@lib/util/DistinctColor';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { getCommon, mapProps } from '@sandbox/reducers';
import { getParser } from '@sandbox/reducers/parserParams';
import { getFileState } from '@sandbox/reducers/sourceFile';
import IStoreState, { IFileState, IParserState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as Comlink from 'comlink';
import * as monaco from 'monaco-editor';
import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from 'monaco-languageclient/lib/monaco-converter';
import * as React from 'react';
import withStyles, { WithStylesProps } from 'react-jss';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';
import * as Depot from '@sandbox/reducers/depot';
import { Diagnostic, DiagnosticSeverity, TextDocument, TextDocumentIdentifier, SignatureHelp } from 'vscode-languageserver-types';
// tslint:disable-next-line:no-submodule-imports
// import LanguageServiceWorker from 'worker-loader!./LanguageServiceProvider';
import { LanguageServiceWorker } from './LanguageServiceWorker'

import { ILanguageServiceProvider } from './LanguageServiceProvider';
import styles from './styles.jss';
import { getDepot } from '@sandbox/reducers/depot';

const m2p = new MonacoToProtocolConverter(monaco as any); // FIXME
const p2m = new ProtocolToMonacoConverter(monaco as any); // FIXME

const provider = Comlink.wrap<ILanguageServiceProvider>(new LanguageServiceWorker());


function defer() {
    const deferred = {
        promise: null,
        resolve: null,
        reject: null
    };

    // tslint:disable-next-line:promise-must-complete
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    return deferred;
}

type IDefer = ReturnType<typeof defer>;

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


const options: monaco.editor.IStandaloneEditorConstructionOptions = {
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
    fontLigatures: true,
};



export interface ISourceEditorProps extends IStoreState, Partial<WithStylesProps<typeof styles>> {
    name?: string;
    actions: typeof sourceActions;
}


class SourceEditor extends React.Component<ISourceEditorProps> {

    codeLensProvider: monaco.IDisposable = null;
    hoverProvider: monaco.IDisposable = null;
    completionProvider: monaco.IDisposable = null;
    documentSymbolProvider: monaco.IDisposable = null;
    signatureHelpProvider: monaco.IDisposable = null;

    mouseDownEvent: monaco.IDisposable = null;

    // cache for previously set decorations/breakpoints
    decorations: string[] = [];

    pendingValidationRequests = new Map<string, NodeJS.Timeout>();
    deferredRequests: IDefer[] = [];

    // cache for params
    parserParamsCache: Object = {};

    model: monaco.editor.ITextModel;

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
                                // inlineClassName
                            }
                        });
                        break;
                    case 'unreachable-code':
                        decorations.push({
                            range: new monaco.Range(start.line + 1, 0, end.line, 0),
                            options: {
                                isWholeLine: true,
                                inlineClassName: classes.unreachanbleCode
                            }
                        });
                        break;
                    case 'deprecated':
                        decorations.push({
                            range: new monaco.Range(start.line + 1, start.column + 1, end.line + 1, end.column + 1),
                            options: { 
                                inlineClassName: classes.deprecated, 
                                hoverMessage: { value: tooltip }
                            },
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
            this.validate(file.content, file.uri);
            this.getEditor().setValue(file.content);
            console.log('%c force reload content from outside', 'background: #ffd1c9; color: #ff3714');
        }
    }

    componentDidUpdate() {
        this.updateDecorations();

        // TEMP: temp solution for parser param sync
        this.validateParser(this.props);
    }

    componentDidMount() {
         // TEMP: temp solution for parser param sync
         this.validateParser(this.props);
    }

    validateParser(stateNext: IStoreState) {
        const parserStateNext: IParserState = getParser(stateNext);
        const parserProps = [ 'flags', 'type', 'grammar', 'parsingFlags' ];
        const paramsChanges = !parserProps.every(propName => this.parserParamsCache[propName] === parserStateNext[propName]);
        const defines = stateNext.sourceFile.defines.map( name => ({ name }) );
        if (paramsChanges) {
            parserProps.forEach(propName => this.parserParamsCache[propName] = parserStateNext[propName]);

            const { grammar, flags, type, parsingFlags } = parserStateNext;
            if (grammar) {
                provider.init({ grammar, flags, type }, parsingFlags, Comlink.proxy((name: string) => {
                    // IP: don't use closure here?
                    return Depot.makeResolver(getDepot(this.props))(name);
                }), defines);
            }
        }
    }

    @autobind
    editorWillMount(editor) { }


    pendingValidations() {
        const def = defer();
        if (this.pendingValidationRequests.size > 0) {
            this.deferredRequests.push(def);
            return def.promise;
        }

        def.resolve();
        return def.promise;
    }

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

            lineNumber = cdlview(file.debugger.bcDocument.program?.cdl)
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
                async provideCodeLenses(model: monaco.editor.ITextModel, token: monaco.CancellationToken)
                    : Promise<monaco.languages.CodeLensList> {

                    // validation should always be done before any other requests
                    await self.pendingValidations();
                    return p2m.asCodeLensList(await provider.provideFxCodeLenses(self.asTextDocumentIdentifier()));
                }
            });


        this.completionProvider = monaco.languages.registerCompletionItemProvider(
            LANGUAGE_ID,
            {
                triggerCharacters: ['(', ',', '=', '+'],
                provideCompletionItems(model, position, context, token)
                    : monaco.Thenable<monaco.languages.CompletionList> {
                    // const document = self.createDocument(model);
                    const wordUntil = model.getWordUntilPosition(position);
                    const defaultRange = new monaco.Range(
                        position.lineNumber, wordUntil.startColumn,
                        position.lineNumber, wordUntil.endColumn
                    );

                    // return jsonService.doComplete(document,
                    // m2p.asPosition(position.lineNumber, position.column), jsonDocument).then((list) => {
                    //     return p2m.asCompletionResult(list, defaultRange);
                    // });

                    // console.log('provideCompletionItems', defaultRange, wordUntil);

                    return null;
                },

                resolveCompletionItem(item, token)
                    : monaco.languages.CompletionItem | monaco.Thenable<monaco.languages.CompletionItem> {
                    // return jsonService.doResolve(m2p.asCompletionItem(item)).then(result => p2m.asCompletionItem(result, item.range));
                    console.log('resolveCompletionItem', m2p.asCompletionItem(item));
                    return null;
                }
            });

        // TODO: do not pass whole document
        this.signatureHelpProvider = monaco.languages.registerSignatureHelpProvider(
            LANGUAGE_ID,
            {
                signatureHelpTriggerCharacters: ['('],
                signatureHelpRetriggerCharacters: [','],
                async provideSignatureHelp(
                    model: monaco.editor.ITextModel,
                    position: monaco.Position,
                    token,
                    context: monaco.languages.SignatureHelpContext)
                    : Promise<monaco.languages.SignatureHelpResult> {

                    // validation should always be done before any other requests
                    await self.pendingValidations();

                    const signatureHelp: SignatureHelp = await provider.provideSignatureHelp(
                        self.asTextDocumentIdentifier(), m2p.asPosition(position.lineNumber, position.column));
                    return signatureHelp && p2m.asSignatureHelpResult(signatureHelp as any); // TODO: fixme, wrong type?
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

    asTextDocumentIdentifier(): TextDocumentIdentifier {
        return {
            uri: this.getFile().uri
        };
    }


    cleanPendingValidation(document: TextDocument): void {
        const request = this.pendingValidationRequests.get(document.uri);
        if (request !== undefined) {
            clearTimeout(request);
            this.pendingValidationRequests.delete(document.uri);
        }
    }


    validate(newContent?: string, newUri?: string): void {
        const document = this.createDocument(this.getModel(), newContent, newUri);

        if (isNull(document.uri)) {
            return;
        }

        this.cleanPendingValidation(document);
        this.pendingValidationRequests.set(document.uri, setTimeout(async () => {
            await this.doValidate(document);
            this.pendingValidationRequests.delete(document.uri);
        }));
    }

    // tslint:disable-next-line:member-ordering
    static asMarker(diag: Diagnostic): monaco.editor.IMarkerData {
        const { code, message, range: { start, end }, severity, source } = diag;

        const severities = {
            [DiagnosticSeverity.Error]: monaco.MarkerSeverity.Error,
            [DiagnosticSeverity.Warning]: monaco.MarkerSeverity.Warning
        };

        return {
            severity: severities[severity],
            code: code as string,
            message,
            startLineNumber: start.line + 1,
            startColumn: start.character + 1,
            endLineNumber: end.line + 1,
            endColumn: end.character + 1
        };
    }

    async doValidate(document: TextDocument) {
        if (document.getText().length === 0) {
            this.cleanDiagnostics();
            return;
        }

        // const messages = await LanguageService.validate(document);
        const diagnostics = await provider.validate(document);
        monaco.editor.setModelMarkers(this.getModel(), 'default', diagnostics.map(diag => SourceEditor.asMarker(diag)));
        this.deferredRequests.forEach(def => def.resolve());
        this.deferredRequests = [];

        // const unreachanbleCode = await provider.provideUnreachableCodeBlocks(document);
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


    getModel(): monaco.editor.ITextModel {
        // tslint:disable-next-line:newline-per-chained-call
        return this.getEditor().getModel();
    }

    getContent() {
        // tslint:disable-next-line:newline-per-chained-call
        return this.getModel().getValue();
    }


    createDocument(model: monaco.editor.IReadOnlyModel, newContent?: string, newUri?: string) {
        return TextDocument.create(newUri || this.getFile().uri, "0"/*model.getModeId()*/, model.getVersionId(), newContent || model.getValue());
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

    // componentWillMount() {
    //     const file = this.getFile();
    //     const uri = monaco.Uri.parse(`inmemory://${file.filename}`);
    //     this.model = monaco.editor.createModel(file.content, LANGUAGE_ID, uri);
    // }

    render() {
        const file = this.getFile();
        // const uri = monaco.Uri.parse(`inmemory://${file.filename}`);
        const content = file.content;

        return (
            <MonacoEditor
                ref='monaco'
                value={ content }
                width='100%'
                height='calc(100vh - 63px)' // todo: fixme

                options={ { ...options } }
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

export default connect<{}, {}, ISourceEditorProps>(mapProps(getCommon), mapActions(sourceActions))(withStyles(styles)(SourceEditor)) as any;


