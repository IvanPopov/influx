import autobind from 'autobind-decorator';
import * as React from 'react';
import * as copy from 'copy-to-clipboard';

import { Divider, Breadcrumb } from 'semantic-ui-react';

import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree, IParseNode, IPosition, IRange } from '../../lib/idl/parser/IParser';
import { List } from 'semantic-ui-react'
import { ISourceLocation } from '../../lib/idl/ILogger';


import * as Effect from '../../lib/fx/Effect';
import { ProgramScope } from '../../lib/fx/ProgramScope';
import { isNull } from '../../lib/common';
import { ITechniqueInstruction, IPassInstruction } from '../../lib/idl/IInstruction';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

type InstrView<T> = React.StatelessComponent<T>;

const Namespace: InstrView<{ ns: string; }> = ({ ns }) => {
    let nsList = ns.split('.');
    return (
        <Breadcrumb size='tiny'>
            {
                nsList.map((part, i) => {
                    if (i < nsList.length - 1) {
                        return (
                            [
                                (<Breadcrumb.Section key={ `ns-${part}` }>{ part }</Breadcrumb.Section>),
                                (<Breadcrumb.Divider key={ `ns-div-${part}` } icon="right chevron" />),
                            ]
                        )
                    }
                    return <Breadcrumb.Section key={ `ns-${part}` } active>{ part }</Breadcrumb.Section>;
                })
            }
        </Breadcrumb>
    );
};


const Pass: InstrView<{ pass: IPassInstruction }> = ({ pass }) => (
    <List.Item>
        <List.Content>
            <List.Header>{ pass.name || '[unnamed]' }</List.Header>
        </List.Content>
    </List.Item>
);


const Technique: InstrView<{ tech: ITechniqueInstruction }> = ({ tech }) => (
    <List selection size="small">
        <List.Item>
            <List.Icon name={ `zap` as any } />
            <List.Content>
                <List.Header>{ tech.name }</List.Header>
                <List.List>
                    { tech.passList.map((pass) => <Pass pass={ pass } />) }
                </List.List>
            </List.Content>
        </List.Item>
    </List>
);


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
        const { props, state } = this;

        if (isNull(nextProps.ast) || nextProps.ast == props.ast) {
            return;
        }

        const result = Effect.analyze(nextProps.filename, nextProps.ast);
        if (result.success) {
            this.setState({ program: result.program });
        }
    }


    shouldComponentUpdate(nextProps, nextState): boolean {
        const { props, state } = this;
        return nextProps.ast != props.ast;
    }


    render() {
        const { program } = this.state;

        if (isNull(program)) {
            return null;
        }

        const gs = program.globalScope;

        return (
            <div>
                <Namespace ns={ program.namespace } />
                <Divider />
                { Object.keys(gs.techniqueMap).map((name) => <Technique key={ `tech-${name}` } tech={ gs.techniqueMap[name] } />) }
            </div>
        );
    }
}

export default ProgramView;

