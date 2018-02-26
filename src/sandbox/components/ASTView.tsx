import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree, IParseNode } from '../../lib/idl/parser/IParser';
import { IParserParams, IStoreState } from '../store/IStoreState';
import { List } from 'semantic-ui-react'
import { IMap } from '../../lib/idl/IMap';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


export interface IASTViewProps {
    readonly parser: {
        type: EParserType;
        mode: EParseMode;
        grammar: string;
    };

    readonly source: {
        code: string;
        filename: string;
    }
}


class ASTView extends React.Component<IASTViewProps, {}> {
    state: {
        parser: {
            error?: string;
            showErrors: boolean;
            parser: EffectParser;
        },
        parseTree: IParseTree;
        nodeStats: IMap<boolean>;
    };

    constructor(props) {
        super(props);
        this.state = { parser: { showErrors: false, parser: null }, parseTree: null, nodeStats: {} };
    }

    componentWillReceiveProps(nextProps: IASTViewProps): void {
        const { props } = this;
        const parserChanged: boolean = !deepEqual(props.parser, nextProps.parser);
        const codeChanged: boolean = !deepEqual(props.source.code, nextProps.source.code);

        if (parserChanged) {
            this.initParser(nextProps, () => this.parse(nextProps));
        } else if (codeChanged) {
            this.parse(nextProps);
        }
    }


    componentWillMount(): void {
        this.initParser(this.props, () => {
            this.parse(this.props);
        });
    }


    render() {
        const { state: { parseTree } } = this;
        return (
            <List selection>
                { this.renderASTNode(parseTree ? parseTree.getRoot() : null) }
            </List>
        );
    }


    private initParser(props: IASTViewProps, callback?: () => void): void {
        const { grammar, mode, type } = props.parser;

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


    private parse(props: IASTViewProps): void {
        const { code, filename } = props.source;
        const { parser } = this.state.parser;

        if (!code || !parser) { return; }

        this.setState({ nodeStats: {} });

        try {
            parser.setParseFileName(filename);
            const isParseOk: EParserCode = parser.parse(code);
            if (isParseOk === EParserCode.k_Ok) {
                this.setState({ parseTree: parser.getSyntaxTree() });
            } else {
                // todo: handle error
            }
        } catch (e) {
            console.log(e ? e.logEntry : null);
        }
    }


    private renderASTNode(node: IParseNode, idx = '0') {
        if (!node) {
            return null;
        }

        const forceShow = idx.split('.').length < 2;
        const show = forceShow || (this.state.nodeStats[idx] || false);

        if (node.value) {
            return (
                <List.Item key={ idx } onClick={ (e) => { e.stopPropagation(); this.handleNodeClick(idx, node) } }>
                    <List.Icon name='chevron right' />
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
                children = node.children.map((node, i) => this.renderASTNode(node, `${idx}.${i}`)).reverse();
            }
            return (
                <List.Item key={ idx } onClick={ (e) => { e.stopPropagation(); this.handleNodeClick(idx, node) } }>
                    <List.Icon name='chevron down' />
                    <List.Content>
                        <List.Header>{ node.name }</List.Header>
                        <List.List>
                            { children }
                        </List.List>
                    </List.Content>
                </List.Item>
            );
        }
    }


    private handleNodeClick(idx: string, node: IParseNode) {
        let nodeStats = Object.assign(this.state.nodeStats, { [idx]: !this.state.nodeStats[idx] });
        this.setState({ nodeStats });
    }


    @autobind
    private hideParserErrors(): void {
        this.setState({ parser: { showErrors: false } });
    }
}

export default ASTView;
