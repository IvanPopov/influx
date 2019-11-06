import { IFunctionDeclInstruction, IExprInstruction, EInstructionTypes, IVariableDeclInstruction, IInstruction, IAssignmentExprInstruction, IIdExprInstruction, IIdInstruction, IInitExprInstruction } from '../idl/IInstruction';
import { PostfixOperator } from "./instructions/PostfixArithmeticInstruction";
import { isDefAndNotNull, isDef } from "./../common";
import { DeclStmtInstruction } from './instructions/DeclStmtInstruction';
import { Instruction } from './instructions/Instruction';
import { IMap } from '../idl/IMap';
import { isNull, assert } from '../common';
import { ReturnStmtInstruction } from './instructions/ReturnStmtInstruction';
import { ArithmeticExprInstruction } from './instructions/ArithmeticExprInstruction';
import { IdExprInstruction } from './instructions/IdExprInstruction';
import { PostfixArithmeticInstruction } from './instructions/PostfixArithmeticInstruction';

interface INode {
    id: number;
    value: string;
    deps: INode[] | null;
    usages: INode[] | null;
}

function dotName(node: INode) {
    if (isNull(node)) {
        return `node_undefined`;
    }
    return `node_${node.id}`;
}

function dotString(node: INode): string {
    if (!isDefAndNotNull(node)) {
        return '';
    }

    let content = `${dotName(node)} [ label="${node.value.replace(/\n/g, '\\n')}" ]\n`;

    if (node.deps) {
        for (let dep of node.deps) {
            content += `${dotName(node)} -> ${dotName(dep)}\n`;
        }
    }

    return content;
}

class Node implements INode {
    id: number;
    value: string;
    deps: INode[];
    usages: INode[];


    constructor(instr: IInstruction, deps?: INode[]) {
        this.value = instr.toCode();
        this.id = instr.instructionID;
        this.deps = deps;
        this.usages = null;
    }


    addDependency(node: Node): void {
        if (isNull(node)) {
            return;
        }

        assert(this.deps.indexOf(node) == -1);
        this.deps.push(node);
    }


    addUsage(node: Node): void {
        if (isNull(node)) {
            return;
        }

        assert(this.usages.indexOf(node) == -1);
        this.usages.push(node);
    }
}

const UNDEF: INode = { id: (0xffffffff >>> 0), value: '[undefined]', usages: null, deps: null };


function localID(instr: IIdExprInstruction) {
    return instr.decl.id.instructionID;
}

export class Flow {

    protected locals: IMap<INode> = {};

    place(instr: IInstruction): INode {
        return this.placeUnknown(instr);
    }

    protected placeUnknown(instr: IInstruction): INode {
        if (isNull(instr)) {
            return null;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_DeclStmtInstruction:
            {
                let deps: INode[] = (<DeclStmtInstruction>instr).declList.map( decl => this.placeUnknown(decl) );
                return new Node(instr, deps);
            }

            case EInstructionTypes.k_VariableDeclInstruction:
            {
                let variable = <IVariableDeclInstruction>instr;
                let id = variable.id;
                assert(id.parent === instr);
                let local = this.assignLocal(id.instructionID, UNDEF);

                if (variable.initExpr) {
                    local = this.assignLocal(id.instructionID, this.placeExpr(variable.initExpr));
                }

                return local;
            }

            case EInstructionTypes.k_ReturnStmtInstruction:
            {
                let ret = <ReturnStmtInstruction>instr;
                return new Node(instr, [ this.placeExpr(ret.expr) ]);
            }

            case EInstructionTypes.k_PostfixArithmeticInstruction:
            case EInstructionTypes.k_ArithmeticExprInstruction:
            case EInstructionTypes.k_IdExprInstruction:
            case EInstructionTypes.k_AssignmentExprInstruction:
            {
                return this.placeExpr(instr);
            }

            default:
                console.warn(EInstructionTypes[instr.instructionType], 'unhandled statement found.');
        }

        return null;
    }


    protected placeExpr(instr: IInstruction) {
        if (isNull(instr)) {
            return null;
        }

        assert(Instruction.isExpression(instr));

        switch (instr.instructionType) {
            case EInstructionTypes.k_InitExprInstruction:
            {
                let init = <IInitExprInstruction>instr;
                assert(!init.isArray());
                return this.placeExpr(init.args[0]);
            }
            
            case EInstructionTypes.k_IntInstruction:
            case EInstructionTypes.k_FloatInstruction:
            case EInstructionTypes.k_BoolInstruction:
            {
                return new Node(instr);
            }

            case EInstructionTypes.k_ArithmeticExprInstruction:
            {
                let arithmetic = <ArithmeticExprInstruction>instr;
                let left = this.placeExpr(arithmetic.left);
                let right = this.placeExpr(arithmetic.right);

                return new Node(instr, [ left, right ]);
            }

            case EInstructionTypes.k_IdExprInstruction:
            {
                let idExpr = <IdExprInstruction>instr;
                let local = this.locals[localID(idExpr)];

                assert(isDefAndNotNull(local));

                // todo: add usages;
                return local;
            }

            case EInstructionTypes.k_AssignmentExprInstruction:
            {
                let assign = <IAssignmentExprInstruction>instr;
                let isSubstitution = (assign.operator === '='); // todo: refactor this!
                
                assert(assign.left.instructionType === EInstructionTypes.k_IdExprInstruction);
                let left = this.placeExpr(assign.left);
                assert(left === this.locals[localID(<IIdExprInstruction>assign.left)]);

                let right = this.placeExpr(assign.right);

                assert(isSubstitution);

                this.assignLocal(localID(<IIdExprInstruction>assign.left), right);

                return right;
            }

            case EInstructionTypes.k_PostfixArithmeticInstruction:
            {
                let postfix = <PostfixArithmeticInstruction>instr;

                let local = this.placeExpr(postfix.expr);

                let val = new Node(instr, [local]);

                this.assignLocal(local.id, val);
            }
        }

        return null;
    }


    protected assignLocal(localID: number, valNext: INode): INode {
        // assert(Instruction.isExpression(instr));
        let valPrev = this.locals[localID];
        
        if (valPrev) {
            // todo: convert to diag warning!
            console.log(`local's value was updated from '${valPrev.value}' to ${valNext.value}`);
        }

        this.locals[localID] = valNext;
        return valNext;
    }
}

export function analyze (func: IFunctionDeclInstruction) 
{
    let flow = new Flow;
    let body = func.impl;

    let res = body.stmtList.map(stmt => flow.place(stmt));
    let graphContent = res.map( n => dotString(n) ).join('\n');
    console.log(`digraph {\n${dotString(UNDEF)}\n${graphContent}\n}`);

    return flow;
}