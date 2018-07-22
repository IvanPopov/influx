import { IFunctionDeclInstruction, IStmtInstruction, EInstructionTypes, IVariableDeclInstruction, IInstruction, IAssignmentExprInstruction, IIdExprInstruction } from "../idl/IInstruction";
import { DeclStmtInstruction } from "./instructions/DeclStmtInstruction";
import { IMap } from "../idl/IMap";
import { isNull } from "util";
import { ReturnStmtInstruction } from "./instructions/ReturnStmtInstruction";
import { ArithmeticExprInstruction } from "./instructions/ArithmeticExprInstruction";

class Node {
    id: number;
    value: string;
    dependencies: Node[];


    constructor(instr: IInstruction) {
        this.value = instr.toCode();
        this.id = instr.instructionID;
        this.dependencies = [];
    }


    addDependency(node: Node): void {
        if (isNull(node)) {
            return;
        }

        console.assert(this.dependencies.indexOf(node) == -1);
        this.dependencies.push(node);
    }
}


export class Flow {

    protected nodes: IMap<Node> = {};

    add(instr: IInstruction): void {
        this.addUnknown(instr);
    }

    protected addUnknown(instr: IInstruction): Node | null {
        if (isNull(instr)) {
            return null;
        }

        switch (instr.instructionType) {
            case EInstructionTypes.k_DeclStmtInstruction:
                (<DeclStmtInstruction>instr).declList.map( decl => this.addUnknown(decl) );
                return null;
            case EInstructionTypes.k_VariableDeclInstruction:
                return this.addVariable(<IVariableDeclInstruction>instr);
            case EInstructionTypes.k_ReturnStmtInstruction:
                return this.addReturn(<ReturnStmtInstruction>instr);
            case EInstructionTypes.k_ArithmeticExprInstruction:
                return this.addArithmetic(<ArithmeticExprInstruction>instr);
            case EInstructionTypes.k_IdExprInstruction:
                return this.addId(<IIdExprInstruction>instr);
            case EInstructionTypes.k_AssignmentExprInstruction:
            default:
                console.warn(EInstructionTypes[instr.instructionType], 'unhandled statement found.');
        }

        return null;
    }


    protected addVariable(instr: IVariableDeclInstruction): Node {
        let varNode = this.createNode(instr.id);
        let initNode = this.addUnknown(instr.initExpr);
        varNode.addDependency(initNode);

        return varNode;
    }

    
    protected addReturn(instr: ReturnStmtInstruction): Node {
        let retNode = this.createNode(instr);
        let exprNode = this.addUnknown(instr.expr);
        retNode.addDependency(exprNode);
        return retNode;
    }


    protected addArithmetic(instr: ArithmeticExprInstruction): Node {
        let arithmeticNode = this.createNode(instr);

        let leftNode = this.addUnknown(instr.left);
        let rightNode = this.addUnknown(instr.right);

        arithmeticNode.addDependency(leftNode);
        arithmeticNode.addDependency(rightNode);

        return arithmeticNode;
    }

    protected addId(instr: IIdExprInstruction): Node {
        let idNode = this.createNode(instr.declaration.id);

        return idNode;
    }


    protected createNode(instr: IInstruction): Node {
        if (isNull(instr)) {
            return null;
        }

        
        let node = new Node(instr);
        this.nodes[node.value] = this.nodes[node.value] || node;
        return this.nodes[node.value];
    }
}

export function analyze (func: IFunctionDeclInstruction) 
{
    let flow = new Flow;
    let body = func.implementation;

    body.stmtList.forEach(stmt => {
        flow.add(stmt);
    });

    return flow;
}