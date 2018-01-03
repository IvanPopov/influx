import { EOperationType, EParseMode } from "../lib/idl/parser/IParser";
import { Parser } from "../lib/parser/Parser"

import { GRAMMAR_EXAMPLE, SOURCE_EXAMPLE } from "./grammar.example"

export class EffectParser extends Parser {
    constructor() {
        super();
        this.addAdditionalFunction("addType", this._addType.bind(this));
    }

    defaultInit(): void {
        super.defaultInit();
        this.addTypeId("float2");
        this.addTypeId("float3");
        this.addTypeId("float4");
        this.addTypeId("float2x2");
        this.addTypeId("float3x3");
        this.addTypeId("float4x4");
        this.addTypeId("int2");
        this.addTypeId("int3");
        this.addTypeId("int4");
        this.addTypeId("bool2");
        this.addTypeId("bool3");
        this.addTypeId("bool4");
    }

    _addType(): EOperationType {
        var pTree = this.getSyntaxTree();
        var pNode = pTree.getLastNode();
        var sTypeId;
        sTypeId = pNode.children[pNode.children.length - 2].value;
        this.addTypeId(sTypeId);
        return EOperationType.k_Ok;
    }
}

var parser;
const id = <T extends HTMLElement>(i): T => <T>document.getElementById(i);

function init() {
    id('show_tree').onclick = function () {
        id('tab_tree').className = 'active';
        id('tab_syntax').className = '';
    };

    id('show_syntax').onclick = function () {
        id('tab_tree').className = '';
        id('tab_syntax').className = 'active';
    };
    id('show_settings').onclick = function () {
        id('tab_code').className = '';
        id('tab_settings').className = 'active';
    };
    id('show_code').onclick = function () {
        id('tab_code').className = 'active';
        id('tab_settings').className = '';
    };
    id('all_mode').onclick = function () {
        id<HTMLInputElement>('add_mode').checked = false;
        id<HTMLInputElement>('neg_mode').checked = false;
    };
    id('add_mode').onclick = function () {
        id<HTMLInputElement>('all_mode').checked = false;
    };
    id('neg_mode').onclick = function () {
        id<HTMLInputElement>('all_mode').checked = false;
    };

    id('tab_code').className = '';
    id('tab_settings').className = 'active';
    (<any>window).grammar.setValue(GRAMMAR_EXAMPLE);

    id('tab_code').className = 'active';
    id('tab_settings').className = '';
    (<any>window).editor.setValue(SOURCE_EXAMPLE);

    initParser();
    parse();
}

var isInitOk;
function initParser() {
    parser = new EffectParser();
    var time;
    var grammar = (<any>window).grammar.getValue();
    var parseType = id<HTMLInputElement>('lr').checked ? 1/*akra.parser.EParserType.k_LR1*/ : 2/*akra.parser.EParserType.k_LALR*/;
    var parseMode = 0;

    parseMode |= id<HTMLInputElement>('add_mode').checked ? EParseMode.k_Add : 0;
    parseMode |= id<HTMLInputElement>('neg_mode').checked ? EParseMode.k_Negate : 0;
    parseMode |= id<HTMLInputElement>('all_mode').checked ? EParseMode.k_AllNode : 0;
    parseMode |= id<HTMLInputElement>('opt_mode').checked ? EParseMode.k_Optimize : 0;

    time = new Date().getTime();
    isInitOk = parser.init(grammar, parseMode, parseType);
    time = new Date().getTime() - time;
    if (isInitOk) {
        id('grammar_info').innerHTML = "Time of last initialization: <span style='color: #0000ff; font-style: italic;'>" +
            time + "ms</span>";
    }
    else {
        id('grammar_info').innerHTML = "<span style='color: #ff0000;'> Error! Could not initialize grammar!</span>";
    }
}

declare class YAHOO {};
declare const CodeMirror: any;

(<any>window).editor = (<any>CodeMirror).fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    matchBrackets: true,
    mode: "text/x-csrc"
});
(<any>window).grammar = (<any>CodeMirror).fromTextArea(document.getElementById("grammar"), {
    lineNumbers: true,
    matchBrackets: true,
    mode: "text/x-csrc"
});



function treeInit() {
    var tree = new (<any>YAHOO).widget.TreeView("treeview", [parser.getSyntaxTree().toTreeView()]);
    id('collapse').onclick = function () {
        tree.collapseAll();
    };
    id('expand').onclick = function () {
        tree.expandAll();
    };
    tree.render();
}
function parse() {
    if (isInitOk) {
        var source = (<any>window).editor.getValue();
        var time;
        time = new Date().getTime();
        var isParseOk = parser.parse(source);
        time = new Date().getTime() - time;
        if (isParseOk === 1/*akra.parser.EParserCode.k_Ok*/) {
            id('code_info').innerHTML = "Time of parse: <span style='color: #0000ff; font-style: italic;'>" + time +
                "ms</span>";
            document.getElementById("syntaxtree").innerHTML = "<pre>" +
                (parser.getSyntaxTree().toHTMLString()) +
                "</pre>";
            treeInit();
        }
        else {
            id('code_info').innerHTML = "<span style='color: #ff0000;'> Error! Syntax error!<br /> In line: " +
                (isParseOk.line + 1) + "<br /> In column: " + isParseOk.iStart +
                "<br /> Terminal: '" + isParseOk.sValue + "'</span>";
        }
    }
}

id('init').onclick = () => { initParser(); }
id('parse').onclick = () => { parse(); }

window.onload = () => { init(); };