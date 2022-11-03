/* tslint:disable:typedef */

import * as Hlsl from '@lib/fx/translators/CodeEmitter';
import * as FxHlsl from '@lib/fx/translators/FxEmitter';
import * as FxTranslator from '@lib/fx/translators/FxTranslator';
import * as Glsl from '@lib/fx/translators/GlslEmitter';
import { getCommon, mapProps, matchLocation } from '@sandbox/reducers';
import { filterTechniques, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import { MonacoDiffEditor } from 'react-monaco-editor';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';

interface IShaderTranslatorViewProps extends IStoreState, RouteComponentProps {

}


// function cutSourceRange(content: string, range: IRange): string {
//     const { start, end } = range;
//     // console.log(range);
//     const lines = content.split('\n').slice(start.line, end.line + 1);
//     lines[0] = lines[0].substr(start.column);
//     lines[lines.length - 1] = lines[lines.length - 1].substr(0, end.column);
//     return lines.join('\n');
// }

const diffOptions: monaco.editor.IDiffEditorConstructionOptions = {
    selectOnLineNumbers: true,
    fontSize: 12,
    renderWhitespace: 'none',
    lineHeight: 14,
    minimap: {
        enabled: false
    },
    automaticLayout: true,
    glyphMargin: false,
    // theme: 'vs-dark',
    lineDecorationsWidth: 0,
    cursorSmoothCaretAnimation: false,
    fontLigatures: true,

    // diff specific options
    occurrencesHighlight: false,
    renderLineHighlight: 'none',
    // renderIndentGuides: false,
    readOnly: true,
    renderControlCharacters: false,
    ignoreTrimWhitespace: true
};

@(withRouter as any)
class ShaderTranslatorView extends React.Component<IShaderTranslatorViewProps> {

    @autobind
    editorDidMount(editor: monaco.editor.IDiffEditor) {
        const { modified, original } = editor.getModel();
        modified.updateOptions({ tabSize: 4 });
        original.updateOptions({ tabSize: 4 });
    }

    // shouldComponentUpdate(nextProps: IShaderTranslatorViewProps) {
    //     return getFileState(this.props).content !== getFileState(nextProps).content;
    // }

    // tslint:disable-next-line:typedef
    render() {
        // console.log('ShaderTranslatorView::render()');
        const { props } = this;

        const match = matchLocation(props);
        const file = getFileState(props);
        const scope = getScope(file);
        const pg = getPlaygroundState(props);

        if (!scope) {
            return null;
        }

        const fxList = filterTechniques(scope);
        const fx = fxList.find(tech => tech.name === match.params.name);

        if (!fx) {
            return null;
        }

        let original: string;
        let value: string;

        if (match.params.pass) {
            const pass = fx.passList.find((instr, i) => /^[0-9]+$/.test(match.params.pass)
                ? i === Number(match.params.pass)
                : instr.name === match.params.pass);

                if (!pass) {
                    return (<div>Ooops!...</div>);
                }

            const mode = match.params.property === 'VertexShader' ? 'vertex' : 'pixel';
            const shader = mode === 'vertex' ? pass.vertexShader : pass.pixelShader;

            original = Hlsl.translate(shader, { mode });
            switch (pg.shaderFormat) {
                case 'glsl':
                    value = Glsl.translate(shader, { mode });
                    break;
                case 'hlsl':
                   value = Hlsl.translate(shader, { mode });
                   break;
            }
        } else {
            original = FxHlsl.translate(fx);
            value = FxTranslator.translateFlat(fx);
        }

        return (
            <MonacoDiffEditor
                ref='monaco'

                original = { original }
                value={ value }

                width='100%'
                height='calc(100vh - 63px)' // todo: fixme

                options={ diffOptions }
                editorDidMount={ this.editorDidMount }
            // onChange={ this.onChange }
            // editorWillMount={ this.editorWillMount }
            />
        );
    }
}


export default connect<{}, {}, IShaderTranslatorViewProps>(mapProps(getCommon), null)
    (ShaderTranslatorView) as any;

