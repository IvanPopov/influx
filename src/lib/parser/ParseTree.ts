import { assert } from "@lib/common";
import { ENodeCreateMode, IParseNode, IParseTree, IPosition, IRange, IRule, IToken } from "@lib/idl/parser/IParser";

import { extendRange } from "./util";

export class ParseTree implements IParseTree {
    root: IParseNode;
    nodes: IParseNode[];
    
    readonly optimized: boolean;
    
    private nodesCountStack: number[];


    constructor(optimized: boolean, root: IParseNode = null) {
        this.root = root;
        this.nodes = [];
        this.optimized = optimized;

        this.nodesCountStack = [];
    }


    get lastNode(): IParseNode {
        return this.nodes[this.nodes.length - 1];
    }


    finishTree(): void {
        this.root = this.nodes.pop() || null;
    }


    addToken({ name, value, loc }: IToken): void {
        const children = null;
        const parent = null;
        this.addNode({ name, value, loc, children, parent });
    }

    reduceByRule(rule: IRule, eCreate: ENodeCreateMode = ENodeCreateMode.k_Default): void {
        let iReduceCount = 0;
        let nodesCountStack = this.nodesCountStack;
        let ruleLength = rule.right.length;
        let nodes = this.nodes;
        let optimize = this.optimized ? 1 : 0;

        while (ruleLength) {
            iReduceCount += nodesCountStack.pop();
            ruleLength--;
        }

        if ((eCreate === ENodeCreateMode.k_Skip && iReduceCount > optimize) || iReduceCount === 0) {
            nodes.length -= iReduceCount;
            nodesCountStack.push(0);
        }  else if ((eCreate === ENodeCreateMode.k_Default && iReduceCount > optimize) || 
            (eCreate === ENodeCreateMode.k_Necessary)) {

            assert(iReduceCount > 0);
            
            let temp = nodes.pop();
            iReduceCount--;
            
            const name = rule.left;
            // TODO: use correct location in case of include macro. 
            const loc = { ...temp.loc };

            const node: IParseNode = { name, children: null, parent: null, value: '', loc };

            this.addLink(node, temp);

            while (iReduceCount) {
                assert(nodes.length > 0);
                this.addLink(node, nodes.pop());
                iReduceCount--;
            }
            
            nodes.push(node);
            nodesCountStack.push(1);      
        }
        else {
            nodesCountStack.push(iReduceCount);
        }
    }

    private addNode(node: IParseNode): void {
        this.nodes.push(node);
        this.nodesCountStack.push(1);
    }

    $pop(loc: IRange = null): void {
        let count = this.nodesCountStack.pop();
        while (count) {
            let node = this.nodes.pop();
            if (loc) {
                extendRange(loc, node.loc);
            }
            count--;
        }
    }
 
    private addLink(parent: IParseNode, child: IParseNode): void {
        parent.children = parent.children || [];
        
        extendRange(parent.loc, child.loc);
        
        parent.children.push(child);
        child.parent = parent;
    }


    /** @deprecated */
    clone(): IParseTree {
        return new ParseTree(this.optimized, this.cloneNode(this.root));
    }


    /** @deprecated */
    // FIXME: location should be clonned too
    private cloneNode({ name, value, children }: IParseNode): IParseNode {
        const clone: IParseNode = { name, value, children: null, parent: null };
        if (children) { 
            children.forEach(child => this.addLink(clone, this.cloneNode(child)))
        }
        return clone;
    }

    /** @deprecated */
    toString(): string {
        if (this.root) {
            return this.toStringNode(this.root);
        }

        return '';
    }

    /** @deprecated */
    private toStringNode(node: IParseNode, padding: string = ""): string {
        let res: string = padding + "{\n";
        let oldPadding: string = padding;
        let defaultPadding: string = "  ";

        padding += defaultPadding;

        if (node.value) {
            res += padding + "name : \"" + node.name + "\"" + ",\n";
            res += padding + "value : \"" + node.value + "\"" + "\n";
        }
        else {
            res += padding + "name : \"" + node.name + "\"" + "\n";
            res += padding + "children : [";

            let children: IParseNode[] = node.children;

            if (children) {
                res += "\n";
                padding += defaultPadding;

                for (let i = children.length - 1; i >= 0; i--) {
                    res += this.toStringNode(children[i], padding);
                    res += ",\n";
                }

                res = res.slice(0, res.length - 2);
                res += "\n";
                res += oldPadding + defaultPadding + "]\n";
            }
            else {
                res += " ]\n";
            }
        }
        res += oldPadding + "}";
        return res;
    }

    /** @deprecated */
    toHTMLString(node: IParseNode, padding: string = "") {
        node = node || this.root;
        let res = padding + "{\n";
        let oldPadding = padding;
        let defaultPadding = "  ";
        padding += defaultPadding;
        if (node.value) {
            res += padding + "<b style=\"color: #458383;\">name</b>: \"" + node.name + "\"" + ",\n";
            res += padding + "<b style=\"color: #458383;\">value</b>: \"" + node.value + "\"" + ",\n";
            res += padding + "<b style=\"color: #458383;\">line</b>: \"" + node.loc.start.line + "\" - \"" + node.loc.end.line + "\"" + "\n";
            res += padding + "<b style=\"color: #458383;\">column</b>: \"" + node.loc.start.column + "\" - \"" + node.loc.end.column + "\"" + "\n";
            // sRes += sPadding + "<b style=\"color: #458383;\">position</b>: \"" + pNode.position + "\"" + "\n";
        }
        else {
            let i;
            res += padding + "<i style=\"color: #8A2BE2;\">name</i>: \"" + node.name + "\"" + "\n";
            res += padding + "<b style=\"color: #458383;\">line</b>: \"" + node.loc.start.line + "\" - \"" + node.loc.end.line + "\"" + "\n";
            res += padding + "<b style=\"color: #458383;\">column</b>: \"" + node.loc.start.column + "\" - \"" + node.loc.end.column + "\"" + "\n";
            // sRes += sPadding + "<b style=\"color: #458383;\">position</b>: \"" + pNode.position + "\"" + "\n";
            res += padding + "<i style=\"color: #8A2BE2;\">children</i>: [";
            if (node.children) {
                res += "\n";
                padding += defaultPadding;
                for (i = node.children.length - 1; i >= 0; i--) {
                    res += this.toHTMLString(node.children[i], padding);
                    res += ",\n";
                }
                res = res.slice(0, res.length - 2);
                res += "\n";
                res += oldPadding + defaultPadding + "]\n";
            }
            else {
                res += " ]\n";
            }
        }
        res += oldPadding + "}";
        return res;
    }
}
