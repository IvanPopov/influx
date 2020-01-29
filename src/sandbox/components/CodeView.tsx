import * as React from "react";
import MonacoEditor from "react-monaco-editor";

export interface ICodeViewProps {
    content: string;
}


const monacoOptions: monaco.editor.IEditorConstructionOptions = {
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
    language: 'hlsl',
    lineDecorationsWidth: 0,
    cursorSmoothCaretAnimation: true,
    fontLigatures: true,
    readOnly: true
};

class CodeView extends React.Component<ICodeViewProps, {}> {
    render() {
        const content = this.props.content;
        return (
            <MonacoEditor
                ref='monaco'
                value={content}
                width='100%'
                height='calc(100vh - 67px)' // todo: fixme
                options={monacoOptions}
            />
        );
    }
}

// export const CodeView: React.FunctionComponent<ICodeViewProps> = ({ content }) =>
//     <MonacoEditor
//         ref='monaco'
//         value={ content }
//         width='100%'
//         height='calc(100vh - 67px)' // todo: fixme
//         options={ monacoOptions }
//     />;

export default CodeView;
