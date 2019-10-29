
/* tslint:disable:typedef */
/* tslint:disable:use-simple-attributes */
/* tslint:disable:react-a11y-event-has-role */
/* tslint:disable:no-for-in */
/* tslint:disable:cyclomatic-complexity */

import { isArray, isDefAndNotNull, isNull } from '@lib/common';
import { ComplexTypeInstruction } from '@lib/fx/instructions/ComplexTypeInstruction';
import { DeclStmtInstruction } from '@lib/fx/instructions/DeclStmtInstruction';
import { ExprStmtInstruction } from '@lib/fx/instructions/ExprStmtInstruction';
import { ForStmtInstruction } from '@lib/fx/instructions/ForStmtInstruction';
import { Instruction } from '@lib/fx/instructions/Instruction';
import { ReturnStmtInstruction } from '@lib/fx/instructions/ReturnStmtInstruction';
import { SystemTypeInstruction } from '@lib/fx/instructions/SystemTypeInstruction';
import {
    EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction,
    ICastExprInstruction, IComplexExprInstruction, IConstructorCallInstruction,
    IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction,
    IIdExprInstruction, IIdInstruction, IInitExprInstruction, IInstruction,
    IInstructionCollector, ILiteralInstruction, IPassInstruction, IPostfixArithmeticInstruction,
    IPostfixIndexInstruction, IPostfixPointInstruction, IProvideInstruction, IStmtBlockInstruction,
    IStmtInstruction, ITechniqueInstruction, ITypeDeclInstruction, ITypeInstruction,
    IVariableDeclInstruction, IVariableTypeInstruction
} from '@lib/idl/IInstruction';
import { IMap } from '@lib/idl/IMap';
import { mapProps } from '@sandbox/reducers';
import { getSourceCode } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import * as React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { Icon, List, Message } from 'semantic-ui-react';
import { IWithStyles } from '.';


const styles = {
    parentIcon: {
        '&:hover': {
            textShadow: '1px 1px 1px #ccc'
        }
    }
};

const PropertyStyles = {
    selected: {
        // backgroundColor: `rgba(128, 128, 128, 0.125)`,
        // boxShadow: `0 0 3px rgba(55, 55, 55, 0.33)`,
        // borderRadius: `2px`
    },
    system: {
        // opacity: '0.75'
    }
};


function PropertyStyle(names: Object) {
    let styles = {};
    for (let k in names) {
        if (names[k] && PropertyStyles[k]) {
            styles = { ...styles, ...PropertyStyles[k] };
        }
    }
    return styles;
}


function prettifyEName(econstName: string): string {
    let m;
    return (m = /k_([a-zA-Z]+)Instruction/g.exec(econstName), (m && m[1]) || econstName);
}


interface IPropertyProps extends IWithStyles<typeof styles> {
    name?: any;
    value?: any;
    onMouseOver?: any;
    onMouseOut?: any;
    onClick?: any;
    selected?: boolean;
    opened?: boolean;
    system?: boolean;
    parent?: any;
    onParentMouseDown?: any;
    onParentMouseUp?: any;
}


type PropertyComponent = React.StatelessComponent<IPropertyProps>;



const Property: PropertyComponent =
    ({ name, value, children, onMouseOver, onMouseOut, onClick, selected, opened, system,
        parent, onParentMouseDown, onParentMouseUp, classes }) => {
        let iconName = system ? `code` as any : (isDefAndNotNull(children) ? `chevron down` : `code`);
        if (!children) {
            opened = true;
        }
        if (opened === false) {
            iconName = 'chevron right';
            children = null;
        }
        const isHelper = !onClick;
        const simpleProperty = (value && !children) && !parent;
        const helperProperty = (!value && children) && isHelper;
        const showIcon = !simpleProperty && !helperProperty;
        return (
            <List.Item
                className='astnode'
                onMouseOver={ onMouseOver }
                onMouseOut={ onMouseOut }
                onClick={ onClick }
                style={ { ...PropertyStyle({ selected, system }), ...(simpleProperty ? { fontSize: '85%' } : {}) } }
            >
                { showIcon &&
                    <List.Icon name={ iconName } />
                }
                <List.Content>
                    { isDefAndNotNull(name) &&
                        <List.Header style={ helperProperty ? { fontSize: '85%', color: '#ccc' } : {} }>
                            { parent &&
                                <span>
                                    <a
                                        style={ { color: 'rgba(0,0,0,0.3)' } }
                                        onMouseOver={ onParentMouseDown }
                                        onMouseOut={ onParentMouseUp }
                                    >
                                        <Icon className={ classes.parentIcon } name={ `git pull request` as any } size='small' />
                                    </a>
                                </span>
                            }
                            { helperProperty ? `[${name}]` : name }
                        </List.Header>

                    }
                    { isDefAndNotNull(value) &&
                        <List.Description>{ value }</List.Description>
                    }
                    { isDefAndNotNull(children) &&
                        <List.List className='astlist'>
                            { children }
                        </List.List>
                    }
                </List.Content>
            </List.Item>
        );
    }


