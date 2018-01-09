import autobind from 'autobind-decorator';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, withStyles } from 'material-ui';
import * as React from 'react';
import * as CodeMirror from 'react-codemirror';
import { connect } from 'react-redux';
import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree } from '../../lib/idl/parser/IParser';
import { getGrammarText, getParseMode, getParserType, getSourceCode } from '../reducers';
import { IParserParams, IStoreState } from '../store/IStoreState';

function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

// tslint:disable-next-line:no-import-side-effect
import 'codemirror/mode/javascript/javascript';

// const decorate = withStyles<'root'>(theme => ({
//     root: null
// }));

export interface ISyntaxTreeViewProps {
    readonly parser: {
        readonly type: EParserType;
        readonly mode: EParseMode;
        readonly grammarText: string;
    };

    readonly source: {
        code: string;
        filename: string;
    }
}

class SyntaxTreeView extends React.Component<ISyntaxTreeViewProps, {}> {
    state: {
        parser: {
            error?: string;
            showErrors: boolean;
            parser: EffectParser;
        },
        parseTree: IParseTree;
    };

    constructor(props) {
        super(props);
        this.state = { parser: { showErrors: false, parser: null }, parseTree: null };
    }

    componentWillReceiveProps(nextProps: ISyntaxTreeViewProps): void {
        let parserParamsChanged: boolean = !deepEqual(this.props.parser, nextProps.parser);
        if (parserParamsChanged) {
            this.initParser(nextProps);
        }
        if (nextProps.source.code !== this.props.source.code || parserParamsChanged) {
            this.parse(nextProps);
        }
    }

    componentWillMount(): void {
        this.initParser(this.props);
        this.parse(this.props);
    }

    render(): React.ReactNode {
        return (
            <div>
                <Dialog
                    open={ this.state.parser.showErrors }
                    aria-labelledby='alert-dialog-title'
                    aria-describedby='alert-dialog-description'
                >
                    <DialogTitle id='alert-dialog-title'>{ 'Parser initialization error!' }</DialogTitle>
                    <DialogContent>
                        <DialogContentText id='alert-dialog-description'>
                            { this.state.parser.error }
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={ this.hideParserErrors } color='primary' autoFocus>
                            Ok
                        </Button>
                    </DialogActions>
                </Dialog>
                {/* <CodeMirror value={ this.parseTreeAsString() }
                    options={ { mode: 'json', lineNumbers: true, theme: 'eclipse' } } /> */}
                { /* tslint:disable-next-line:react-no-dangerous-html */ }
                <div dangerouslySetInnerHTML={ { __html: `<pre>${this.parseTreeAsString()}</pre>` } } ></div>
            </div>
        );
    }

    private initParser(props: ISyntaxTreeViewProps): void {
        const { grammarText, mode, type } = props.parser;
        if (!grammarText) { return; }
        console.log(mode, EParserType[type]);

        const parser = new EffectParser();

        if (!parser.init(grammarText, mode, type)) {
            this.setState({
                parser: {
                    showErrors: true,
                    error: 'Error! Could not initialize grammar!'
                }
            });
        } else {
            this.setState({ parser: { isInited: true, showErrors: false, parser: parser } });
        }
    }

    private parse(props: ISyntaxTreeViewProps): void {
        const { code, filename } = props.source;
        const { parser } = this.state.parser;

        if (!code || !parser) { return; }

        // let time: number;
        // time = new Date().getTime();
        // time = new Date().getTime() - tim/e;

        try {
            parser.setParseFileName(filename);
            const isParseOk: EParserCode = parser.parse(code);
            if (isParseOk === EParserCode.k_Ok) {
                this.setState({ parseTree: parser.getSyntaxTree() });
            } else {
                // TODO
            }
        } catch (e) {
            console.log(e? e.logEntry: null);
        }
    }

    private parseTreeAsString(): string {
        const { parseTree } = this.state;
        if (!parseTree) { return ''; }

        return parseTree.toHTMLString();
    }

    @autobind
    private hideParserErrors(): void {
        this.setState({ parser: { showErrors: false } });
    }
}

export default SyntaxTreeView;
