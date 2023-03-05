/* tslint:disable:typedef */

import { CodeEmitter as HLSLEmitter, CodeContext as HLSLContext } from '@lib/fx/translators/CodeEmitter';
import { CodeConvolutionEmitter as HLSLConvolutionEmitter, CodeConvolutionContext as HLSLConvolutionContext, ICodeConvolutionContextOptions as IConvOptions } from '@lib/fx/translators/CodeConvolutionEmitter';
import { FxConvolutionContext, FxEmitter } from '@lib/fx/translators/FxEmitter';
import { FxTranslatorContext, FxTranslator } from '@lib/fx/translators/FxTranslator';
import { GLSLEmitter, GLSLContext } from '@lib/fx/translators/GlslEmitter';
import { getCommon, mapProps, matchLocation } from '@sandbox/reducers';
import { filterTechniques, filterTechniques11, getPlaygroundState } from '@sandbox/reducers/playground';
import { asConvolutionPack, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import { asFxTranslatorOprions as asFxTranslatorOptions } from '@sandbox/reducers/translatorParams';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as monaco from 'monaco-editor';
import * as React from 'react';
import { MonacoDiffEditor } from 'react-monaco-editor';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { assert } from '@lib/common';
import { isString } from '@lib/util/s3d/type';

interface IShaderTranslatorViewProps extends IStoreState, RouteComponentProps {

}


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


    // tslint:disable-next-line:typedef
    render() {
        const { props } = this;

        const match = matchLocation(props);
        const file = getFileState(props);
        const scope = getScope(file);
        const pg = getPlaygroundState(props);

        if (!scope) {
            return null;
        }

        const entryFunc = scope.findFunction(match.params.name, null);

        if (!entryFunc) {
            console.warn(`<${match.params.name}> entry function has not been found!`);
            return null;
        }

        let original: string;
        let value: string;

        const convolute = true;
        const convPack: IConvOptions = convolute 
            ? asConvolutionPack(props) 
            // provide no sources for convolution
            : { textDocument: null, slastDocument: null };
        const translatorOpts = asFxTranslatorOptions(props);

        // huck way to get type, because all the request
        // like /playground/:name/:fx/:pass/:property is being redirected to 
        // deprectaed ShaderTranslatorView
        // only requests like /playground/:name/:fx/(vertexshader|pixelshader) is being 
        // intercepted by ShaderTranslatorView11
        const shType = match.params.pass;
        const SH_MODE = {
            'VertexShader': 'vs',
            'PixelShader' : 'ps'
        };
        const mode = SH_MODE[shType];
        assert(isString(mode));
        
        original = FxEmitter.translate(entryFunc, new FxConvolutionContext({ ...convPack, mode }));
        value = FxTranslator.translate(entryFunc, new FxTranslatorContext({ ...convPack, ...translatorOpts, mode }));
    
        return (
            <MonacoDiffEditor
                ref='monaco'

                original = { original }
                value={ value }

                width='100%'
                height='calc(100vh - 63px)' // todo: fixme

                options={ diffOptions }
                editorDidMount={ this.editorDidMount }
            />
        );
    }
}


export default connect<{}, {}, IShaderTranslatorViewProps>(mapProps(getCommon), null)
    (ShaderTranslatorView) as any;

