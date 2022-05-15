import * as React from 'react';
import * as monaco from "monaco-editor";
import MonacoEditor from "react-monaco-editor";
import { getCommon, mapProps } from '@sandbox/reducers';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { connect } from 'react-redux';
import withStyles, { WithStylesProps } from 'react-jss';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import { graph as graphActions } from '@sandbox/actions';
import { Segment } from 'semantic-ui-react';

export const styles = {
};

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

export interface IProps extends IStoreState, Partial<WithStylesProps<typeof styles>> {
    actions: typeof graphActions;
}

class GraphConfigView extends React.Component<IProps> {
    @autobind
    async onChange(content, e) {
        // this.validate(content);
        this.props.actions.spicifyFxPartStructure(content);
    }

    render() {
        const docs = this.props.sourceFile.nodeDocs;
        return (
            <div>
                <MonacoEditor
                    ref='monaco'
                    value={"float3 speed;\nfloat3 pos;\nfloat size;\nfloat timelife;"}
                    width='100%'
                    height='calc(150px)' // todo: fixme
                    options={monacoOptions}
                    onChange={this.onChange}
                />
                { docs && 
                    <Segment secondary>
                        { docs }
                    </Segment>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IProps>(mapProps(getCommon), mapActions({ ...graphActions }))(withStyles(styles)(GraphConfigView)) as any;
