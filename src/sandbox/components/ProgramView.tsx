import autobind from 'autobind-decorator';
import * as React from 'react';
import * as copy from 'copy-to-clipboard';
import { connect } from 'react-redux';

import { Divider, Breadcrumb } from 'semantic-ui-react';
import { List, Message } from 'semantic-ui-react'

import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree, IParseNode, IPosition, IRange } from '../../lib/idl/parser/IParser';
import { ISourceLocation } from '../../lib/idl/ILogger';
import { analyze } from '../../lib/fx/Effect';
import { isNull, isDefAndNotNull } from '../../lib/common';
import { ITechniqueInstruction, IPassInstruction, IInstructionCollector, IProvideInstruction, EInstructionTypes } from '../../lib/idl/IInstruction';
import { ProvideInstruction } from '../../lib/fx/instructions/ProvideInstruction';
import { isArray } from 'util';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


type InstrView<T> = React.StatelessComponent<T>;

// const Namespace: InstrView<{ ns: string; }> = ({ ns }) => {
//     let nsList = ns.split('.');
//     return (
//         <Breadcrumb size='tiny'>
//             {
//                 nsList.map((part, i) => {
//                     if (i < nsList.length - 1) {
//                         return (
//                             [
//                                 (<Breadcrumb.Section key={ `ns-${part}` }>{ part }</Breadcrumb.Section>),
//                                 (<Breadcrumb.Divider key={ `ns-div-${part}` } icon="right chevron" />),
//                             ]
//                         )
//                     }
//                     return <Breadcrumb.Section key={ `ns-${part}` } active>{ part }</Breadcrumb.Section>;
//                 })
//             }
//         </Breadcrumb>
//     );
// };


const Property: InstrView<{ name?: any; value?: any; }> = ({ name, value, children }) => (
    <List.Item className="astnode">
        <List.Icon name={ isDefAndNotNull(children) ? `chevron down` : `code` } />
        <List.Content>
            { isDefAndNotNull(name) &&
                <List.Header>{ name }:</List.Header>
            }
            { isDefAndNotNull(value) &&
                <List.Description>{ value }</List.Description>
            }
            { isDefAndNotNull(children) &&
                <List.List>
                    { children }
                </List.List>
            }
        </List.Content>
    </List.Item>
);


const isNotEmptyArray = (arr) => (!isArray(arr) || (arr).length > 0);

const PropertyOpt: InstrView<{ name?: any; value?: any; }> = ({ name, value, children }) => {
    if (isDefAndNotNull(value) || (isDefAndNotNull(children) && isNotEmptyArray(children))) {
        return <Property name={ name } value={ value }>{ children }</Property>;
    }
    return null;
};


const Technique: InstrView<{ instr: ITechniqueInstruction }> = ({ instr }) => (
    <Property name={ instr.instructionName }>
        <Property name={ "name" } value={ instr.name } />
        <PropertyOpt name={ "semantics" } value={ instr.semantics } />
        <PropertyOpt name={ "passes" }>
            { instr.passList.map((pass) => <Pass instr={ pass } />) }
        </PropertyOpt>
    </Property>
);


const ProvideDecl: InstrView<{ instr: IProvideInstruction }> = (({ instr }) => (
    <Property name={ instr.instructionName } >
        <Property name={ "moduleName" } value={ instr.moduleName } />
    </Property>
));


const Pass: InstrView<{ instr: IPassInstruction }> = ({ instr }) => (
    <Property name={ instr.instructionName }>
        <PropertyOpt name={ "name" } value={ instr.name } />
    </Property>
);


const NotImplemented: InstrView<{ text: string }> = ({ text }) => (
    <Property name={
        <Message size="mini" color="red">
            <Message.Content>
                <Message.Header>Not implemented</Message.Header>
                <p>{ text }</p>
            </Message.Content>
        </Message>
    } />
);


const InstructionCollector: InstrView<{ instr: IInstructionCollector; }> = ({ instr }) => (
    <PropertyOpt name={ "Program" }>
        { instr.instructions.map((instr) => {
            switch (instr.instructionType) {
                case EInstructionTypes.k_ProvideInstruction:
                    return <ProvideDecl instr={ instr as IProvideInstruction } />
                case EInstructionTypes.k_TechniqueInstruction:
                    return <Technique instr={ instr as ITechniqueInstruction } />
                default:
                    return <NotImplemented text={ EInstructionTypes[instr.instructionType] } />;
            }
        }) }
    </PropertyOpt>
);

export interface IProgramViewProps {
    ast: IParseTree;
    filename?: string;
}

class ProgramView extends React.Component<IProgramViewProps, {}> {
    state: {
        root: IInstructionCollector;
        hash: number;
    };

    constructor(props) {
        super(props);
        this.state = {
            root: null,
            hash: -1
        };
    }


    componentWillReceiveProps(nextProps) {
        const { props, state } = this;

        if (isNull(nextProps.ast) || nextProps.ast == props.ast) {
            return;
        }

        const result = analyze(nextProps.filename, nextProps.ast);
        if (result.success) {
            this.setState({ root: result.root });
        }
    }


    shouldComponentUpdate(nextProps, nextState): boolean {
        const { props, state } = this;
        return nextProps.ast != props.ast;
    }


    render() {
        const { root } = this.state;

        if (isNull(root)) {
            return null;
        }

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto'
        };

        return (
            <div>
                <List style={ style } selection size="small">
                    <InstructionCollector instr={ root } />
                </List>
            </div>
        );
    }
}

export default ProgramView;

