import autobind from 'autobind-decorator';
import * as React from 'react';
import * as copy from 'copy-to-clipboard';

import { Breadcrumb } from 'semantic-ui-react';

import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree, IParseNode, IPosition, IRange } from '../../lib/idl/parser/IParser';
import { List } from 'semantic-ui-react'
import { ISourceLocation } from '../../lib/idl/ILogger';


import * as Effect from '../../lib/fx/Effect';
import { ProgramScope } from '../../lib/fx/ProgramScope';
import { isNull } from '../../lib/common';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


export interface IProgramViewProps {
    ast: IParseTree;
    filename?: string;
}

class ProgramView extends React.Component<IProgramViewProps, {}> {
    state: {
        program: ProgramScope;
        hash: number;
    };

    constructor(props) {
        super(props);
        this.state = {
            program: null,
            hash: -1
        };
    }


    componentWillReceiveProps(nextProps) {
        if (!nextProps.ast) {
            return;
        }

        const result = Effect.analyze(nextProps.filename, nextProps.ast);
        if (result.success) {
            this.setState({ program: result.program });
        }
    }


    shouldComponentUpdate(nextProps, nextState): boolean {
        const { props, state } = this;

        if (!nextProps.ast) {
            return false;
        }

        if (nextProps.ast == props.ast) {
            return false;
        }

        return true;
    }


    render() {
        const { props, state } = this;

        if (isNull(state.program)) {
            return null;
        }

        // const { state: { parseTree } } = this;
        // const style = {
        //     height: 'calc(100vh - 205px)',
        //     overflowY: 'auto'
        // };

        // return (
        //     <List style={ style } selection size="small">
        //         { this.renderASTNode(parseTree ? parseTree.getRoot() : null) }
        //     </List>
        // );
        return (
            <div>
                { this.renderNamespace() }
                <div></div>
            </div>
        );
    }

    private renderNamespace() {
        const { state: { program } } = this;
        let ns = program.namespace.split('.');
        return (
            <Breadcrumb size='tiny'>
                {
                    ns.map((part, i) => {
                        if (i < ns.length - 1) {
                            return (
                                <>
                                    <Breadcrumb.Section link>{ part }</Breadcrumb.Section>
                                    <Breadcrumb.Divider icon="right chevron" />
                                </>
                            )
                        }

                        return <Breadcrumb.Section active>{ part }</Breadcrumb.Section>;
                    })
                }
            </Breadcrumb>
        );
    }




    private renderASTNode(node: IParseNode, idx = '0') {
        // if (!node) {
        //     return null;
        // }
        // const { nodeStats } = this.state;
        // const forceShow = idx.split('.').length < 2;
        // const show = forceShow || (nodeStats[idx] || { opened: false, selected: false }).opened;
        // const selected = (nodeStats[idx] || { opened: false, selected: false }).selected;

        // if (node.value) {
        //     return (
        //         <List.Item key={ idx } 
        //             onClick={ this.handleNodeClick.bind(this, idx, node) }
        //             onMouseOver={ this.handleNodeOver.bind(this, idx, node) } 
        //             onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
        //             className="astnode"
        //         >
        //             <List.Icon />
        //             <List.Content>
        //                 <List.Header>{ node.name }</List.Header>
        //                 <List.Description>{ node.value }</List.Description>
        //             </List.Content>
        //         </List.Item>
        //     );
        // }
        // else {
        //     let children = null;
        //     if (show) {
        //         children = (<List.List> { node.children.map((node, i) => this.renderASTNode(node, `${idx}.${i}`)).reverse() } </List.List>);
        //     }
        //     return (
        //         <List.Item key={ idx } 
        //             onClick={ this.handleNodeClick.bind(this, idx, node) }
        //             onMouseOver={ this.handleNodeOver.bind(this, idx, node) } 
        //             onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
        //             className="astnode"
        //         >
        //             <List.Icon name={ show ? `chevron down` : `chevron right` } />
        //             <List.Content>
        //                 <List.Header>
        //                     { node.name }&nbsp;
        //                     <a style={ { display: selected ? 'inline' : 'none' } } 
        //                         onClick={ this.handleCopyClick.bind(this, idx, node) }>Copy</a>
        //                 </List.Header>
        //                 { children }
        //             </List.Content>
        //         </List.Item>
        //     );
        // }
    }



}

export default ProgramView;

