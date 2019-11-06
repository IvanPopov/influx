/* tslint:disable:typedef */

import { isNumber } from '@lib/common';
import * as Glsl from '@lib/fx/translators';
// import { IRange } from '@lib/idl/parser/IParser';
import { getCommon, mapProps, matchLocation } from '@sandbox/reducers';
import { filterPartFx, getFileState, getScope } from '@sandbox/reducers/sourceFile';
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
        const { props } = this;

        const match = matchLocation(props);
        const file = getFileState(props);
        const scope = getScope(file);

        if (!scope) {
            return null;
        }

        const fxList = filterPartFx(scope);
        const fx = fxList.find(tech => tech.name === match.params.name);

        if (!fx) {
            return null;
        }

        const pass = fx.passList.find((pass, i) => isNumber(match.params.pass)
            ? i === Number(match.params.pass)
            : pass.name === match.params.pass);

            // vs.sourceNode.loc

        const options: monaco.editor.IEditorConstructionOptions = {
            selectOnLineNumbers: true,
            fontSize: 12,
            renderWhitespace: 'none',
            lineHeight: 14,
            minimap: {
                enabled: false
            },
            automaticLayout: true,
            glyphMargin: false,
            theme: 'vs-dark',
            language: 'cpp',
            lineDecorationsWidth: 0,
            cursorSmoothCaretAnimation: false,
            fontLigatures: true
        };

        const vs = pass.vertexShader;

        return (
            <MonacoDiffEditor
                ref='monaco'

                original={ Glsl.emitCode(vs, { type: 'vertex' }) }
                value={ Glsl.emitGlsl(vs, { type: 'vertex' }) }

                width='100%'
                height='calc(100vh - 74px)' // todo: fixme

                options={ options }
                editorDidMount={ this.editorDidMount }
                // onChange={ this.onChange }
                // editorWillMount={ this.editorWillMount }
            />
        );
    }
}


export default connect<{}, {}, IShaderTranslatorViewProps>(mapProps(getCommon), null)
    (ShaderTranslatorView) as any;