const isNotEmptyArray = (arr) => (!isArray(arr) || (arr).length > 0);

const PropertyOpt: PropertyComponent = (props) => {
    const { value, children } = props;
    if (isDefAndNotNull(value) || (isDefAndNotNull(children) && isNotEmptyArray(children))) {
        return (
            <Property { ...props } />
        );
    }
    return null;
};


const SystemProperty: PropertyComponent = (props) => {
    return (
        <PropertyOpt { ...props } system={ true }>
            { props.children }
        </PropertyOpt>
    );
}

export interface IProgramViewProps extends IFileState, IWithStyles<typeof styles> {
    onNodeOut?: (instr: IInstruction) => void;
    onNodeOver?: (instr: IInstruction) => void;
    onNodeClick?: (instr: IInstruction) => void;
}

@injectSheet(styles)
class ProgramView extends React.Component<IProgramViewProps, {}> {
    state: {
        instrList: IMap<{ opened: boolean; selected: boolean; errors?: string[]; }>;
    };

    constructor(props) {
        super(props);
        this.state = {
            instrList: {}
        };
    }


    // shouldComponentUpdate(nextProps, nextState): boolean {
    //     const { props, state } = this;
    //     if (nextProps.ast != props.parseTree) {
    //         return true;
    //     }

    //     // is it ok?
    //     if (!deepEqual(state.instrList, nextState.instrList)) {
    //         return true;
    //     }

    //     console.warn("skip ProgramView's update");
    //     return false;
    // }


    render() {
        const { analysis } = this.props;

        if (isNull(analysis)) {
            return null;
        }

        const root = analysis.root;

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto'
        };

