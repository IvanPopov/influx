/* tslint:disable:typedef */
/* tslint:disable:use-simple-attributes */
/* tslint:disable:react-a11y-event-has-role */
/* tslint:disable:no-for-in */
/* tslint:disable:cyclomatic-complexity */

import { isArray, isDefAndNotNull, isNull } from '@lib/common';
import { fn, instruction, type } from '@lib/fx/analisys/helpers';
import { ComplexTypeInstruction } from '@lib/fx/analisys/instructions/ComplexTypeInstruction';
import { EInstructionTypes, IArithmeticExprInstruction, IAssignmentExprInstruction, IAttributeInstruction, IBitwiseExprInstruction, ICastExprInstruction, ICbufferInstruction, IComplexExprInstruction, IConstructorCallInstruction, IDeclStmtInstruction, IExprStmtInstruction, IForStmtInstruction, IFunctionCallInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IIdExprInstruction, IIdInstruction, IInitExprInstruction, IInstruction, IInstructionCollector, ILiteralInstruction, IPassInstruction, IPostfixArithmeticInstruction, IPostfixIndexInstruction, IPostfixPointInstruction, IProvideInstruction, IReturnStmtInstruction, IStmtBlockInstruction, IStmtInstruction, ITechniqueInstruction, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from '@lib/idl/IInstruction';
import { IMap } from '@lib/idl/IMap';
import { ISLDocument } from '@lib/idl/ISLDocument';
import { mapProps } from '@sandbox/reducers';
import { getFileState } from '@sandbox/reducers/sourceFile';
import { IFileState } from '@sandbox/store/IStoreState';
import * as React from 'react';
import withStyles, { WithStylesProps } from 'react-jss';
import { connect } from 'react-redux';
import { Icon, List, Message } from 'semantic-ui-react';


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
    return (m = /k_([a-zA-Z]+)/g.exec(econstName), (m && m[1]) || econstName);
}


interface IPropertyProps extends Partial<WithStylesProps<typeof styles>> {
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
                    <List.Icon className={ iconName } />
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
                                        <Icon className={ `git pull request ${ classes.parentIcon }` }size='small' />
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

export interface IProgramViewProps extends IFileState, WithStylesProps<typeof styles> {
    onNodeOut?: (instr: IInstruction) => void;
    onNodeOver?: (instr: IInstruction) => void;
    onNodeClick?: (instr: IInstruction) => void;
}

class ProgramView extends React.Component<IProgramViewProps, {}> {
    declare state: {
        instrList: IMap<{ opened: boolean; selected: boolean; errors?: string[]; }>;
    };

    documentCache: ISLDocument = null;
    rootRef: React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);
        this.state = {
            instrList: {}
        };

