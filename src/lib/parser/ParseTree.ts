import { IParseTree, IParseNode, IToken, ENodeCreateMode, IRule, IRange, IPosition } from "../idl/parser/IParser";

function locMin(a: IPosition, b: IPosition): IPosition {
    return {
        line: Math.min(a.line, b.line),
        column: Math.min(a.column, b.column)
    };
}

function locMax(a: IPosition, b: IPosition): IPosition {
    return {
        line: Math.max(a.line, b.line),
        column: Math.max(a.column, b.column)
    };
}

export class ParseTree implements IParseTree {
    private _pRoot: IParseNode;
    private _pNodes: IParseNode[];
    private _pNodesCountStack: number[];
    private _isOptimizeMode: boolean;

    getRoot(): IParseNode {
        return this._pRoot;
    }

    setRoot(pRoot: IParseNode): void {
        this._pRoot = pRoot;
    }

    constructor() {
        this._pRoot = null;
        this._pNodes = <IParseNode[]>[];
        this._pNodesCountStack = <number[]>[];
        this._isOptimizeMode = false;
    }

    finishTree(): void {
        this._pRoot = this._pNodes.pop();
    }

    setOptimizeMode(isOptimize: boolean): void {
        this._isOptimizeMode = isOptimize;
    }

    addToken(pToken: IToken): void {
        let pNode: IParseNode = {
            name: pToken.name,
            value: pToken.value,
            children: null,
            parent: null,
            loc: pToken.loc,
        };

        this.addNode(pNode);
    }

    addNode(pNode: IParseNode): void {
        this._pNodes.push(pNode);
        this._pNodesCountStack.push(1);
    }

    reduceByRule(pRule: IRule, eCreate: ENodeCreateMode = ENodeCreateMode.k_Default): void {
        let iReduceCount: number = 0;
        let pNodesCountStack: number[] = this._pNodesCountStack;
        let pNode: IParseNode;
        let iRuleLength: number = pRule.right.length;
        let pNodes: IParseNode[] = this._pNodes;
        let nOptimize: number = this._isOptimizeMode ? 1 : 0;
        let pTemp: IParseNode;

        while (iRuleLength) {
            iReduceCount += pNodesCountStack.pop();
            iRuleLength--;
        }

        if ((eCreate === ENodeCreateMode.k_Default && iReduceCount > nOptimize) || (eCreate === ENodeCreateMode.k_Necessary)) {

            pTemp = pNodes.pop();
            iReduceCount--;

            pNode = {
                name: pRule.left,
                children: null,
                parent: null,
                value: '',
                loc: {
                    start: pTemp.loc.start,
                    end: pTemp.loc.end
                }
            };

            this.addLink(pNode, pTemp);

            while (iReduceCount) {
                this.addLink(pNode, pNodes.pop());
                iReduceCount --;
            }

            pNodes.push(pNode);
            pNodesCountStack.push(1);
        }
        else {
            pNodesCountStack.push(iReduceCount);
        }
    }

    toString(): string {
        if (this._pRoot) {
            return this.toStringNode(this._pRoot);
        }
        else {
            return "";
        }
    }

    clone(): IParseTree {
        let pTree = new ParseTree();
        pTree.setRoot(this.cloneNode(this._pRoot));
        return pTree;
    }

    getNodes(): IParseNode[] {
        return this._pNodes;
    }

    getLastNode(): IParseNode {
        return this._pNodes[this._pNodes.length - 1];
    }

    private addLink(pParent: IParseNode, pNode: IParseNode): void {
        if (!pParent.children) {
            pParent.children = <IParseNode[]>[];
        }
        
        // todo: remove min/max in order to correct start/end calculation based on node order
        pParent.loc.start = locMin(pNode.loc.start, pParent.loc.start);
        pParent.loc.end = locMax(pNode.loc.end, pParent.loc.end);

        pParent.children.push(pNode);
        pNode.parent = pParent;
    }

