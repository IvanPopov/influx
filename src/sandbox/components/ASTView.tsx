import autobind from 'autobind-decorator';
import * as React from 'react';
import * as copy from 'copy-to-clipboard';

import { EffectParser } from '../../lib/fx/EffectParser';
import { EParserCode, IParseTree, IParseNode, IRange } from '../../lib/idl/parser/IParser';
import { List } from 'semantic-ui-react'
import { IMap } from '../../lib/idl/IMap';


import * as Analyzer from '../../lib/fx/Analyzer';
import { IParserParams } from '../store/IStoreState';
import { DiagnosticException, Diagnostics, EDiagnosticCategory } from '../../lib/util/Diagnostics';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


export interface IASTViewProps {
    parserParams: IParserParams;
    content: string;
    filename?: string;
    
    onNodeOut: (id :string) => void;
    onNodeOver: (id: string, node: IParseNode) => void;
    onError: (loc: IRange , message: string) => void;
    onComplete: (ast: IParseTree) => void;
}

class ASTView extends React.Component<IASTViewProps, {}> {
    state: {
        parser: {
            error?: string;
            showErrors: boolean;
            parser: EffectParser;
        },
        parseTree: IParseTree;
        nodeStats: IMap<{ opened: boolean; selected: boolean; }>;
    };

    constructor(props) {
        super(props);
        this.state = { 
            parser: { showErrors: false, parser: null }, 
            parseTree: null, 
            nodeStats: {}
        };
    }


    shouldComponentUpdate(nextProps, nextState): boolean {
        const { props, state } = this;

        const parserChanged = !deepEqual(props.parserParams, nextProps.parserParams);
        const codeChanged = !deepEqual(props.content, nextProps.content);

        if (parserChanged) {
            this.initParser(nextProps, () => this.parse(nextProps));
        } else if (codeChanged) {
            this.parse(nextProps);
        }
        return (state.parseTree != nextState.parseTree) || !deepEqual(state.nodeStats, nextState.nodeStats);
    }


    componentWillMount(): void {
        this.initParser(this.props, () => {
            this.parse(this.props);
        });
    }


    render() {
        const { state: { parseTree } } = this;
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


    private initParser(props: IASTViewProps, callback?: () => void): void {
        const { grammar, mode, type } = props.parserParams;

        if (!grammar) {
            return;
        }

        const parser = new EffectParser();
        if (!parser.init(grammar, mode, type)) {
            this.setState({
                parser: {
                    showErrors: true,
                    error: 'Error! Could not initialize grammar!' // << todo: show detailed error.
                }
            });
        } else {
            this.setState({ parser: { showErrors: false, parser: parser } }, callback);
        }
    }


    private async parse(props: IASTViewProps): Promise<void> {
        const { content, filename } = props;
        const { parser } = this.state.parser;

        if (!content || !parser) { 
            return; 
        }

        parser.setParseFileName(filename);
        // All diagnostic exceptions should be already handled inside parser.
        let res = await parser.parse(content);

        if (res == EParserCode.k_Ok) {
            const ast = parser.getSyntaxTree();
            props.onComplete(ast);
            this.setState({ parseTree: ast });
            return;
        }

        let report = parser.getDiagnostics();

        report.messages.forEach(mesg => {
            // if (mesg.category == EDiagnosticCategory.ERROR) {
                this.props.onError(Diagnostics.asRange(mesg), mesg.content);
            // }
        });

        console.log(Diagnostics.stringify(parser.getDiagnostics()));
    }


    // @autobind
    // private handleParserResult(result: EParserCode, parser: EffectParser) {
    //     const { props } = this;

    //     if (result === EParserCode.k_Ok) {
    //         const ast = parser.getSyntaxTree();
    //         props.onComplete(ast);
    //         this.setState({ parseTree: ast });
    //     } else {
    //         this.handleParserError(parser);
    //     }
    // }


    // private handleParserError(parser: EffectParser) {
       

    //     if (err.code == PARSER_SYNTAX_ERROR) {
    //         const loc: IRange = err.info.loc;
    //         this.props.onError(loc, err.message || null);
    //     } else {
    //         console.error(err);
    //     }
    // }


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
        out = out.concat(node.children.slice().map(node => ` *       ${node.children? '+': ' '} ${node.name} ${node.value? '= ' + '\'' + node.value + '\'': ''}`));
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


    @autobind
    private hideParserErrors(): void {
        this.setState({ parser: { showErrors: false } });
    }
}

export default ASTView;