        this.rootRef = React.createRef();
    }


    shouldComponentUpdate(nextProps: IFileState, nextState): boolean {
        return this.documentCache !== nextProps.slDocument;
        // return true;
    }

    componentDidUpdate() {
        this.documentCache = this.props.slDocument;

        // const rect = this.rootRef.current.getBoundingClientRect();
        // just a rude hack
        // this.rootRef.current.style.height = `calc(100vh - ${Math.floor(rect.top) + 50}px)`;
    }


    render() {
        const { slDocument: analysis } = this.props;

        if (isNull(analysis)) {
            return null;
        }

        const root = analysis.root;

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto'
        };

        return (
            <div ref={ this.rootRef }>
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
            case EInstructionTypes.k_Collector:
                return this.InstructionCollector(instr);

            case EInstructionTypes.k_TypeDecl:
                return this.TypeDecl(instr);
            case EInstructionTypes.k_ComplexType:
                return this.ComplexType(instr);
            case EInstructionTypes.k_Provide:
                return this.ProvideDecl(instr);
            case EInstructionTypes.k_CbufferDecl:
                return this.CbufferDecl(instr);
            case EInstructionTypes.k_TechniqueDecl:
                return this.Technique(instr);
            case EInstructionTypes.k_VariableDecl:
                return this.VariableDecl(instr);
            case EInstructionTypes.k_VariableType:
                return this.VariableType(instr);
            case EInstructionTypes.k_SystemType:
                return this.SystemType(instr);
            case EInstructionTypes.k_FunctionDecl:
                return this.FunctionDecl(instr);

            //
            // Expressions
            //

            case EInstructionTypes.k_InitExpr:
                return this.InitExpr(instr);
            case EInstructionTypes.k_IdExpr:
                return this.IdExpr(instr);
            case EInstructionTypes.k_PostfixPointExpr:
                return this.PostfixPointExpr(instr);
            case EInstructionTypes.k_PostfixIndexExpr:
                return this.PostfixIndexExpr(instr);
            case EInstructionTypes.k_AssignmentExpr:
                return this.Assigment(instr);
            case EInstructionTypes.k_PostfixArithmeticExpr:
                return this.PostfixArithmetic(instr);
            case EInstructionTypes.k_ConstructorCallExpr:
                return this.ConstructorCall(instr);
            case EInstructionTypes.k_IntExpr:
                return this.Int(instr);
            case EInstructionTypes.k_FloatExpr:
                return this.Float(instr);
            case EInstructionTypes.k_StringExpr:
                return this.String(instr);
            case EInstructionTypes.k_BoolExpr:
                return this.Bool(instr);
            case EInstructionTypes.k_ArithmeticExpr:
                return this.ArithmeticExpr(instr);
            case EInstructionTypes.k_BitwiseExpr:
                return this.BitwiseExpr(instr);
            case EInstructionTypes.k_CastExpr:
                return this.Cast(instr);
            case EInstructionTypes.k_ComplexExpr:
                return this.ComplexExpr(instr);
            case EInstructionTypes.k_FunctionCallExpr:
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


    CbufferDecl(instr: ICbufferInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='name' value={ instr.name } />
                <Property name='size' value={ instr.type.size } />
                <Property name='register' value={ `${instr.register.type}${instr.register.index}` } />
                {/* annotation */}
                <PropertyOpt { ...this.bindProps(instr) } name='fields'>
                    { instr.type.fields.map((field) => this.Unknown(field)) }
                </PropertyOpt>
            </Property>
        );
    }


    ComplexType(instr: ITypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='name' value={ instr.name } />
                <Property name='aligment' value={ (instr as ComplexTypeInstruction).aligment } />
                <PropertyOpt { ...this.bindProps(instr) } name='fields'>
                    { instr.fields.map((field) => this.Unknown(field)) }
                </PropertyOpt>
                { this.typeInfo(instr) }
            </Property>
        );
    }


    // todo: implement it properly
    SystemType(instr: ITypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                { this.typeInfo(instr) }
            </Property>
        );
    }


    typeInfo(instr: ITypeInstruction) {
        return (
            <SystemProperty { ...this.bindProps(instr, false) } name={ type.signature(instr, true) }>
                <SystemProperty name='writable' value={ `${instr.writable}` } />
                <SystemProperty name='readable' value={ `${instr.readable}` } />
                <SystemProperty name='size' value={ `${instr.size === instruction.UNDEFINE_SIZE ? 'undef' : instr.size} bytes` } />
                <SystemProperty name='length' value={ `${instr.length === instruction.UNDEFINE_LENGTH ? 'undef' : instr.length}` } />
                <SystemProperty name='base' value={ `${instr.isBase()}` } />
                <SystemProperty name='array' value={ `${instr.isArray()}` } />
                <SystemProperty name='complex' value={ `${instr.isComplex()}` } />
                <SystemProperty name='const' value={ `${instr.isConst()}` } />
                <PropertyOpt name='element type'>
                    { this.Unknown(instr.arrayElementType) }
                </PropertyOpt>
                <PropertyOpt name='methods' >
                    { instr.methods.map(method => fn.signatureEx(method.def, true))
                        .map(signature =>
                            <SystemProperty name={ <span>&nbsp;&nbsp;</span> } value={ signature } />
                        ) }
                </PropertyOpt>
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
                <PropertyOpt name='semantic' value={ instr.semantic } />
                <PropertyOpt name='passes'>
                    { instr.passList.map((pass) => this.Pass(pass)) }
                </PropertyOpt>
            </Property>
        );
    }


    VariableDecl(instr: IVariableDeclInstruction) {
        if (isNull(instr)) {
            return null;
        }

        return (
            <Property { ...this.bindProps(instr) }>
                <Property name='id' value={ instr.id.toString() } />
                { instr.isConstant() && <Property name='constant' value={ 'true' } /> }
                <Property name='semantic' value={ instr.semantic } />
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
                <PropertyOpt name='attributes'>
                    { instr.attributes.map((attr) => this.Attribute(attr)) }
                </PropertyOpt>
                <Property name='definition' >
                    { this.FunctionDefinition(instr.def) }
                </Property>
                <PropertyOpt name='implementation' >
                    { this.StmtBlock(instr.impl) }
                </PropertyOpt>
            </Property>
        )
    }


    IdExpr(instr: IIdExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                { this.Id(instr.id) }
                <Property name='declaration' >
                    { this.Unknown(instr.decl) }
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
                    { instr.args.map((arg) => this.Unknown(arg)) }
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


    BitwiseExpr(instr: IBitwiseExprInstruction) {
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
                {/* <Property name='type' value={ (instr.callee ? 'method' : 'function') } /> */ }
                <Property name='declaration' >
                    { this.FunctionDecl(instr.decl as IFunctionDeclInstruction) }
                </Property>
                <PropertyOpt name='callee'>
                    { this.Unknown(instr.callee) }
                </PropertyOpt>
                <PropertyOpt name='arguments'>
                    { instr.args.map((arg) => this.Unknown(arg)) }
                </PropertyOpt>
            </Property>
        );
    }


    Int(instr: ILiteralInstruction<number>) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr) } />
        );
    }

    Float(instr: ILiteralInstruction<number>) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr) } />
        );
    }


    Bool(instr: ILiteralInstruction<boolean>) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr) } />
        );
    }


    String(instr: ILiteralInstruction<string>) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    Attribute(instr: IAttributeInstruction) {
        return (
            <Property { ...this.bindProps(instr) } name={ instr.name } >
                { instr.args.map((arg) => this.Unknown(arg)) }
            </Property>
        );
    }


    FunctionDefinition(instr: IFunctionDefInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <Property name='name' value={ instr.name } />
                <Property name='signature' value={ fn.signatureEx(instr, true) } />
                <Property name='type' value={ instr.returnType.name } />
                <Property name='numArgsRequired' value={ String(fn.numArgsRequired(instr)) } />
                <PropertyOpt name='semantic' value={ instr.semantic } />
                <PropertyOpt name='arguments'>
                    { instr.params.map((param) => this.VariableDecl(param)) }
                </PropertyOpt>
            </Property>
        );
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
            case EInstructionTypes.k_DeclStmt:
                return this.DeclStmt(instr as IDeclStmtInstruction);
            case EInstructionTypes.k_ReturnStmt:
                return this.ReturnStmt(instr as IReturnStmtInstruction);
            case EInstructionTypes.k_StmtBlock:
                return this.StmtBlock(instr as IStmtBlockInstruction);
            case EInstructionTypes.k_ExprStmt:
                return this.ExprStmt(instr as IExprStmtInstruction);
            case EInstructionTypes.k_ForStmt:
                return this.ForStmt(instr as IForStmtInstruction);
            case EInstructionTypes.k_SemicolonStmt:
                return this.SemicolonStmt(instr as IStmtInstruction);
            default:
                return this.NotImplemented(instr); // TODO: remove it
        }
    }

    Type(instr: ITypeInstruction) {
        switch (instr.instructionType) {
            case EInstructionTypes.k_VariableType:
                return this.VariableType(instr as IVariableTypeInstruction);
            case EInstructionTypes.k_SystemType:
                return this.SystemType(instr as ITypeInstruction);
            default:
                return this.NotImplemented(instr); // TODO: remove it
        }

    }


    DeclStmt(instr: IDeclStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <Property name='declarations'>
                    { instr.declList.map(decl => this.Unknown(decl)) }
                </Property>
            </Property>
        );
    }


    ReturnStmt(instr: IReturnStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <PropertyOpt name='value'>
                    { this.Unknown(instr.expr) }
                </PropertyOpt>
            </Property>
        );
    }


    ExprStmt(instr: IExprStmtInstruction) {
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


    ForStmt(instr: IForStmtInstruction) {
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
                <PropertyOpt name='usages' value={ (instr.usages.join(' ') || null) } />
                <Property name='padding' value={ instr.padding === instruction.UNDEFINE_PADDING ? 'undef' : instr.padding } />
                <Property name='aligment' value={ instr.aligment } />
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
                    { instr.args.map(arg => this.Unknown(arg)) }
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

        if (instr.sourceNode) {
            this.props.onNodeOver(instr);
        }
    }


    handleMouseOut(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, 'selected');

        if (instr.sourceNode) {
            this.props.onNodeOut(instr);
        }
    }


    handleMouseClick(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.documentCache = null;
        this.invertInstructionProperty(instr, 'opened');

        if (instr.sourceNode) {
            this.props.onNodeClick(instr);
        }
    }


    invertInstructionProperty(instr: IInstruction, prop: string) {
        let { instrList } = this.state;
        let instrState = { opened: false, selected: false, ...instrList[instr.instructionID] };
        instrState[prop] = !instrState[prop];
        instrList = { ...instrList, [instr.instructionID]: instrState };
        this.setState({ instrList });
    }

}

export default connect<{}, {}, IProgramViewProps>(mapProps(getFileState), {})(withStyles(styles)(ProgramView)) as any;