        return (
            <div>
                <List style={ style } selection size='small' className='astlist'>
                    { this.InstructionCollector(root) }
                </List>
            </div>
        );
    }


    Unknown(instr) {
        if (!instr) {
            return null;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_InstructionCollector:
                return this.InstructionCollector(instr);

            case EInstructionTypes.k_TypeDeclInstruction:
                return this.TypeDecl(instr);
            case EInstructionTypes.k_ComplexTypeInstruction:
                return this.ComplexType(instr);
            case EInstructionTypes.k_ProvideInstruction:
                return this.ProvideDecl(instr);
            case EInstructionTypes.k_TechniqueInstruction:
                return this.Technique(instr);
            case EInstructionTypes.k_VariableDeclInstruction:
                return this.VariableDecl(instr);
            case EInstructionTypes.k_VariableTypeInstruction:
                return this.VariableType(instr);
            case EInstructionTypes.k_SystemTypeInstruction:
                return this.SystemType(instr);
            case EInstructionTypes.k_FunctionDeclInstruction:
                return this.FunctionDecl(instr);

            //
            // Expressions
            //

            case EInstructionTypes.k_InitExprInstruction:
                return this.InitExpr(instr);
            case EInstructionTypes.k_IdExprInstruction:
                return this.IdExpr(instr);
            case EInstructionTypes.k_PostfixPointInstruction:
                return this.PostfixPointExpr(instr);
            case EInstructionTypes.k_PostfixIndexInstruction:
                return this.PostfixIndexExpr(instr);
            case EInstructionTypes.k_AssignmentExprInstruction:
                return this.Assigment(instr);
            case EInstructionTypes.k_PostfixArithmeticInstruction:
                return this.PostfixArithmetic(instr);
            case EInstructionTypes.k_ConstructorCallInstruction:
                return this.ConstructorCall(instr);
            case EInstructionTypes.k_IntInstruction:
                return this.Int(instr);
            case EInstructionTypes.k_FloatInstruction:
                return this.Float(instr);
            case EInstructionTypes.k_StringInstruction:
                return this.String(instr);
            case EInstructionTypes.k_BoolInstruction:
                return this.Bool(instr);
            case EInstructionTypes.k_ArithmeticExprInstruction:
                return this.ArithmeticExpr(instr);
            case EInstructionTypes.k_CastExprInstruction:
                return this.Cast(instr);
            case EInstructionTypes.k_ComplexExprInstruction:
                return this.ComplexExpr(instr);
            case EInstructionTypes.k_FunctionCallInstruction:
                return this.FunctionCall(instr);
            default:
                return this.NotImplemented(instr);
        }
    }


    InstructionCollector(instr: IInstructionCollector) {
        return (
            <PropertyOpt { ...this.bindProps(instr, true) } name='Program' >
                { (instr.instructions || []).map((instr) => this.Unknown(instr)) }
            </PropertyOpt>
        );
    }


    ProvideDecl(instr: IProvideInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='moduleName' value={ instr.moduleName } />
            </Property>
        );
    }


    TypeDecl(instr: ITypeDeclInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property { ...this.bindProps(instr) } name={ 'type' } >
                    { this.Unknown(instr.type) }
                </Property>
                <SystemProperty name='name' value={ instr.name } />
            </Property>
        );
    }


    ComplexType(instr: ComplexTypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='name' value={ instr.name } />
                <PropertyOpt { ...this.bindProps(instr) } name='fields'>
                    { instr.fields.map((field) => this.Unknown(field)) }
                </PropertyOpt>
                { this.typeInfo(instr) }
            </Property>
        );
    }


    // todo: implement it properly
    SystemType(instr: SystemTypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                { this.typeInfo(instr) }
            </Property>
        );
    }


    typeInfo(instr) {
        return (
            <SystemProperty { ...this.bindProps(instr, false) } name={ instr.strongHash }>
                <SystemProperty name='writable' value={ `${instr.writable}` } />
                <SystemProperty name='readable' value={ `${instr.readable}` } />
                <SystemProperty name='builtIn' value={ `${instr.builtIn}` } />
                <SystemProperty name='hash' value={ `${instr.hash}` } />
                <SystemProperty name='strongHash' value={ `${instr.strongHash}` } />
                <SystemProperty name='size' value={ `${instr.size} bytes` } />
                <SystemProperty name='length' value={ `${instr.length}` } />
                <SystemProperty name='base' value={ `${instr.isBase()}` } />
                <SystemProperty name='array' value={ `${instr.isArray()}` } />
                <SystemProperty name='complex' value={ `${instr.isComplex()}` } />
                <SystemProperty name='const' value={ `${instr.isConst()}` } />
            </SystemProperty>
        );
    }


    Pass(instr: IPassInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <PropertyOpt name='name' value={ instr.name } />
            </Property>
        );
    }


    Technique(instr: ITechniqueInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='name' value={ instr.name } />
                <PropertyOpt name='semantics' value={ instr.semantics } />
                <PropertyOpt name='passes'>
                    { instr.passList.map((pass) => this.Pass(pass)) }
                </PropertyOpt>
            </Property>
        );
    }


    VariableDecl(instr: IVariableDeclInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='id' value={ instr.id.toString() } />
                <Property name='type' opened={ true }>
                    { this.VariableType(instr.type) }
                </Property>
                <PropertyOpt name='init' opened={ true }>
                    { this.InitExpr(instr.initExpr) }
                </PropertyOpt>
            </Property>
        );
    }


    FunctionDecl(instr: IFunctionDeclInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) } >
                <Property name='definition' >
                    { this.FunctionDefinition(instr.definition) }
                </Property>
                <PropertyOpt name='implementation' >
                    { this.StmtBlock(instr.implementation) }
                </PropertyOpt>
            </Property>
        )
    }


    IdExpr(instr: IIdExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                { this.Id(instr.id) }
                <Property name='declaration' >
                    { this.Unknown(instr.declaration) }
                </Property>
            </Property>
        )
    }

    Id(instr: IIdInstruction) {
        return (
            <Property { ...this.bindProps(instr) } name='name' value={ instr.name } />
        )
    }

    PostfixPointExpr(instr: IPostfixPointInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='element'>
                    { this.Unknown(instr.element) }
                </Property>
                <Property name='postfix'>
                    { this.Unknown(instr.postfix) }
                </Property>
            </Property>
        )
    }


    PostfixIndexExpr(instr: IPostfixIndexInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='element'>
                    { this.Unknown(instr.element) }
                </Property>
                <Property name='index'>
                    { this.Unknown(instr.index) }
                </Property>
            </Property>
        )
    }


    Assigment(instr: IAssignmentExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='lval'>
                    { this.Unknown(instr.left) }
                </Property>
                <Property name='rval'>
                    { this.Unknown(instr.right) }
                </Property>
            </Property>
        )
    }


    PostfixArithmetic(instr: IPostfixArithmeticInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='operator' value={ instr.operator } />
                <Property name='expr'>
                    { this.Unknown(instr.expr) }
                </Property>
            </Property>
        )
    }


    ConstructorCall(instr: IConstructorCallInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='type'>
                    { this.VariableType(instr.ctor) }
                </Property>
                <PropertyOpt name='arguments'>
                    { instr.arguments.map((arg) => this.Unknown(arg)) }
                </PropertyOpt>
            </Property>
        );
    }


    ArithmeticExpr(instr: IArithmeticExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) } >
                <Property name='operator' value={ instr.operator } />
                <Property name='operands'>
                    { this.Unknown(instr.left) }
                    { this.Unknown(instr.right) }
                </Property>
            </Property>
        );
    }


    Cast(instr: ICastExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) } >
                <Property name='type'>
                    { this.Type(instr.type) }
                </Property>
                <Property name='expr' >
                    { this.Unknown(instr.expr) }
                </Property>
            </Property>
        );
    }


    ComplexExpr(instr: IComplexExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) } >
                <Property name='expr' >
                    { this.Unknown(instr.expr) }
                </Property>
            </Property>
        );
    }


    FunctionCall(instr: IFunctionCallInstruction) {
        return (
            <Property { ...this.bindProps(instr) } >
                <Property name='declaration' >
                    { this.FunctionDecl(instr.declaration as IFunctionDeclInstruction) }
                </Property>
                <PropertyOpt name='arguments'>
                    { instr.args.map((arg) => this.Unknown(arg)) }
                </PropertyOpt>
            </Property>
        );
    }


    Int(instr: ILiteralInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
            // <Property { ...this.bindProps(instr) } >
            //     <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
            //     <Property name='type'>
            //         { this.Unknown(instr.type) }
            //     </Property>
            // </Property>
        );
    }

    Float(instr: ILiteralInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    Bool(instr: ILiteralInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    String(instr: ILiteralInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    FunctionDefinition(instr: IFunctionDefInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <Property name='name' value={ instr.name } />
                <Property name='type' value={ instr.returnType.name } />
                <Property name='numArgsRequired' value={ String(instr.numArgsRequired) } />
                <PropertyOpt name='semantic' value={ String(instr.semantics) } />
                <PropertyOpt name='arguments'>
                    { instr.paramList.map((param) => this.VariableDecl(param)) }
                </PropertyOpt>
            </Property>
        )
    }


    StmtBlock(instr: IStmtBlockInstruction) {
        if (isNull(instr)) {
            return null;
        }
        return (
            <Property { ...this.bindProps(instr, true) }>
                { instr.stmtList.map(stmt => this.Stmt(stmt)) }
            </Property>
        );
    }

    Stmt(instr: IStmtInstruction) {
        switch (instr.instructionType) {
            case EInstructionTypes.k_DeclStmtInstruction:
                return this.DeclStmt(instr as DeclStmtInstruction);
            case EInstructionTypes.k_ReturnStmtInstruction:
                return this.ReturnStmt(instr as ReturnStmtInstruction);
            case EInstructionTypes.k_StmtBlockInstruction:
                return this.StmtBlock(instr as IStmtBlockInstruction);
            case EInstructionTypes.k_ExprStmtInstruction:
                return this.ExprStmt(instr as ExprStmtInstruction);
            case EInstructionTypes.k_ForStmtInstruction:
                return this.ForStmt(instr as ForStmtInstruction);
            case EInstructionTypes.k_SemicolonStmtInstruction:
                return this.SemicolonStmt(instr as IStmtInstruction);
            default:
                return this.NotImplemented(instr); // TODO: remove it
        }
    }

    Type(instr: ITypeInstruction) {
        switch (instr.instructionType) {
            case EInstructionTypes.k_VariableTypeInstruction:
                return this.VariableType(instr as IVariableTypeInstruction);
            case EInstructionTypes.k_SystemTypeInstruction:
                return this.SystemType(instr as SystemTypeInstruction);
            default:
                return this.NotImplemented(instr); // TODO: remove it
        }

    }


    DeclStmt(instr: DeclStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <Property name='declarations'>
                    { instr.declList.map(decl => this.Unknown(decl)) }
                </Property>
            </Property>
        );
    }


    ReturnStmt(instr: ReturnStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <PropertyOpt name='value'>
                    { this.Unknown(instr.expr) }
                </PropertyOpt>
            </Property>
        );
    }


    ExprStmt(instr: ExprStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                { this.Unknown(instr.expr) }
            </Property>
        );
    }


    SemicolonStmt(instr: IStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) } />
        );
    }


    ForStmt(instr: ForStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <PropertyOpt name='init'>
                    { this.Unknown(instr.init) }
                </PropertyOpt>
                <PropertyOpt name='cond'>
                    { this.Unknown(instr.cond) }
                </PropertyOpt>
                <PropertyOpt name='step'>
                    { this.Unknown(instr.step) }
                </PropertyOpt>
                <PropertyOpt name='body'>
                    { this.Stmt(instr.body) }
                </PropertyOpt>
            </Property>
        );
    }


    VariableType(instr: IVariableTypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <PropertyOpt name='usages' value={ (instr.usageList.join(' ') || null) } />
                <Property name='padding' value={ instr.padding === Instruction.UNDEFINE_PADDING ? 'undef' : instr.padding } />
                <PropertyOpt name='subType' opened={ true }>
                    { this.Unknown(instr.subType) }
                </PropertyOpt>
                { this.typeInfo(instr) }
            </Property>
        );
    }

    InitExpr(instr: IInitExprInstruction) {
        if (isNull(instr)) {
            return null;
        }

        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='const' value={ String(instr.isConst()) } />
                <Property name='array' value={ String(instr.isArray()) } />
                <Property name='arguments'>
                    { instr.arguments.map(arg => this.Unknown(arg)) }
                </Property>
            </Property>
        );
    }


    NotImplemented(instr: IInstruction) {
        if (!instr) {
            return null;
        }
        return (
            <Property { ...this.bindProps(instr) }
                onClick={ () => console.log(instr) }
                name={
                    <Message size='mini' color='red'>
                        <Message.Content>
                            <Message.Header>Not implemented</Message.Header>
                            <p>{ EInstructionTypes[instr.instructionType] }</p>
                        </Message.Content>
                    </Message>
                }
                key={ instr.instructionID }
            />
        );
    }


    bindProps(instr: IInstruction, opened: boolean = false) {
        const { instrList } = this.state;
        const instrState = instrList[instr.instructionID];

        if (!instrState) {
            instrList[instr.instructionID] = { opened, selected: false };
            return this.bindProps(instr, opened);
        }

        return {
            name: `${prettifyEName(instr.instructionName)}`,
            key: `${instr.instructionID}`,
            onMouseOver: this.handleMouseOver.bind(this, instr),
            onMouseOut: this.handleMouseOut.bind(this, instr),
            onClick: this.handleMouseClick.bind(this, instr),
            selected: !!instrState.selected,
            opened: !!instrState.opened,
            parent: instr.parent && `I${instr.parent.instructionID}`,
            onParentMouseDown: this.handleParentMouseDown.bind(this, instr),
            onParentMouseUp: this.handleParentMouseUp.bind(this, instr),
            classes: this.props.classes
        }
    }


    handleParentMouseDown(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        let parent = instr.parent;

        if (parent && parent.sourceNode)
            this.props.onNodeOver(parent);
    }

    handleParentMouseUp(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        let parent = instr.parent;

        if (parent && parent.sourceNode)
            this.props.onNodeOut(parent);
    }


    handleMouseOver(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, 'selected');

        if (instr.sourceNode)
            this.props.onNodeOver(instr);
    }


    handleMouseOut(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, 'selected');

        if (instr.sourceNode)
            this.props.onNodeOut(instr);
    }


    handleMouseClick(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, 'opened');

        if (instr.sourceNode)
            this.props.onNodeClick(instr);
    }


    invertInstructionProperty(instr: IInstruction, prop: string) {
        let { instrList } = this.state;
        let instrState = { opened: false, selected: false, ...instrList[instr.instructionID] };
        instrState[prop] = !instrState[prop];
        instrList = { ...instrList, [instr.instructionID]: instrState };
        this.setState({ instrList });
    }

}

export default connect<{}, {}, IProgramViewProps>(mapProps(getSourceCode), {})(ProgramView) as any;
