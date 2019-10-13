/* tslint:disable:no-for-in */
/* tslint:disable:forin */
/* tslint:disable:typedef */


import { deepEqual, isNull } from '@lib/common';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import { ETechniqueType, IScope } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/IPartFx';
import { IParseNode, IRange } from '@lib/idl/parser/IParser';
import DistinctColor from '@lib/util/DistinctColor';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { IWithStyles } from '@sandbox/components';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import injectSheet from 'react-jss';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';

export const styles = {
    yellowMarker: {
        backgroundColor: 'rgba(255,255,0,0.3)'
    },

    errorMarker: {
        top: '1px',
        background: `url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23f48771'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left`
    },

    warningMarker: {
        top: '1px',
        filter: 'hue-rotate(45deg)',
        background: `url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23f48771'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left`
    },

    breakpoint: {
        background: 'red'
    },

    ...DistinctColor.buildVariousClasses('dc')
};

let timer = (delay) => new Promise(done => { setTimeout(done, delay) });

class MyCodeLensProvider implements monaco.languages.CodeLensProvider {

    constructor(protected getScope: () => IScope) {
        
    }

    async provideCodeLenses(model: monaco.editor.ITextModel, token: monaco.CancellationToken)
        // : Promise<any>
        : Promise<monaco.languages.CodeLensList>
    // : monaco.languages.ProviderResult<monaco.languages.CodeLensList> 
    {
        // fixme: hack for sync between editor and analisys results
        await timer(500); // << waiting for parsing completing

        let lenses = [];
        let scope = this.getScope();
        let range: monaco.Range;
        let loc: IRange;
        let sourceNode: IParseNode;

        if (!isNull(scope)) {
            for (const techniqueName in scope.techniqueMap) {
                const technique = scope.techniqueMap[techniqueName];
                if (technique.type == ETechniqueType.k_PartFx) {
                    const partFx = technique as IPartFxInstruction;

                    if (partFx.spawnRoutine) {
                        sourceNode = partFx.spawnRoutine.function.definition.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[spawn routine]` } });
                    }

                    if (partFx.initRoutine) {
                        sourceNode = partFx.initRoutine.function.definition.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[init routine]` } });
                    }

                    if (partFx.updateRoutine) {
                        sourceNode = partFx.updateRoutine.function.definition.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[update routine]` } });
                    }

                    if (partFx.particle && !partFx.particle.builtIn) {
                        sourceNode = partFx.particle.sourceNode;
                        loc = sourceNode.loc;

                        range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                        lenses.push({ range, command: { id: null, title: `[particle]` } });
                    }

                    for (let pass of partFx.passList) {
                        if (pass.prerenderRoutine) {
                            sourceNode = pass.prerenderRoutine.function.definition.sourceNode;
                            loc = sourceNode.loc;

                            range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                            lenses.push({ range, command: { id: null, title: `[prerender routine]` } });

                            sourceNode = pass.material.sourceNode;
                            loc = sourceNode.loc;
                            range = monaco.Range.fromPositions({ lineNumber: loc.start.line + 1, column: loc.start.column + 1 });
                            lenses.push({ range, command: { id: null, title: `[material]` } });
                        }
                    }
                }
            }

        }
        // let lenses = this.getBreakpoints().map(brk => {
        //     let range = new monaco.Range(brk + 1, 5, brk + 1, 5);
        //     return {
        //         range,
        //         ...c
        //     }
        // });

        return {
            lenses,
            dispose() {
                // console.log('disposed!');
            }
        };
    }

    onDidChange() {
        // console.log('on did change');
        return {
            dispose() {
                console.log('onDidChange() => dispose()');
            }
        }
    }
}





export interface ISourceEditorProps extends IFileState, IWithStyles<typeof styles> {
    name?: string;
    actions: typeof sourceActions;
}


export interface ISourceEditorState {
    showWhitespaces: boolean;
}

interface IMarginData {
    isAfterLines: boolean;
    glyphMarginLeft: number;
    glyphMarginWidth: number;
    lineNumbersWidth: number;
    offsetX: number;
}


@injectSheet(styles)
class SourceEditor extends React.Component<ISourceEditorProps> {

    state: ISourceEditorState = {
        showWhitespaces: false,
    };

    provider: monaco.IDisposable = null;

    // cache for previously set decorations/breakpoints
    decorations: string[] = [];

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
                    options: { inlineClassName: classes.yellowMarker },
                });
            } else {
                switch(type) {
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
        for (let key in props.breakpoints) {
            let lineNumber = props.breakpoints[key] + 1;
            decorations.push({
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: { glyphMarginClassName: classes.breakpoint },
            });
        }

        return decorations;
    }


    // componentDidMount() {
    // }

    componentDidUpdate() {
        this.updateDecorations();
    }

    @autobind
    editorWillMount(monaco) {
    }

    @autobind
    editorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
        editor.getModel()
              .updateOptions({ tabSize: 4 });

        editor.onMouseDown((e: monaco.editor.IEditorMouseEvent) => {
            const data = e.target.detail as IMarginData;
            if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
                //  || data.isAfterLines
                //  || !this.marginFreeFromNonDebugDecorations(e.target.position.lineNumber)
            ) {
                return;
            }

            let { props } = this;
            let { breakpoints } = props;
            let { lineNumber } = e.target.position;

            lineNumber = cdlview(props.debugger.runtime.cdl).resolveBreakpointLocation(lineNumber - 1);
            if (lineNumber === -1) {
                return;
            }

            if (breakpoints.indexOf(lineNumber) === -1) {
                props.actions.addBreakpoint(lineNumber);
            } else {
                props.actions.removeBreakpoint(lineNumber);
            }
        });

        // editor.setPosition({ lineNumber: 1, column: 1 });
        // editor.focus();
        // console.log('editor did mount!');


    }

    @autobind
    async onChange(content, e) {
        // let begin = Date.now();
        // let props: any = this.props;
        // console.log(await props.$dispatch(props.$rowActions.setContent(content)));
        if (this.provider) {
            // this.provider.dispose();
            // this.provider = null;
        }
        this.props.actions.setContent(content);
    }

    get editor(): monaco.editor.ICodeEditor {
        // don't know better way :/
        return (this.refs.monaco as any).editor;
    }


    get model() {
        return this.editor.getModel();
    }

    updateDecorations() {
        this.decorations = this.editor.deltaDecorations(this.decorations, this.setupDecorations());
        return this.decorations;
    }

    shouldComponentUpdate(nextProps: ISourceEditorProps, nextState: ISourceEditorState) {
        const renderRequired = this.props.content !== nextProps.content ||
            !deepEqual(this.props.markers, nextProps.markers) ||
            !deepEqual(this.props.breakpoints, nextProps.breakpoints);
        // todo: add state checking

        if (nextProps.analysis && this.props.analysis !== nextProps.analysis) {
            // console.log('codelens update required');
            if (!this.provider) {
                this.provider = monaco.languages.registerCodeLensProvider(
                    '*',
                    new MyCodeLensProvider(() => this.props.analysis.scope)
                );
            }
        }

        return renderRequired;
    }


    render() {
        const { props } = this;
        const { showWhitespaces } = this.state;

        const options: monaco.editor.IEditorConstructionOptions = {
            selectOnLineNumbers: true,
            fontSize: 12,
            renderWhitespace: showWhitespaces ? "all" : "none",
            lineHeight: 14,
            minimap: {
                enabled: false
            },
            automaticLayout: true,
            glyphMargin: true,
            theme: "vs-dark",
            language: "cpp",
            lineDecorationsWidth: 0,
            cursorSmoothCaretAnimation: true,
            fontLigatures: true
        };

        return (
            <MonacoEditor
                ref="monaco"
                value={ (props.content || '') }

                width="100%"
                height="calc(100vh - 41px)" // todo: fixme

                options={ options }
                onChange={ this.onChange }
                editorDidMount={ this.editorDidMount }
                editorWillMount={ this.editorWillMount }
            />
        );
    }
}

export default connect<{}, {}, ISourceEditorProps>(mapProps(getSourceCode), mapActions(sourceActions))(SourceEditor) as any;


