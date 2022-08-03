import { isNull, isString } from "@lib/common";
import { Context, parseUintLiteral } from "@lib/fx/analisys/Analyzer";
import { AssignmentExprInstruction } from "@lib/fx/analisys/instructions/AssignmentExprInstruction";
import { BoolInstruction } from "@lib/fx/analisys/instructions/BoolInstruction";
import { DeclStmtInstruction } from "@lib/fx/analisys/instructions/DeclStmtInstruction";
import { ExprStmtInstruction } from "@lib/fx/analisys/instructions/ExprStmtInstruction";
import { FunctionDeclInstruction } from "@lib/fx/analisys/instructions/FunctionDeclInstruction";
import { FunctionDefInstruction } from "@lib/fx/analisys/instructions/FunctionDefInstruction";
import { IdExprInstruction } from "@lib/fx/analisys/instructions/IdExprInstruction";
import { IdInstruction } from "@lib/fx/analisys/instructions/IdInstruction";
import { IntInstruction } from "@lib/fx/analisys/instructions/IntInstruction";
import { ReturnStmtInstruction } from "@lib/fx/analisys/instructions/ReturnStmtInstruction";
import { StmtBlockInstruction } from "@lib/fx/analisys/instructions/StmtBlockInstruction";
import { VariableDeclInstruction } from "@lib/fx/analisys/instructions/VariableDeclInstruction";
import { VariableTypeInstruction } from "@lib/fx/analisys/instructions/VariableTypeInstruction";
import { ProgramScope } from "@lib/fx/analisys/ProgramScope";
import * as SystemScope from "@lib/fx/analisys/SystemScope";
import { EInstructionTypes, EScopeType, IDeclInstruction, IExprInstruction, IFunctionDeclInstruction, IIdInstruction, IStmtInstruction, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { nodesForceRecompile, nodesProvideDocs } from "@sandbox/actions";
import { INodeInputSlot, INodeOutputSlot, LGraphNode, LiteGraph, LLink } from "litegraph.js";
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { PostfixPointInstruction } from "@lib/fx/analisys/instructions/PostfixPointInstruction";

export type LGraphNodeFactory = IMap<new () => LGraphNode>;


export class GraphContext extends Context
{
    varNum = 0;

    addLocal() { return `t${this.varNum++}`; }
}

export interface INodeDocs
{
    name: string;
    desc?: string;
    title?: string;
    params?: any;
}

export const AST = <T extends Context>(context: T, program: ProgramScope) => ({

    variable(name: string, typeName: string, usages = []): IVariableDeclInstruction {
        const scope = program.currentScope;
        const id = new IdInstruction({ scope, name });
        const type = new VariableTypeInstruction({ scope, type: scope.findType(typeName), usages });
        const varDecl = new VariableDeclInstruction({ scope, type, id });
        scope.addVariable(varDecl);
        return varDecl;
    },

    stmt(declList: IDeclInstruction[]): IStmtInstruction {
        const scope = program.currentScope;
        return new DeclStmtInstruction({ scope, declList });
    },

    assigment(left: IExprInstruction, right: IExprInstruction): IStmtInstruction {
        const scope = program.currentScope;

        if (!right.type.readable) {
            context.error(right.sourceNode, EErrors.InvalidTypeForReading);
        }
        const expr = new AssignmentExprInstruction({ scope, left, right, operator: '=' });
        return new ExprStmtInstruction({ scope, expr });
    },
    
    bool(value: boolean): IExprInstruction {
        const scope = program.currentScope;
        return new BoolInstruction({ scope, value });
    },

    int(value: number): IExprInstruction {
        const scope = program.currentScope;
        const { base, signed, heximal, exp } = parseUintLiteral(value.toFixed(0));
        return new IntInstruction({ scope, base, exp, signed, heximal });
    },

    id(name: string): IIdInstruction {
        const scope = program.currentScope;
        return new IdInstruction({ scope, name });
    },

    idexpr(name: string): IExprInstruction {
        const scope = program.currentScope;
        const decl = scope.findVariable(name);
        if (isNull(decl)) {
            //context.error(sourceNode, EErrors.UnknownVarName, { varName: name });
            return null;
        }
        const id = new IdInstruction({ scope, name });
        return new IdExprInstruction({ scope, id, decl });
    },

    postfixpoint(ppname: string)
    {
        const [ elementName, fieldName ] = ppname.split('.');
        const scope = program.currentScope;
        const element = this.idexpr(elementName);
        const postfix = new IdExprInstruction({ 
            scope,
            id: new IdInstruction({ scope, name: fieldName }), 
            decl: element.type.getField(fieldName) 
        });
        return new PostfixPointInstruction({ scope, element, postfix });
    },

    return(expr: IExprInstruction): IStmtInstruction {
        const scope = program.currentScope;
        return new ReturnStmtInstruction({ 
            scope, 
            expr
        });
    },

    // bool foo(int x)
    func(signature: string, 
        content: () => IStmtInstruction[]): IFunctionDeclInstruction {

        const regex = /(?<typeName>\w+)\s(?<funcName>\w+)\(\s*(?<paramStr>.*)\)/mg;
        const match = regex.exec(signature);
        if (!match) {
            return null;
        }

        const ast = AST(context, program);
        const { funcName, typeName, paramStr } = match.groups;
        const paramList = paramStr
            .split(',')
            .map(x => x.trim())
            .map(p => p.split(/\s+/).reverse())
            .map(([name, type, usage]) => ast.variable(name, type, usage ? [ usage ] : []))

        const scope = program.currentScope;
        const globalScope = program.globalScope;

        program.push(EScopeType.k_Default);

        const returnType = VariableTypeInstruction.wrap(scope.findType(typeName), SystemScope.SCOPE);
        const id = ast.id(funcName)
        const definition = new FunctionDefInstruction({ scope, returnType, id, paramList });
        context.funcDef = definition;
        
        const stmtList = [ ...content() ];

        if (stmtList[stmtList.length - 1].instructionType != EInstructionTypes.k_ReturnStmt) {
            let returnExpr = null;
            switch (typeName) {
                case 'bool': 
                    returnExpr = ast.bool(true); 
                    break;
                case 'uint':
                case 'int': 
                    returnExpr = ast.int(0); 
                    break;
                case 'void':
                    break;
                default:
                    console.error('unsupported type of return expression');
            }

            stmtList.push(ast.return(returnExpr));
        }

        const implementation = new StmtBlockInstruction({ scope, stmtList });
        
        program.pop();

        let func = new FunctionDeclInstruction({ scope, definition, implementation });
        globalScope.addFunction(func);

        return func;
    }
});

export class CodeEmitterNode extends LGraphNode
{
    // docs provided outside from autogenDocumentation() method;
    static nodesDocs: IMap<INodeDocs> = {};

    // names of local variables
    protected locals: string[];

    //
    // Helpers 
    //

    link(id: number | string): number 
    {
        let slot: number = -1;
        if (isString(id)) {
            slot = this.inputs.findIndex(i => i.name == id)
        } else {
            slot = id as number;
        }
        const ii = this.getInputInfo(slot);
        if (!ii) return -1;
        const link = ii.link;
        if (!link) return -1;
        return this.graph.links[link].origin_slot;
    }

    getInputNode(id: number | string): CodeEmitterNode
    {
        let slot: number = -1;
        if (isString(id)) {
            slot = this.inputs.findIndex(i => i.name == id)
        } else {
            slot = id as number;
        }
        return super.getInputNode(slot) as CodeEmitterNode;
    }


    getOutputNodes(id: number | string): CodeEmitterNode[]
    {
        let slot: number = -1;
        if (isString(id)) {
            slot = this.outputs.findIndex(i => i.name == id)
        } else {
            slot = id as number;
        }
        return super.getOutputNodes(slot) as CodeEmitterNode[];
    }


    // todo: move to litegraph.js
    getInputNodes(): CodeEmitterNode[]
    {
        return this.inputs
            .filter(i => i && i.link !== null)  // filter valid inputs
            .map(i => this.graph.links[i.link]) // conver inputs to link infos
            .filter(li => !!li)                 // filter valid links
            .map(li => this.graph.getNodeById(li.origin_id) as CodeEmitterNode);
    }

    //
    // Execution api
    //
 
    async run(env: ISLDocument): Promise<ISLDocument>
    {
        return null
    }


    protected local(slot: number) {
        return this.locals[0];
    }


    protected addLocal(context: GraphContext, program: ProgramScope, type: string, expr: IExprInstruction): IStmtInstruction[] {
        const t = context.addLocal();
        this.locals = [ t ];
        const ast = AST(context, program);
        return [ 
            ast.stmt([ ast.variable(t, type) ]),
            ast.assigment(ast.idexpr(t), expr)
        ];
    }


    onBeforeExecution(): void {
        this.locals = null; // clean up precached names
        this.inputs.forEach((n, i) => 
            n.type != LiteGraph.ACTION && this.getInputNode(i)?.onBeforeExecution());
        this.outputs.forEach((n, i) => 
            n.type == LiteGraph.EVENT && this.getOutputNodes(i)?.forEach(node => node.onBeforeExecution()));
    }


    compute(context: GraphContext, program: ProgramScope): IStmtInstruction[] {
        return this.inputs.map((n, i) => n.type == LiteGraph.ACTION 
            ? [] 
            : this.getInputNode(i)?.compute(context, program) || []).flat();
    }


    exec(context: Context, program: ProgramScope, slot: number): IExprInstruction {
        const scope = program.currentScope;
        return new BoolInstruction({ scope, value: false });
    }

    //
    // Docs api
    //

    getDocs(): string 
    {
        return CodeEmitterNode.nodesDocs[this.title]?.desc || "[no description found]";
    }


    getTitle(): string {
        const titleEx = CodeEmitterNode.nodesDocs[this.title];
        return titleEx?.title || this.title;
    }


    onSelected(): void 
    {
        const docs = this.getDocs();
        if (docs)
        {
            nodesProvideDocs(docs);
        }
    }


    onDeselected(): void 
    {
        const docs = this.getDocs();
        if (docs)
        {
            nodesProvideDocs(null);
        }
    }


    onPropertyChanged(name: string, value: number, prevValue: number): boolean
    {
        nodesForceRecompile();
        return true;
    }


    emitError(desc?: string)
    {
        if (desc) console.error(desc);
        this.color = 'red';
    }


    emitNoError()
    {
        this.color = null;
    }


    onConnectionsChange(type: number, slotIndex: number, isConnected: boolean, link: LLink, ioSlot: INodeInputSlot | INodeOutputSlot): void {
        this.emitNoError(); // clean up errors on every change
    }
}

export interface ICodeMaterialNode extends CodeEmitterNode
{
    get uid(): number;          // name identifier for PrerenderRoutine<UID>()
    get sorting(): boolean;     // pass options
    get geometry(): string;     // pass options
}

// export class CodeEmitterFunc extends CodeEmitterNode
// {
//     constructor(name: string) {
//         super(name);
//         this.addOutput("stmts", LiteGraph.EVENT);
//     }

//     private extend(env: ISLDocument): ISLDocument {
//         const uri = env.uri;
//         const scope = env.root.scope;
//         const program = new ProgramScope(scope);
//         const context = new GraphContext(uri)
//         const ast = AST(context, program);

//         context.beginFunc();
//         const fdecl = ast.func(`bool UpdateRoutine(inout Part part, int partId)`, 
//             () => (this.getOutputNodes(0) || []).map(node => node.compute(context, program)).flat());
//         context.endFunc();

//         const diagnosticReport = Diagnostics.mergeReports([env.diagnosticReport, context.diagnostics.resolve()]);
//         const instructions = env.root.instructions.concat([ fdecl ]);
//         const root = new InstructionCollector({ scope: program.globalScope, instructions });
//         return { root, diagnosticReport, uri };
//     }

//     async run(env: ISLDocument): Promise<ISLDocument>
//     {
//         this.getOutputNodes(0).forEach(node => node.onBeforeExecution());
//         return this.extend(env);
//     }
// }