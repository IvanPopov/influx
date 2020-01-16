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

    rootRef: React.RefObject<HTMLDivElement>;

    constructor(props: IASTViewProps) {
        super(props);
        this.state = {
            nodeStats: {}
        };

        this.rootRef = React.createRef();
    }

    componentDidUpdate() {
        // const rect = this.rootRef.current.getBoundingClientRect();
        // just a rude hack
        // this.rootRef.current.style.height = `calc(100vh - ${Math.floor(rect.top) + 50}px)`;
    }

    shouldComponentUpdate(nextProps, nextState) {
        // TODO: implement it
        return true;
    }

    // tslint:disable-next-line:typedef
    render() {
        const slastDocument = this.props.sourceFile.slastDocument;

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto'
        };

        return (
            <div ref={this.rootRef}>
                <List style={ style } selection size='small' className='astlist' >
                    { this.renderASTNode(slastDocument ? slastDocument.root : null) }
                </List>
            </div>
        );
    }

    private renderASTNode(node: IParseNode, idx: string = '0'): JSX.Element {
        if (!node) {
            return null;
        }
        const { nodeStats } = this.state;
        const forceShow = idx.split('.').length < 2;
        const show = forceShow || (nodeStats[idx] || { opened: false, selected: false }).opened;
        const selected = (nodeStats[idx] || { opened: false, selected: false }).selected;

        if (node.value || node.children === null) {
            return (
                <List.Item key={ idx }
                    onClick={ this.handleNodeClick.bind(this, idx, node) }
                    onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                    onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                    className='astnode'
                >
                    {/* FIXME: remove inline style hotfix */ }
                    <List.Icon style={ { minWidth: '12px' } } />
                    <List.Content>
                        <List.Header>{ node.name }</List.Header>
                        <List.Description>{ node.value }</List.Description>
                    </List.Content>
                </List.Item>
            );
        } else {
            let children = null;
            if (show) {
                children = (
                    <List.List className='astlist'>
                        { node.children.map((node, i) => this.renderASTNode(node, `${idx}.${i}`)).reverse() }
                    </List.List>
                );
            }
            return (
                <List.Item key={ idx }
                    onClick={ this.handleNodeClick.bind(this, idx, node) }
                    onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                    onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                    className='astnode'
                >
                    <List.Icon name={ (show ? `chevron down` : `chevron right`) } />
                    <List.Content>
                        <List.Header>
                            { node.name }&nbsp;
                            <a href='/' style={ ({ display: (selected ? 'inline' : 'none') }) }
                                onClick={ this.handleCopyClick.bind(this, idx, node) }>Copy</a>
                        </List.Header>
                        { children }
                    </List.Content>
                </List.Item>
            );
        }
    }


    private async handleCopyClick(idx: string, node: IParseNode, e: MouseEvent): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        let out = [];
        out.push(`/**`);
        out.push(` * AST example:`)
        out.push(` *    ${node.name}`)
        out = out
            .concat(node.children.slice()
            .map(node => ` *       ${node.children ? '+' : ' '} ${node.name} ${node.value ? `= \'${node.value}\'` : ''}`));
        out.push(` */`);

        copy(out.join('\n'), { debug: true });
    }


    private async handleNodeOver(idx: string, node: IParseNode, e: MouseEvent): Promise<void> {
        e.stopPropagation();

        let { nodeStats } = this.state;

        let val = { opened: false, selected: false, ...nodeStats[idx] };
        val.selected = !val.selected;
        nodeStats = { ...nodeStats, [idx]: val };

        this.setState({ nodeStats });
        this.props.onNodeOver(idx, node);
    }


    private async handleNodeOut(idx: string, node: IParseNode, e: MouseEvent): Promise<void> {
        e.stopPropagation();

        let { nodeStats } = this.state;

        const val = { opened: false, selected: false, ...nodeStats[idx] };
        val.selected = !val.selected;
        nodeStats = { ...nodeStats, [idx]: val };

        this.setState({ nodeStats });
        this.props.onNodeOut(idx);
    }


    private handleNodeClick(idx: string, node: IParseNode, e: MouseEvent): void {
        e.stopPropagation();

        let { nodeStats } = this.state;

        const val = { opened: false, selected: false, ...nodeStats[idx] };
        val.opened = !val.opened;
        nodeStats = { ...nodeStats, [idx]: val };

        this.setState({ nodeStats });
    }
}


export default connect<{}, {}, IASTViewProps>(mapProps(getCommon), {})(ASTView) as any;

