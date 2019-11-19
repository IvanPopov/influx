import { ENodeCreateMode, IParseNode, IParseTree, IPosition, IRange, IRule, IToken } from "../idl/parser/IParser";
import { assert } from "./../common";

function locMin(a: IPosition, b: IPosition): IPosition {
    assert(a.file == b.file);
    return {
        line: Math.min(a.line, b.line),
        column: Math.min(a.column, b.column),
        file: a.file
    };
}

function locMax(a: IPosition, b: IPosition): IPosition {
    assert(a.file == b.file);
    return {
        line: Math.max(a.line, b.line),
        column: Math.max(a.column, b.column),
        file: a.file
    };
}


export class ParseTree implements IParseTree {
    private _root: IParseNode;
    private _nodes: IParseNode[];
    private _nodesCountStack: number[];
    private _isOptimizeMode: boolean;

    getRoot(): IParseNode {
        return this._root;
    }

    setRoot(root: IParseNode): void {
        this._root = root;
    }

    constructor() {
        this._root = null;
        this._nodes = <IParseNode[]>[];
        this._nodesCountStack = <number[]>[];
        this._isOptimizeMode = false;
    }

    finishTree(): void {
        this._root = this._nodes.pop();
    }

    setOptimizeMode(isOptimize: boolean): void {
        this._isOptimizeMode = isOptimize;
    }

    addToken(token: IToken): void {
        let node: IParseNode = {
            name: token.name,
            value: token.value,
            children: null,
            parent: null,
            loc: token.loc,
        };

        this.addNode(node);
    }

    addNode(node: IParseNode): void {
        this._nodes.push(node);
        this._nodesCountStack.push(1);
    }

    removeNode(): IParseNode {
        this._nodesCountStack.pop();
        return this._nodes.pop();
    }

    reduceByRule(rule: IRule, eCreate: ENodeCreateMode = ENodeCreateMode.k_Default): void {
        let iReduceCount = 0;
        let nodesCountStack= this._nodesCountStack;
        let ruleLength = rule.right.length;
        let nodes = this._nodes;
        let optimize = this._isOptimizeMode ? 1 : 0;

        while (ruleLength) {
            iReduceCount += nodesCountStack.pop();
            ruleLength--;
        }

        if ((eCreate === ENodeCreateMode.k_Default && iReduceCount > optimize) || (eCreate === ENodeCreateMode.k_Necessary)) {
            let node: IParseNode;

            if (iReduceCount > 0) {
                let temp = nodes.pop();
                iReduceCount--;

                node = {
                    name: rule.left,
                    children: null,
                    parent: null,
                    value: '',
                    loc: { ...temp.loc }
                };

                this.addLink(node, temp);

                while (iReduceCount) {
                    assert(nodes.length > 0);
                    this.addLink(node, nodes.pop());
                    iReduceCount --;
                }
            } else {
                console.warn('something went wrong');
                node = {
                    name: rule.left,
                    children: [],
                    parent: null,
                    value: '',
                    loc: {
                        start: { file: null, line: 0, column: 0 },
                        end: { file: null, line: 0, column: 0 }
                    }
                };
            }

            nodes.push(node);
            nodesCountStack.push(1);
        }
        else {
            nodesCountStack.push(iReduceCount);
        }
    }

    toString(): string {
        if (this._root) {
            return this.toStringNode(this._root);
        }
        else {
            return "";
        }
    }

    clone(): IParseTree {
        let pTree = new ParseTree();
        pTree.setRoot(this.cloneNode(this._root));
        return pTree;
    }

    getNodes(): IParseNode[] {
        return this._nodes;
    }

    getLastNode(): IParseNode {
        return this._nodes[this._nodes.length - 1];
    }

    private addLink(parent: IParseNode, node: IParseNode): void {
        if (!parent.children) {
            parent.children = <IParseNode[]>[];
        }
        
       
        
        // if (!node) {
        //     console.warn('node is undefined!');
        // } 
        // else 
        {
            if (node.loc.start.line < parent.loc.start.line) {
                parent.loc.start = { ...node.loc.start };
            } else if (node.loc.start.line === parent.loc.start.line) {
                parent.loc.start = locMin(node.loc.start, parent.loc.start);
            }
    
            if (node.loc.end.line > parent.loc.end.line) {
                parent.loc.end = { ...node.loc.end };
            } else if (node.loc.end.line === parent.loc.end.line) {
                parent.loc.end = locMax(node.loc.end, parent.loc.end);
            }

            parent.children.push(node);
            node.parent = parent;
        }
    }

    private cloneNode(node: IParseNode): IParseNode {
        let newNode: IParseNode;
        newNode = <IParseNode>{
            name: node.name,
            value: node.value,
            children: null,
            parent: null
        };

        let children: IParseNode[] = node.children;
        for (let i = 0; children && i < children.length; i++) {
            this.addLink(newNode, this.cloneNode(children[i]));
        }

        return newNode;
    }

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

    toHTMLString(node: IParseNode, padding: string = "") {
        node = node || this.getRoot();
        let res = padding + "{\n";
        let oldPadding = padding;
        let defaultPadding = "  ";
        padding += defaultPadding;
        if (node.value) {
            res += padding + "<b style=\"color: #458383;\">name</b>: \"" + node.name + "\"" + ",\n";
            res += padding + "<b style=\"color: #458383;\">value</b>: \"" + node.value + "\"" + ",\n";
            res += padding + "<b style=\"color: #458383;\">line</b>: \"" + node.loc.start.line + "\" - \""  + node.loc.end.line + "\"" + "\n";
            res += padding + "<b style=\"color: #458383;\">column</b>: \"" + node.loc.start.column + "\" - \""  + node.loc.end.column + "\"" + "\n";
            // sRes += sPadding + "<b style=\"color: #458383;\">position</b>: \"" + pNode.position + "\"" + "\n";
        }
        else {
            let i;
            res += padding + "<i style=\"color: #8A2BE2;\">name</i>: \"" + node.name + "\"" + "\n";
            res += padding + "<b style=\"color: #458383;\">line</b>: \"" + node.loc.start.line + "\" - \""  + node.loc.end.line + "\"" + "\n";
            res += padding + "<b style=\"color: #458383;\">column</b>: \"" + node.loc.start.column + "\" - \""  + node.loc.end.column + "\"" + "\n";
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
