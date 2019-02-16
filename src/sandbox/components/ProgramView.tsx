import * as React from 'react';
import { List, Message, Icon, Popup, Button } from 'semantic-ui-react';
import { isArray, isFunction } from '../../lib/common';
import { isDefAndNotNull, isNull } from '../../lib/common';
import { analyze } from '../../lib/fx/Analyzer';
import { ComplexTypeInstruction } from '../../lib/fx/instructions/ComplexTypeInstruction';
import { EInstructionTypes, IIdExprInstruction, IInstruction, IInstructionCollector, IVariableDeclInstruction, ITechniqueInstruction, IPassInstruction, IProvideInstruction, ITypeDeclInstruction, IVariableTypeInstruction, IInitExprInstruction, IFunctionDeclInstruction, IFunctionDefInstruction, IStmtInstruction, IScope, IStmtBlockInstruction, IDeclInstruction, IAssignmentExprInstruction } from '../../lib/idl/IInstruction';
import { IMap } from '../../lib/idl/IMap';
import { IParseTree, IRange } from '../../lib/idl/parser/IParser';
import { SystemTypeInstruction } from '../../lib/fx/instructions/SystemTypeInstruction';
import { Diagnostics } from '../../lib/util/Diagnostics';
import { DeclStmtInstruction } from '../../lib/fx/instructions/DeclStmtInstruction';
import { ReturnStmtInstruction } from '../../lib/fx/instructions/ReturnStmtInstruction';
import { ExprStmtInstruction } from 'lib/fx/instructions/ExprStmtInstruction';
import { IntInstruction } from 'lib/fx/instructions/IntInstruction';
import { PostfixArithmeticInstruction } from 'lib/fx/instructions/PostfixArithmeticInstruction';
import { ArithmeticExprInstruction } from 'lib/fx/instructions/ArithmeticExprInstruction';
import { FloatInstruction } from 'lib/fx/instructions/FloatInstruction';
import { BoolInstruction } from 'lib/fx/instructions/BoolInstruction';
import { StringInstruction } from 'lib/fx/instructions/StringInstruction';
import { ForStmtInstruction } from 'lib/fx/instructions/ForStmtInstruction';
import { SemicolonStmtInstruction } from 'lib/fx/instructions/SemicolonStmtInstruction';



// todo: use common func
function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}


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


interface PropertyProps {
    name?: any;
    value?: any;
    onMouseOver?: any;
    onMouseOut?: any;
    onClick?: any;
    selected?: boolean;
    opened?: boolean;
    system?: boolean;
    parent?: any;
    onParentClick?: any;
}


type PropertyComponent = React.StatelessComponent<PropertyProps>;