    private cloneNode(pNode: IParseNode): IParseNode {
        let pNewNode: IParseNode;
        pNewNode = <IParseNode>{
            name: pNode.name,
            value: pNode.value,
            children: null,
            parent: null
        };

        let pChildren: IParseNode[] = pNode.children;
        for (let i = 0; pChildren && i < pChildren.length; i++) {
            this.addLink(pNewNode, this.cloneNode(pChildren[i]));
        }

        return pNewNode;
    }

    private toStringNode(pNode: IParseNode, sPadding: string = ""): string {
        let sRes: string = sPadding + "{\n";
        let sOldPadding: string = sPadding;
        let sDefaultPadding: string = "  ";

        sPadding += sDefaultPadding;

        if (pNode.value) {
            sRes += sPadding + "name : \"" + pNode.name + "\"" + ",\n";
            sRes += sPadding + "value : \"" + pNode.value + "\"" + "\n";
        }
        else {
            sRes += sPadding + "name : \"" + pNode.name + "\"" + "\n";
            sRes += sPadding + "children : [";

            let pChildren: IParseNode[] = pNode.children;

            if (pChildren) {
                sRes += "\n";
                sPadding += sDefaultPadding;

                for (let i = pChildren.length - 1; i >= 0; i--) {
                    sRes += this.toStringNode(pChildren[i], sPadding);
                    sRes += ",\n";
                }

                sRes = sRes.slice(0, sRes.length - 2);
                sRes += "\n";
                sRes += sOldPadding + sDefaultPadding + "]\n";
            }
            else {
                sRes += " ]\n";
            }
        }
        sRes += sOldPadding + "}";
        return sRes;
    }

    toHTMLString(pNode: IParseNode, sPadding: string = "") {
        pNode = pNode || this.getRoot();
        let sRes = sPadding + "{\n";
        let sOldPadding = sPadding;
        let sDefaultPadding = "  ";
        sPadding += sDefaultPadding;
        if (pNode.value) {
            sRes += sPadding + "<b style=\"color: #458383;\">name</b>: \"" + pNode.name + "\"" + ",\n";
            sRes += sPadding + "<b style=\"color: #458383;\">value</b>: \"" + pNode.value + "\"" + ",\n";
            sRes += sPadding + "<b style=\"color: #458383;\">line</b>: \"" + pNode.loc.start.line + "\" - \""  + pNode.loc.end.line + "\"" + "\n";
            sRes += sPadding + "<b style=\"color: #458383;\">column</b>: \"" + pNode.loc.start.column + "\" - \""  + pNode.loc.end.column + "\"" + "\n";
            // sRes += sPadding + "<b style=\"color: #458383;\">position</b>: \"" + pNode.position + "\"" + "\n";
        }
        else {
            let i;
            sRes += sPadding + "<i style=\"color: #8A2BE2;\">name</i>: \"" + pNode.name + "\"" + "\n";
            sRes += sPadding + "<b style=\"color: #458383;\">line</b>: \"" + pNode.loc.start.line + "\" - \""  + pNode.loc.end.line + "\"" + "\n";
            sRes += sPadding + "<b style=\"color: #458383;\">column</b>: \"" + pNode.loc.start.column + "\" - \""  + pNode.loc.end.column + "\"" + "\n";
            // sRes += sPadding + "<b style=\"color: #458383;\">position</b>: \"" + pNode.position + "\"" + "\n";
            sRes += sPadding + "<i style=\"color: #8A2BE2;\">children</i>: [";
            if (pNode.children) {
                sRes += "\n";
                sPadding += sDefaultPadding;
                for (i = pNode.children.length - 1; i >= 0; i--) {
                    sRes += this.toHTMLString(pNode.children[i], sPadding);
                    sRes += ",\n";
                }
                sRes = sRes.slice(0, sRes.length - 2);
                sRes += "\n";
                sRes += sOldPadding + sDefaultPadding + "]\n";
            }
            else {
                sRes += " ]\n";
            }
        }
        sRes += sOldPadding + "}";
        return sRes;
    }
}
