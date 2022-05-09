import * as React from 'react';
import * as monaco from "monaco-editor";
import MonacoEditor from "react-monaco-editor";

const monacoOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    selectOnLineNumbers: true,
    fontSize: 12,
    renderWhitespace: 'none',
    lineHeight: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    glyphMargin: true,
    theme: 'vs',
    language: 'hlsl',
    lineDecorationsWidth: 0,
    cursorSmoothCaretAnimation: true,
    fontLigatures: true,
    readOnly: false,
    scrollbar: { vertical: 'auto' }
};

class GraphConfigView extends React.Component<{}, {}> {
    render() {
        return (
            <MonacoEditor
                ref='monaco'
                value={"float3 speed;\nfloat3 pos;\nfloat size;\nfloat timelife;"}
                width='100%'
                height='calc(150px)' // todo: fixme
                options={monacoOptions}
            />
        );
    }
}

export default GraphConfigView;