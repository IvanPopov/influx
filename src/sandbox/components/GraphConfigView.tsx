import * as React from 'react';
import * as monaco from "monaco-editor";
import MonacoEditor from "react-monaco-editor";
import { getCommon, mapProps } from '@sandbox/reducers';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { connect } from 'react-redux';
import withStyles, { WithStylesProps } from 'react-jss';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import { nodes as nodesActions } from '@sandbox/actions';
import { Button, Segment } from 'semantic-ui-react';
import { PART_TYPE } from './graphEx/common';
import * as CodeEmitter from '@lib/fx/translators/CodeEmitter';
import GraphConstants from './GraphConstants';

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
    actions: typeof nodesActions;
}

class GraphConfigView extends React.Component<IProps> {
    @autobind
    async onChange(content, e) {
        // this.validate(content);
    }

    getEditor(): monaco.editor.ICodeEditor {
        // don't know better way :/
        return (this.refs.monaco as any).editor;
    }

    @autobind
    applyLayout() {
        const layout = this.getEditor().getValue();
        this.props.actions.changeLayout(layout);
    }

    render() {
        const { nodes } = this.props;
        const { docs, env } = nodes;

        const type = env?.root.scope.findType(PART_TYPE);

        return (
            <div>
                <MonacoEditor
                    ref='monaco'
                    value={ CodeEmitter.translate(type) }
                    width='100%'
                    height='calc(150px)' // todo: fixme
                    options={monacoOptions}
                    onChange={this.onChange}
                />
                <Button onClick={ this.applyLayout }>Apply</Button>
                <Segment size='small' basic color='grey'>
                    <GraphConstants />
                </Segment>
                <Segment size='small' basic color='grey'>
                    { docs || "[[ no description found ]]" }
                </Segment>
                

                <Segment size='small' basic color='grey'>
                    Emitter's capacity is { (this.props.playground.emitter || { getCapacity() { return 0 } }).getCapacity() }.
                </Segment>
            </div>
        );
    }
}

export default connect<{}, {}, IProps>(mapProps(getCommon), mapActions({ ...nodesActions }))(withStyles(styles)(GraphConfigView)) as any;
