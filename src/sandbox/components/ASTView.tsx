import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';

import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree, IParseNode, IPosition, IRange } from '../../lib/idl/parser/IParser';
import { List } from 'semantic-ui-react'
import { IMap } from '../../lib/idl/IMap';
import { IStoreState } from '../store';
import { sourceCode as sourceActions, mapActions } from '../actions';
import { getCommon, mapProps } from '../reducers';
import { PARSER_SYNTAX_ERROR } from '../../lib/parser/Parser';
import { ISourceLocation } from '../../lib/idl/ILogger';
import { IMarkerDesc } from '../actions/ActionTypes';


// import * as Effect from '../../lib/fx/Effect';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


export interface IASTViewProps extends IStoreState {
    actions: typeof sourceActions;
}

const SYNTAX_ERROR_MARKER = "syntax-error";

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

    componentWillReceiveProps(nextProps: IASTViewProps): void {
        const { props } = this;
        const parserChanged: boolean = !deepEqual(props.parserParams, nextProps.parserParams);
        const codeChanged: boolean = !deepEqual(props.sourceFile.content, nextProps.sourceFile.content);

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
        const style = {
            height: 'calc(100vh - 115px)',
            overflowY: 'auto'
        };

        return (
            <List style={ style } selection size="small">
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


    private parse(props: IASTViewProps): void {
        const { content, filename } = props.sourceFile;
        const { parser } = this.state.parser;

        if (!content || !parser) { return; }

        // this.setState({ nodeStats: {} });

        try {
            parser.setParseFileName(filename);
            const isParseOk: EParserCode = parser.parse(content);
            if (isParseOk === EParserCode.k_Ok) {
                this.setState({ parseTree: parser.getSyntaxTree() });
                props.actions.removeMarker(SYNTAX_ERROR_MARKER);

                {
                    // just for debug
                    // Effect.analyze("example", parer.getSyntaxTree());
                }

            } else {
                alert("@unhandled_error");
                // todo: handle error
            }
        } catch (e) {
            // if (e.name == "SyntaxError") ...

            if (e.logEntry.code == PARSER_SYNTAX_ERROR) {
                // const message = e.message
                const location: ISourceLocation = e.logEntry.location;
                const loc: IRange = e.logEntry.info.loc;

                let marker: IMarkerDesc = {
                    name: SYNTAX_ERROR_MARKER,
                    range: loc,
                    type: 'error',
                    tooltip: e.message
                };

                props.actions.addMarker(marker);
                console.log(e);
            } else {
                console.error(e);
            }
        }
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
                    onClick={ (e) => { e.stopPropagation(); this.handleNodeClick(idx, node) } } 
                    onMouseOver={ (e) => { e.stopPropagation(); this.handleNodeOver(idx, node) } } 
                    onMouseOut={ (e) => { e.stopPropagation(); this.handleNodeOut(idx, node) } }
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
                children = (<List.List> { node.children.map((node, i) => this.renderASTNode(node, `${idx}.${i}`)).reverse() } </List.List>);
            }
            return (
                <List.Item key={ idx } 
                    onClick={ (e) => { e.stopPropagation(); this.handleNodeClick(idx, node) } }
                    onMouseOver={ (e) => { e.stopPropagation(); this.handleNodeOver(idx, node) } } 
                    onMouseOut={ (e) => { e.stopPropagation(); this.handleNodeOut(idx, node) } }
                    className="astnode"
                >
                    <List.Icon name={ show ? `chevron down` : `chevron right` } />
                    <List.Content>
                        <List.Header>{ node.name }&nbsp;<a style={ { display: selected ? 'inline' : 'none' } } onClick={ (e) => { e.stopPropagation(); this.handleCopyClick(idx, node); } }>Copy</a></List.Header>
                        { children }
                    </List.Content>
                </List.Item>
            );
        }
    }

    private async handleCopyClick(idx: string, node: IParseNode) {
        console.log(node);
    }

    private async handleNodeOver(idx: string, node: IParseNode) {
        this.props.actions.addMarker({ name: `ast-range-${idx}`, range: node.loc, type: 'marker' });
        
        let { nodeStats } = this.state;
        nodeStats[idx] = nodeStats[idx] || { opened: false, selected: false };
        nodeStats[idx].selected = !nodeStats[idx].selected;
        this.setState({ nodeStats });
    }

    
    private async handleNodeOut(idx: string, node: IParseNode) {
        this.props.actions.removeMarker(`ast-range-${idx}`);

        let { nodeStats } = this.state;
        nodeStats[idx].selected = !nodeStats[idx].selected;
        this.setState({ nodeStats });
    }


    private handleNodeClick(idx: string, node: IParseNode) {
        let { nodeStats } = this.state;
        nodeStats[idx] = nodeStats[idx] || { opened: false, selected: false };
        nodeStats[idx].opened = !nodeStats[idx].opened;
        this.setState({ nodeStats });
    }


    @autobind
    private hideParserErrors(): void {
        this.setState({ parser: { showErrors: false } });
    }
}

export default connect<{}, {}, IStoreState>(mapProps(getCommon), mapActions(sourceActions))(ASTView) as any;

