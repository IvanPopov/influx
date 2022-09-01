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
import { Button, Form, Header, Input, Segment } from 'semantic-ui-react';
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

function Capacity({ value, onChange }) {
    const [ref, setValue] = React.useState(value);
    return (
        <div className='ui'>
            <Input size='small' action={{ basic: true, content: 'Set', color: 'green', onClick: e => onChange(ref) }} 
                onChange={e => setValue(e.target.value)} value={ref} />
        </div>
    );
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

    @autobind
    setCapacity(value) {
        this.props.actions.setCapacity(Number(value) || 4096);
    }

    render() {
        const { nodes } = this.props;
        const { docs, env } = nodes;

        const type = env?.root.scope.findType(PART_TYPE);

        return (
            <div>
                <Header as='h5' attached='top'>
                    Particle Layout
                </Header>
                <Segment attached>
                    <MonacoEditor
                        ref='monaco'
                        value={ CodeEmitter.translate(type) }
                        width='100%'
                        height='calc(150px)' // todo: fixme
                        options={monacoOptions}
                        onChange={this.onChange}
                    />
                    <Button onClick={ this.applyLayout }>Apply</Button>
                </Segment>
                <Header as='h5' attached='top'>
                    User Constants
                </Header>
                <Segment attached>
                    <GraphConstants />
                </Segment>
                {/* <Header as='h5' attached='top'>
                    Node Description
                </Header>
                <Segment attached>
                    { docs || "[[ no description found ]]" }
                </Segment> */}
                <Header as='h5' attached='top'>
                    Emitter Properties
                </Header>
                <Segment attached='bottom'>
                    Emitter's capacity is { (this.props.playground.emitter || { getCapacity() { return 0 } }).getCapacity() }.
                    <Capacity value={ (this.props.playground.emitter || { getCapacity() { return 0 } }).getCapacity() } onChange={this.setCapacity} />
                </Segment>
            </div>
        );
    }
}

export default connect<{}, {}, IProps>(mapProps(getCommon), mapActions({ ...nodesActions }))(withStyles(styles)(GraphConfigView)) as any;
