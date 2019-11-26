/* tslint:disable:no-for-in */
/* tslint:disable:forin */
/* tslint:disable:typedef */


import { deepEqual, isNull } from '@lib/common';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import * as FxAnalyzer from '@lib/fx/FxAnalyzer';
import { Parser } from '@lib/parser/Parser';
import { Diagnostics, EDiagnosticCategory, IDiagnosticReport, IDiagnosticMessage } from '@lib/util/Diagnostics';
import DistinctColor from '@lib/util/DistinctColor';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { IWithStyles } from '@sandbox/components';
import { mapProps } from '@sandbox/reducers';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import injectSheet from 'react-jss';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { MyCodeLensProvider } from './CodeLensProvider';
import styles from './styles.jss';

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



export interface ISourceEditorProps extends IFileState, IWithStyles<typeof styles> {
    name?: string;
    actions: typeof sourceActions;
}



@injectSheet(styles)
class SourceEditor extends React.Component<ISourceEditorProps> {

    codeLensProvider: monaco.IDisposable = null;
    hoverProvider: monaco.IDisposable = null;
    mouseDownEvent: monaco.IDisposable = null;

    // cache for previously set decorations/breakpoints
    decorations: string[] = [];

    pendingValidationRequests = new Map<string, number>();

    validateCounter = 0;

    setupDecorations(): monaco.editor.IModelDeltaDecoration[] {
        const { props } = this;
        const { classes } = props;

        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        const cls = {
            error: classes.errorMarker,
            warning: classes.warningMarker
        };

        for (const key in props.markers) {
            const { range, type, tooltip, range: { start, end }, payload } = props.markers[key];
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
        for (const key in props.breakpoints) {
            const lineNumber = props.breakpoints[key] + 1;
            decorations.push({
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: { glyphMarginClassName: classes.breakpoint },
            });
        }

        return decorations;
    }

    componentDidUpdate() {
        if (this.props.content !== this.getContent()) {
            this.getModel().setValue(this.props.content);
            this.validate();
        }
        if (this.validateCounter === 0) {
            this.validate();
        }
        this.updateDecorations();
    }

    @autobind
    editorWillMount(editor) { }


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

            const { props } = this;
            const { breakpoints } = props;

            let { lineNumber } = e.target.position;

            lineNumber = cdlview(props.debugger.runtime.cdl)
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


        this.codeLensProvider = monaco.languages.registerCodeLensProvider(
            LANGUAGE_ID,
            new MyCodeLensProvider(() => getScope(this.props))
        );


        // const self = this;
        this.hoverProvider = monaco.languages.registerHoverProvider(LANGUAGE_ID, {
            provideHover(model, position, token): monaco.languages.Hover | monaco.Thenable<monaco.languages.Hover> {
                // const document = self.createDocument(model);
                // const jsonDocument = jsonService.parseJSONDocument(document);
                console.log(model, position, token);
                return null;
            }
        });

        // // FIXME: dirty hack!
        // setTimeout(() => this.validate(), 2000);
    }


    cleanPendingValidation(document: TextDocument): void {
        const request = this.pendingValidationRequests.get(document.uri);
        if (request !== undefined) {
            clearTimeout(request);
            this.pendingValidationRequests.delete(document.uri);
        }
    }


    validate(): void {
        const document = this.createDocument(this.getModel());
        this.cleanPendingValidation(document);
        this.pendingValidationRequests.set(document.uri, setTimeout(() => {
            this.pendingValidationRequests.delete(document.uri);
            this.doValidate(document);
        }, 250) as any);
        this.validateCounter ++;
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

        // // TODO: temp solution
        // this.props.actions.resetDebugger();

        const parsingResults = await Parser.parse(document.getText(), document.uri);
        const semanticResults = FxAnalyzer.analyze(parsingResults.ast, document.uri);

        const diag = Diagnostics.mergeReports([parsingResults.diag, semanticResults.diag]);

        monaco.editor.setModelMarkers(this.getModel(), 'default', diag.messages.map(msg => SourceEditor.asMarker(msg)));

        this.props.actions.shadowRealodAST({ ast: semanticResults, parseTree: parsingResults.ast });

        if (!diag.errors) {
            this.props.actions.selectEffect(null);
        }
    }


    cleanDiagnostics(): void {
        monaco.editor.setModelMarkers(this.getModel(), 'default', []);
    }


    @autobind
    async onChange(content, e) {
        this.props.actions.setContent(content);
        this.validate();
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


    createDocument(model: monaco.editor.IReadOnlyModel) {
        return TextDocument.create(this.props.filename, model.getModeId(), model.getVersionId(), model.getValue());
    }


    updateDecorations() {
        this.decorations = this.getEditor().deltaDecorations(this.decorations, this.setupDecorations());
        return this.decorations;
    }


    shouldComponentUpdate(nextProps: ISourceEditorProps) {
        return this.props.content !== nextProps.content ||
            !deepEqual(this.props.markers, nextProps.markers) ||
            !deepEqual(this.props.breakpoints, nextProps.breakpoints);
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
        const { props } = this;
        return (
            <MonacoEditor
                ref='monaco'
                value={ (props.content) }

                width='100%'
                height='calc(100vh - 67px)' // todo: fixme

                options={ options }
                onChange={ this.onChange }
                editorDidMount={ this.editorDidMount }
                editorWillMount={ this.editorWillMount }
            />
        );
    }
}

export default connect<{}, {}, ISourceEditorProps>(mapProps(getFileState), mapActions(sourceActions))(SourceEditor) as any;


