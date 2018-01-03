import { IParseTree, IParseNode, IToken, ENodeCreateMode, IRule } from "../idl/parser/IParser";

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
		var pNode: IParseNode = {
			name: pToken.name,
			value: pToken.value,

			start: pToken.start,
			end: pToken.end,
			line: pToken.line,

			children: null,
			parent: null,
			isAnalyzed: false,
			position: this._pNodes.length
		};

		this.addNode(pNode);
	}

	addNode(pNode: IParseNode): void {
		this._pNodes.push(pNode);
		this._pNodesCountStack.push(1);
	}

	reduceByRule(pRule: IRule, eCreate: ENodeCreateMode = ENodeCreateMode.k_Default): void {
		var iReduceCount: number = 0;
		var pNodesCountStack: number[] = this._pNodesCountStack;
		var pNode: IParseNode;
		var iRuleLength: number = pRule.right.length;
		var pNodes: IParseNode[] = this._pNodes;
		var nOptimize: number = this._isOptimizeMode ? 1 : 0;

		while (iRuleLength) {
			iReduceCount += pNodesCountStack.pop();
			iRuleLength--;
		}

		if ((eCreate === ENodeCreateMode.k_Default && iReduceCount > nOptimize) || (eCreate === ENodeCreateMode.k_Necessary)) {
			pNode = <IParseNode>{
				name: pRule.left,
				children: null,
				parent: null,
				value: "",
				isAnalyzed: false,
				position: this._pNodes.length
			};

			while (iReduceCount) {
				this.addLink(pNode, pNodes.pop());
				iReduceCount -= 1;
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
		var pTree = new ParseTree();
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
		pParent.children.push(pNode);
		pNode.parent = pParent;
	}

	private cloneNode(pNode: IParseNode): IParseNode {
		var pNewNode: IParseNode;
		pNewNode = <IParseNode>{
			name: pNode.name,
			value: pNode.value,
			children: null,
			parent: null,
			isAnalyzed: pNode.isAnalyzed,
			position: pNode.position
		};

		var pChildren: IParseNode[] = pNode.children;
		for (var i = 0; pChildren && i < pChildren.length; i++) {
			this.addLink(pNewNode, this.cloneNode(pChildren[i]));
		}

		return pNewNode;
	}

	private toStringNode(pNode: IParseNode, sPadding: string = ""): string {
		var sRes: string = sPadding + "{\n";
		var sOldPadding: string = sPadding;
		var sDefaultPadding: string = "  ";

		sPadding += sDefaultPadding;

		if (pNode.value) {
			sRes += sPadding + "name : \"" + pNode.name + "\"" + ",\n";
			sRes += sPadding + "value : \"" + pNode.value + "\"" + "\n";
		}
		else {
			sRes += sPadding + "name : \"" + pNode.name + "\"" + "\n";
			sRes += sPadding + "children : [";

			var pChildren: IParseNode[] = pNode.children;

			if (pChildren) {
				sRes += "\n";
				sPadding += sDefaultPadding;

				for (var i = pChildren.length - 1; i >= 0; i--) {
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

	toHTMLString(pNode, sPadding) {
		pNode = pNode || this.getRoot();
		sPadding = sPadding || "";
		var sRes = sPadding + "{\n";
		var sOldPadding = sPadding;
		var sDefaultPadding = "  ";
		sPadding += sDefaultPadding;
		if (pNode.value) {
			sRes += sPadding + "<b style=\"color: #458383;\">name</b>: \"" + pNode.name + "\"" + ",\n";
			sRes += sPadding + "<b style=\"color: #458383;\">value</b>: \"" + pNode.value + "\"" + ",\n";
			sRes += sPadding + "<b style=\"color: #458383;\">line</b>: \"" + pNode.line + "\"" + ",\n";
			sRes += sPadding + "<b style=\"color: #458383;\">column</b>: \"" + pNode.start + "\"" + "\n";
		}
		else {
			var i;
			sRes += sPadding + "<i style=\"color: #8A2BE2;\">name</i>: \"" + pNode.name + "\"" + "\n";
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

	toTreeView(pNode: IParseNode): any { // TODO: fixme, use proper type
		pNode = pNode || this.getRoot();
		var pRes: any = {};
		if (pNode.value) {
			pRes.label = pNode.name + ": " + pNode.value;
		}
		else {
			pRes.label = pNode.name;
			if (pNode.children) {
				pRes.children = [];
				pRes.expanded = true;
				for (var i = pNode.children.length - 1; i >= 0; i--) {
					pRes.children.push(this.toTreeView(pNode.children[i]));
				}
			}
		}
		return pRes;
	}

}

