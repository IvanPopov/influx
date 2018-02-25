import autobind from 'autobind-decorator';
import * as React from 'react';
import * as CodeMirror from 'react-codemirror';
import { connect } from 'react-redux';
import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree, IParseNode } from '../../lib/idl/parser/IParser';
import { IParserParams, IStoreState } from '../store/IStoreState';
import { List } from 'semantic-ui-react'

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

// tslint:disable-next-line:no-import-side-effect
import 'codemirror/mode/javascript/javascript';


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
    };

    constructor(props) {
        super(props);
        this.state = { parser: { showErrors: false, parser: null }, parseTree: null };
    }

    componentWillReceiveProps(nextProps: IASTViewProps): void {
        const { props } = this;
        const parserChanged: boolean = !deepEqual(props.parser, nextProps.parser);
        const codeChanged: boolean = !deepEqual(props.source.code, nextProps.source.code);
        if (parserChanged) {
            this.initParser(nextProps);
        }
        if (codeChanged || parserChanged) {
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
            <List>
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


    private renderASTNode(node: IParseNode, idx = 0, lvl = 0) {
        if (!node) {
            return null;
        }
        if (node.value) {
            return (
                <List.Item key={ `${lvl}.${idx}` }>
                    <List.Icon name='chevron right' />
                    <List.Content>
                        <List.Header>{ node.name }</List.Header>
                        <List.Description>{ node.value }</List.Description>
                    </List.Content>
                </List.Item>
            );
        }
        else {
            return (
                <List.Item key={ `${lvl}.${idx}` }>
                    <List.Icon name='chevron down' />
                    <List.Content>
                        <List.Header>{ node.name }</List.Header>
                        <List.List>
                            { node.children.map((node, i) => this.renderASTNode(node, i, lvl + 1)).reverse() }
                        </List.List>
                    </List.Content>
                </List.Item>
            );
        }
    }


    @autobind
    private hideParserErrors(): void {
        this.setState({ parser: { showErrors: false } });
    }
}

export default ASTView;