const Property: PropertyComponent =
    ({ name, value, children, onMouseOver, onMouseOut, onClick, selected, opened, system, parent, onParentClick }) => {
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
                className="astnode"
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
                                <span> <a style={ { color: 'rgba(0,0,0,0.3)' } } onClick={ onParentClick }><Icon name={ `git pull request` as any } size="small" /></a></span>
                            }
                            { helperProperty ? `[${name}]` : name }
                        </List.Header>

                    }
                    { isDefAndNotNull(value) &&
                        <List.Description>{ value }</List.Description>
                    }
                    { isDefAndNotNull(children) &&
                        <List.List className="astlist">
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

export interface IProgramViewProps {
    ast: IParseTree;
    filename?: string;

    onNodeOut?: (instr: IInstruction) => void;
    onNodeOver?: (instr: IInstruction) => void;
    onNodeClick?: (instr: IInstruction) => void;

    onUpdate?: (errors: { loc: IRange; message: string; }[]) => void;
    onComplete?: (root: IInstructionCollector) => void;
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
        this.setState({ root: result.root });

        props.onUpdate(result.diag.messages.map(mesg => ({ loc: Diagnostics.asRange(mesg), message: mesg.content })));

        console.log(Diagnostics.stringify(result.diag));

        if (isFunction(props.onComplete)) {
            props.onComplete(result.root);
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
                <List style={ style } selection size="small" className="astlist">
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
            case EInstructionTypes.k_AssignmentExprInstruction:
                return this.Assigment(instr);
            case EInstructionTypes.k_PostfixArithmeticInstruction:
                return this.PostfixArithmetic(instr);
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

            default:
                return this.NotImplemented(instr);
        }
    }


    InstructionCollector(instr: IInstructionCollector) {
        return (
            <PropertyOpt { ...this.bindProps(instr, true) } name="Program" >
                { (instr.instructions || []).map((instr) => this.Unknown(instr)) }
            </PropertyOpt>
        );
    }


    ProvideDecl(instr: IProvideInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="moduleName" value={ instr.moduleName } />
            </Property>
        );
    }


    TypeDecl(instr: ITypeDeclInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property { ...this.bindProps(instr) } name={ "type" } >
                    { this.Unknown(instr.type) }
                </Property>
                <SystemProperty name="name" value={ instr.name } />
            </Property>
        );
    }


    ComplexType(instr: ComplexTypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="name" value={ instr.name } />
                <PropertyOpt { ...this.bindProps(instr) } name="fields">
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
                <SystemProperty name="writable" value={ `${instr.writable}` } />
                <SystemProperty name="readable" value={ `${instr.readable}` } />
                <SystemProperty name="builtIn" value={ `${instr.builtIn}` } />
                <SystemProperty name="hash" value={ `${instr.hash}` } />
                <SystemProperty name="strongHash" value={ `${instr.strongHash}` } />
                <SystemProperty name="size" value={ `${instr.size} bytes` } />
                <SystemProperty name="length" value={ `${instr.length}` } />
                <SystemProperty name="base" value={ `${instr.isBase()}` } />
                <SystemProperty name="array" value={ `${instr.isArray()}` } />
                <SystemProperty name="complex" value={ `${instr.isComplex()}` } />
                <SystemProperty name="const" value={ `${instr.isConst()}` } />
            </SystemProperty>
        );
    }


    Pass(instr: IPassInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <PropertyOpt name="name" value={ instr.name } />
            </Property>
        );
    }


    Technique(instr: ITechniqueInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="name" value={ instr.name } />
                <PropertyOpt name="semantics" value={ instr.semantics } />
                <PropertyOpt name="passes">
                    { instr.passList.map((pass) => this.Pass(pass)) }
                </PropertyOpt>
            </Property>
        );
    }


    VariableDecl(instr: IVariableDeclInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="id" value={ instr.id.toString() } />
                <Property name="type" opened={ true }>
                    { this.VariableType(instr.type) }
                </Property>
                <PropertyOpt name="init" opened={ true }>
                    { this.InitExpr(instr.initExpr) }
                </PropertyOpt>
            </Property>
        );
    }


    FunctionDecl(instr: IFunctionDeclInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) } >
                <Property name="definition" >
                    { this.FunctionDefinition(instr.definition) }
                </Property>
                <PropertyOpt name="implementation" >
                    { this.StmtBlock(instr.implementation) }
                </PropertyOpt>
            </Property>
        )
    }


    IdExpr(instr: IIdExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="name" value={ instr.name } />
            </Property>
        )
    }


    Assigment(instr: IAssignmentExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="lval">
                    { this.Unknown(instr.left) }
                </Property>
                <Property name="rval">
                    { this.Unknown(instr.right) }
                </Property>
            </Property>
        )
    }


    PostfixArithmetic(instr: PostfixArithmeticInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <Property name="operator" value={ instr.operator } />
                <Property name="expr">
                    { this.Unknown(instr.expr) }
                </Property>
            </Property>
        )
    }


    ArithmeticExpr(instr: ArithmeticExprInstruction) {
        return (
            <Property { ...this.bindProps(instr) } >
                <Property name="operator" value={ instr.operator } />
                <Property name="operands">
                    { this.Unknown(instr.left) }
                    { this.Unknown(instr.right) }
                </Property>
            </Property>
        );
    }


    Int(instr: IntInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }

    Float(instr: FloatInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    Bool(instr: BoolInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    String(instr: StringInstruction) {
        return (
            <Property { ...this.bindProps(instr) } value={ String(instr.value) } />
        );
    }


    FunctionDefinition(instr: IFunctionDefInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <Property name="name" value={ instr.name } />
                <Property name="type" value={ instr.returnType.name } />
                <Property name="numArgsRequired" value={ String(instr.numArgsRequired) } />
                <PropertyOpt name="arguments">
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
                return this.SemicolonStmt(instr as SemicolonStmtInstruction);
                break;
        }

        return this.NotImplemented(instr); // TODO: remove it
    }


    DeclStmt(instr: DeclStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <Property name="declarations">
                    { instr.declList.map(decl => this.Unknown(decl)) }
                </Property>
            </Property>
        );
    }


    ReturnStmt(instr: ReturnStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <PropertyOpt name="value">
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


    SemicolonStmt(instr: SemicolonStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) } />
        );
    }


    ForStmt(instr: ForStmtInstruction) {
        return (
            <Property { ...this.bindProps(instr, true) }>
                <PropertyOpt name="init">
                    { this.Unknown(instr.init) }
                </PropertyOpt>
                <PropertyOpt name="cond">
                    { this.Unknown(instr.cond) }
                </PropertyOpt>
                <PropertyOpt name="step">
                    { this.Unknown(instr.step) }
                </PropertyOpt>
                <PropertyOpt name="body">
                    { this.Stmt(instr.body) }
                </PropertyOpt>
            </Property>
        );
    }


    VariableType(instr: IVariableTypeInstruction) {
        return (
            <Property { ...this.bindProps(instr) }>
                <PropertyOpt name="usages" opened={ false }>
                    { (instr.usageList.join(' ') || null) }
                </PropertyOpt>
                <PropertyOpt name="subType" opened={ true }>
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
                <Property name="const" value={ String(instr.isConst()) } />
                <Property name="array" value={ String(instr.isArray()) } />
                <Property name="arguments">
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
                    <Message size="mini" color="red">
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
            key: instr.instructionID,
            onMouseOver: this.handleMouseOver.bind(this, instr),
            onMouseOut: this.handleMouseOut.bind(this, instr),
            onClick: this.handleMouseClick.bind(this, instr),
            selected: !!instrState.selected,
            opened: !!instrState.opened,
            parent: instr.parent && `I${instr.parent.instructionID}`,
            onParentClick: this.handleParentClick.bind(this, instr)
        }
    }


    handleParentClick(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        let parent = instr.parent;

        if (parent && parent.sourceNode)
            this.props.onNodeOver(parent);
    }


    handleMouseOver(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, "selected");

        if (instr.sourceNode)
            this.props.onNodeOver(instr);
    }


    handleMouseOut(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, "selected");

        if (instr.sourceNode)
            this.props.onNodeOut(instr);
    }


    handleMouseClick(instr: IInstruction, e: MouseEvent) {
        e.stopPropagation();

        this.invertInstructionProperty(instr, "opened");

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

export default ProgramView;

