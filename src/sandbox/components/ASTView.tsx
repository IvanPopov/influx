import { IMap } from '@lib/idl/IMap';
import { IParseNode } from '@lib/idl/parser/IParser';
import { getCommon, mapProps } from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import * as copy from 'copy-to-clipboard';
import * as React from 'react';
import { connect } from 'react-redux';
import { List } from 'semantic-ui-react';



export interface IASTViewProps extends IStoreState {
    onNodeOut: (id: string) => void;
    onNodeOver: (id: string, node: IParseNode) => void;
}

class ASTView extends React.Component<IASTViewProps, {}> {
    state: {
        nodeStats: IMap<{ opened: boolean; selected: boolean; }>;
    };

    constructor(props) {
        super(props);
        this.state = {
            nodeStats: {}
        };
    }

    /*

    render() {
        // const { state: { parseTree } } = this;
        const parseTree = this.props.sourceFile.parseTree;

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto',
            whiteSpace: 'pre',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
            fontSize: '12px',
            lineHeight: 'normal',
            cursor: 'pointer'
        };

        return (
            <div style={ style as any }>
                { this.renderASTNode(parseTree ? parseTree.getRoot() : null) }
            </div>
        );
    }

    private renderASTNode(node: IParseNode, idx = '0') {
        if (!node) {
            return null;
        }
        const { nodeStats } = this.state;
        const forceShow = idx.split('.').length < 2;
        const show = forceShow || (nodeStats[idx] || { opened: false, selected: false }).opened;
        const selected = (nodeStats[idx] || { opened: false, selected: false }).selected;

        let depth = idx.split('.').length;
        let pad = '';
        for (let i = 0; i < depth; ++ i) {
            pad += '  ';
        }

        if (node.value) {
            return (
                <div key={ idx }
                    onClick={ this.handleNodeClick.bind(this, idx, node) }
                    onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                    onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                >  { pad }<span style={ { fontWeight: 'bold' } }>{ node.name }</span>: { node.value }</div>
            );
        }
        else {
            let children = null;
            if (show) {
                children = node.children.map((node, i) => this.renderASTNode(node, `${idx}.${i}`)).reverse();
            }
            return (
                <div key={ idx }
                    onClick={ this.handleNodeClick.bind(this, idx, node) }
                    onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                    onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                >{ pad }<span style={ { fontWeight: 'bold' } }>{ show ? `- ` : `+ ` }{ node.name }&nbsp;<a style={ { display: selected ? 'inline' : 'none' } } onClick={ this.handleCopyClick.bind(this, idx, node) }>Copy</a></span>{ children }</div>
            );
        }
    }
    */

    render() {
        // const { state: { parseTree } } = this;
        const parseTree = this.props.sourceFile.parseTree;

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto'
        };

        return (
            <List style={ style } selection size="small" className="astlist">
                { this.renderASTNode(parseTree ? parseTree.getRoot() : null) }
            </List>
        );
    }

    private renderASTNode(node: IParseNode, idx = '0') {
        if (!node) {
            return null;
        }
        const { nodeStats } = this.state;
        const forceShow = idx.split('.').length < 2;
        const show = forceShow || (nodeStats[idx] || { opened: false, selected: false }).opened;
        const selected = (nodeStats[idx] || { opened: false, selected: false }).selected;

        if (node.value) {
            return (
                <List.Item key={ idx }
                    onClick={ this.handleNodeClick.bind(this, idx, node) }
                    onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                    onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                    className="astnode"
                >
                    <List.Icon />
                    <List.Content>
                        <List.Header>{ node.name }</List.Header>
                        <List.Description>{ node.value }</List.Description>
                    </List.Content>
                </List.Item>
            );
        }
        else {
            let children = null;
            if (show) {
                children = (<List.List className="astlist"> { node.children.map((node, i) => this.renderASTNode(node, `${idx}.${i}`)).reverse() } </List.List>);
            }
            return (
                <List.Item key={ idx }
                    onClick={ this.handleNodeClick.bind(this, idx, node) }
                    onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                    onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                    className="astnode"
                >
                    <List.Icon name={ show ? `chevron down` : `chevron right` } />
                    <List.Content>
                        <List.Header>
                            { node.name }&nbsp;
                            <a style={ { display: selected ? 'inline' : 'none' } }
                                onClick={ this.handleCopyClick.bind(this, idx, node) }>Copy</a>
                        </List.Header>
                        { children }
                    </List.Content>
                </List.Item>
            );
        }
    }


    private async handleCopyClick(idx: string, node: IParseNode, e: MouseEvent) {
        e.stopPropagation();

        let out = [];
        out.push(`/**`);
        out.push(` * AST example:`)
        out.push(` *    ${node.name}`)
        out = out.concat(node.children.slice().map(node => ` *       ${node.children ? '+' : ' '} ${node.name} ${node.value ? '= ' + '\'' + node.value + '\'' : ''}`));
        out.push(` */`);

        copy(out.join('\n'), { debug: true });
    }


    private async handleNodeOver(idx: string, node: IParseNode, e: MouseEvent) {
        e.stopPropagation();

        let { nodeStats } = this.state;

        let val = { opened: false, selected: false, ...nodeStats[idx] };
        val.selected = !val.selected;
        nodeStats = { ...nodeStats, [idx]: val };

        this.setState({ nodeStats });
        this.props.onNodeOver(idx, node);
    }


    private async handleNodeOut(idx: string, node: IParseNode, e: MouseEvent) {
        e.stopPropagation();

        let { nodeStats } = this.state;

        let val = { opened: false, selected: false, ...nodeStats[idx] };
        val.selected = !val.selected;
        nodeStats = { ...nodeStats, [idx]: val };

        this.setState({ nodeStats });
        this.props.onNodeOut(idx);
    }


    private handleNodeClick(idx: string, node: IParseNode, e: MouseEvent) {
        e.stopPropagation();

        let { nodeStats } = this.state;

        let val = { opened: false, selected: false, ...nodeStats[idx] };
        val.opened = !val.opened;
        nodeStats = { ...nodeStats, [idx]: val };

        this.setState({ nodeStats });
    }
}


export default connect<{}, {}, IASTViewProps>(mapProps(getCommon), {})(ASTView) as any;

