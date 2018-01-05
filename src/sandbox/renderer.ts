import { EffectParser } from '../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType } from '../lib/idl/parser/IParser';
import { GRAMMAR_EXAMPLE, SOURCE_EXAMPLE } from './grammar.example';

let parser: EffectParser;
const id = <T extends HTMLElement>(i: string): T => <T>document.getElementById(i);

function init(): void {
    id('show_tree').onclick = (): void => {
        id('tab_tree').className = 'active';
        id('tab_syntax').className = '';
    };

    id('show_syntax').onclick = (): void => {
        id('tab_tree').className = '';
        id('tab_syntax').className = 'active';
    };
    id('show_settings').onclick = (): void => {
        id('tab_code').className = '';
        id('tab_settings').className = 'active';
    };
    id('show_code').onclick = (): void => {
        id('tab_code').className = 'active';
        id('tab_settings').className = '';
    };
    id('all_mode').onclick = (): void => {
        id<HTMLInputElement>('add_mode').checked = false;
        id<HTMLInputElement>('neg_mode').checked = false;
    };
    id('add_mode').onclick = (): void => {
        id<HTMLInputElement>('all_mode').checked = false;
    };
    id('neg_mode').onclick = (): void => {
        id<HTMLInputElement>('all_mode').checked = false;
    };

    id('tab_code').className = '';
    id('tab_settings').className = 'active';
    grammar.setValue(GRAMMAR_EXAMPLE);

    id('tab_code').className = 'active';
    id('tab_settings').className = '';
    editor.setValue(SOURCE_EXAMPLE);

    initParser();
    parse();
}

let isInitOk: boolean;
function initParser(): void {
    parser = new EffectParser();
    let time: number;
    const grammarValue: string = grammar.getValue();
    const parseType: EParserType = id<HTMLInputElement>('lr').checked ? EParserType.k_LR1 : EParserType.k_LALR;
    let parseMode: number = 0;

    parseMode |= id<HTMLInputElement>('add_mode').checked ? EParseMode.k_Add : 0;
    parseMode |= id<HTMLInputElement>('neg_mode').checked ? EParseMode.k_Negate : 0;
    parseMode |= id<HTMLInputElement>('all_mode').checked ? EParseMode.k_AllNode : 0;
    parseMode |= id<HTMLInputElement>('opt_mode').checked ? EParseMode.k_Optimize : 0;

    time = new Date().getTime();
    isInitOk = parser.init(grammarValue, parseMode, parseType);
    time = new Date().getTime() - time;
    if (isInitOk) {
        id('grammar_info').innerHTML = 'Time of last initialization: <span style="color: #0000ff; font-style: italic;">' +
            time + 'ms</span>';
    } else {
        id('grammar_info').innerHTML = '<span style="color: #ff0000;"> Error! Could not initialize grammar!</span>';
    }
}

declare const YAHOO: { widget: { TreeView: { new(id: string, prop: {}): { collapseAll(): void; expandAll(): void; render(): void; } } }; };
declare const CodeMirror: {
    fromTextArea(el: HTMLElement, prop: {}): {
        getValue(): string;
        setValue(val: string): void;
    };
};

const editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    lineNumbers: true,
    matchBrackets: true,
    mode: 'text/x-csrc'
});
const grammar = CodeMirror.fromTextArea(document.getElementById('grammar'), {
    lineNumbers: true,
    matchBrackets: true,
    mode: 'text/x-csrc'
});

function treeInit(): void {
    const tree = new YAHOO.widget.TreeView('treeview', [(<any>parser.getSyntaxTree()).toTreeView()]);
    id('collapse').onclick = () => {
        tree.collapseAll();
    };
    id('expand').onclick = (): void => {
        tree.expandAll();
    };
    tree.render();
}
function parse(): void {
    if (isInitOk) {
        const source: string = editor.getValue();
        let time: number;
        time = new Date().getTime();
        const isParseOk: EParserCode = parser.parse(source);
        time = new Date().getTime() - time;
        if (isParseOk === EParserCode.k_Ok) {
            id('code_info').innerHTML = 'Time of parse: <span style="color: #0000ff; font-style: italic;">' + time +
                'ms</span>';
            document.getElementById('syntaxtree').innerHTML = '<pre>' +
                (parser.getSyntaxTree().toHTMLString()) +
                '</pre>';
            treeInit();
        } else {
            throw null;
            // id('code_info').innerHTML = '<span style="color: #ff0000;"> Error! Syntax error!<br /> In line: ' +
            //     (isParseOk.line + 1) + '<br /> In column: ' + isParseOk.iStart +
            //     '<br /> Terminal: "' + isParseOk.sValue + '"</span>';
        }
    }
}

id('init').onclick = (): void => { initParser(); };
id('parse').onclick = (): void => { parse(); };

window.onload = (): void => { init(); };
