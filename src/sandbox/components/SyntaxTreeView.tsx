import autobind from 'autobind-decorator';
import * as React from 'react';
import * as CodeMirror from 'react-codemirror';
import { connect } from 'react-redux';
import { EffectParser } from '../../lib/fx/EffectParser';
import { EParseMode, EParserCode, EParserType, IParseTree } from '../../lib/idl/parser/IParser';
import { getGrammarText, getParseMode, getParserType, getSourceCode } from '../reducers';
import { IParserParams, IStoreState } from '../store/IStoreState';
import { Modal, Button as Button2 } from 'semantic-ui-react'

function deepEqual(a: Object, b: Object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

// tslint:disable-next-line:no-import-side-effect
import 'codemirror/mode/javascript/javascript';


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

    render() {
        return (
            <div>
                <Modal
                    dimmer='blurring'
                    open={ this.state.parser.showErrors }
                    size='mini'
                >
                    <Modal.Header>{ 'Parser initialization error!' }</Modal.Header>
                    <Modal.Content>
                        <p>{ this.state.parser.error }</p>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button2 icon='check' content='All Done' onClick={ this.hideParserErrors } />
                    </Modal.Actions>
                </Modal>
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

        try {
            parser.setParseFileName(filename);
            const isParseOk: EParserCode = parser.parse(code);
            if (isParseOk === EParserCode.k_Ok) {
                this.setState({ parseTree: parser.getSyntaxTree() });
            } else {
                // TODO
            }
        } catch (e) {
            console.log(e ? e.logEntry : null);
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
