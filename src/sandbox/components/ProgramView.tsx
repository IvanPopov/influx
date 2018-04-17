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
import { ITechniqueInstruction, IPassInstruction, IInstructionCollector, IProvideInstruction, EInstructionTypes, IInstruction } from '../../lib/idl/IInstruction';
import { ProvideInstruction } from '../../lib/fx/instructions/ProvideInstruction';
import { isArray } from 'util';
import { IMap } from '../../lib/idl/IMap';

// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


type InstrView<T> = React.StatelessComponent<T>;

const PropertySelectedStyle = {
    backgroundColor: `rgba(128, 128, 128, 0.125)`,
    boxShadow: `0 0 3px rgba(55, 55, 55, 0.33)`,
    borderRadius: `2px`
};

const Property: InstrView<{ name?: any; value?: any; onMouseOver?: Function; onMouseOut?: Function; selected?: boolean; }> =
    ({ name, value, children, onMouseOver, onMouseOut, selected }) => {
        return (
            <List.Item
                className="astnode"
                onMouseOver={ onMouseOver }
                onMouseOut={ onMouseOut }
                style={ selected ? PropertySelectedStyle : {} }
            >
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
    }


const isNotEmptyArray = (arr) => (!isArray(arr) || (arr).length > 0);

const PropertyOpt: InstrView<{ name?: any; value?: any; onMouseOver?: Function; onMouseOut?: Function; selected?: boolean; }> =
    ({ name, value, children, onMouseOver, onMouseOut, selected }) => {
        if (isDefAndNotNull(value) || (isDefAndNotNull(children) && isNotEmptyArray(children))) {
            return (
                <Property
                    name={ name }
                    value={ value }
                    onMouseOver={ onMouseOver }
                    onMouseOut={ onMouseOut }
                    selected={ selected }
                >
                    { children }
                </Property>
            );
        }
        return null;
    };

export interface IProgramViewProps {
    ast: IParseTree;
    filename?: string;

    onNodeOut?: (instr: IInstruction) => void;
    onNodeOver?: (instr: IInstruction) => void;
}

class ProgramView extends React.Component<IProgramViewProps, {}> {
    state: {
        root: IInstructionCollector;
        hash: number;

        instrList: IMap<{ opened: boolean; selected: boolean; errors?: string[]; }>;
    };

    constructor(props) {
        super(props);
        this.state = {
            root: null,
            hash: -1,
            instrList: {}
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
        if (nextProps.ast != props.ast) {
            return true;
        }

        if (!deepEqual(state.instrList, nextState.instrList)) {
            return true;
        }

        return false;
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
                    { this.InstructionCollector({ instr: root }) }
                </List>
            </div>
        );
    }

    InstructionCollector({ instr }) {
        return (
            <PropertyOpt { ...this.bindProps(instr) } name={ "Program" }>
                { instr.instructions.map((instr) => {
                    switch (instr.instructionType) {
                        case EInstructionTypes.k_ProvideInstruction:
                            return this.ProvideDecl({ instr });
                        case EInstructionTypes.k_TechniqueInstruction:
                            return this.Technique({ instr });
                        default:
                            return this.NotImplemented({ instr });
                    }
                }) }
            </PropertyOpt>
        );
    }
    instr

    ProvideDecl({ instr }) {
        return (
            <Property { ...this.bindProps(instr) } name={ instr.instructionName } key={ instr.instructionID }>
                <Property name={ "moduleName" } value={ instr.moduleName } />
            </Property>
        );
    }


    Pass({ instr }) {
        return (
            <Property { ...this.bindProps(instr) } name={ instr.instructionName } key={ instr.instructionID }>
                <PropertyOpt name={ "name" } value={ instr.name } />
            </Property>
        );
    }


    Technique({ instr }) {
        return (
            <Property { ...this.bindProps(instr) } name={ instr.instructionName } key={ instr.instructionID }>
                <Property name={ "name" } value={ instr.name } />
                <PropertyOpt name={ "semantics" } value={ instr.semantics } />
                <PropertyOpt name={ "passes" }>
                    { instr.passList.map((pass) => this.Pass({ instr: pass })) }
                </PropertyOpt>
            </Property>
        );
    }


    NotImplemented({ instr }) {
        return (
            <Property { ...this.bindProps(instr) } name={
                <Message size="mini" color="red">
                    <Message.Content>
                        <Message.Header>Not implemented</Message.Header>
                        <p>{ EInstructionTypes[instr.instructionType] }</p>
                    </Message.Content>
                </Message>
            } key={ instr.instructionID } />
        );
    }


    bindProps(instr: IInstruction) {
        const instrState = this.state.instrList[instr.instructionID];

        return {
            onMouseOver: this.handleMouseOver.bind(this, instr),
            onMouseOut: this.handleMouseOut.bind(this, instr),
            selected: instrState ? !!instrState.selected : false
        }
    }


    handleMouseOver(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertSelection(instr);

        if (instr.sourceNode)
            this.props.onNodeOver(instr);
    }


    handleMouseOut(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertSelection(instr);

        if (instr.sourceNode)
            this.props.onNodeOut(instr);
    }


    invertSelection(instr: IInstruction) {
        let { instrList } = this.state;
        let instrState = { opened: false, selected: false, ...instrList[instr.instructionID] };
        instrState.selected = !instrState.selected;
        instrList = { ...instrList, [instr.instructionID]: instrState };
        this.setState({ instrList });
    }

}

export default ProgramView;

