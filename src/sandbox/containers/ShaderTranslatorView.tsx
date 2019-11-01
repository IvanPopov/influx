/* tslint:disable:typedef */

import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { mapProps, getCommon, matchLocation } from '@sandbox/reducers';
import { getFileState, filterPartFx, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState, { IFileState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import { MonacoDiffEditor } from 'react-monaco-editor';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { isNumber } from 'util';

interface IShaderTranslatorViewProps extends IStoreState, RouteComponentProps {

}

@(withRouter as any)
class ShaderTranslatorView extends React.Component<IShaderTranslatorViewProps> {

    @autobind
    editorDidMount(editor: monaco.editor.IDiffEditor) {
        const { modified, original } = editor.getModel();
        modified.updateOptions({ tabSize: 4 });
        original.updateOptions({ tabSize: 4 });
    }

    // shouldComponentUpdate(nextProps) {

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
        const pass = fx.passList.find((pass, i) => isNumber(match.params.pass)
            ? i === Number(match.params.pass)
            : pass.name === match.params.pass);

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

                original={ file.content }
                value={ vs.toCode() }

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

