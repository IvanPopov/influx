import * as bf from '@lib/bf/bf';
import { EParserFlags, EParserType, EParsingFlags } from '@lib/idl/parser/IParser';
import { mapActions, parser as parserActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getParser } from '@sandbox/reducers/parserParams';
import { IParserState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';
import { Form, Grid, Segment } from 'semantic-ui-react';

const setFlags = (dest: number, src: number, value: boolean) => {
    return value ? bf.setFlags(dest, src) : bf.clearFlags(dest, src);
};

export interface IParserProps extends IParserState {
    // warning, actions actually have void return type!
    actions: typeof parserActions;
}


class ParserParameters extends React.Component<IParserProps, IParserState> {
    state: IParserState;

    componentWillMount() {
        this.setState(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps);
    }

    // tslint:disable-next-line:max-func-body-length
    render() {
        const { type, flags, grammar, parsingFlags } = this.state;
        return (
            <Grid>
                <Grid.Row columns={ 2 }>
                    <Grid.Column computer="10" tablet="8" mobile="6">
                        <MonacoEditor
                            language="powershell"
                            theme="vs"
                            value={ grammar || '' }
                            width="100%"
                            height="calc(100vh - 41px)" // todo: fixme
                            options={ {
                                selectOnLineNumbers: true,
                                fontSize: 12,
                                lineNumbers: "on",
                                lineHeight: 14,
                                automaticLayout: true
                            } }
                            onChange={ grammar => this.setState({ grammar }) }
                        />
                    </Grid.Column>
                    <Grid.Column computer="6" tablet="8" mobile="10">
                        {/* css fix for stupied setup in the App.tsx */ }
                        <Segment style={ { marginTop: '1em', marginRight: '2em' } }>
                            <Form>
                                <Grid columns='equal' divided padded>
                                    <Grid.Column>
                                        <Form.Group grouped>
                                            <label>Parser type:</label>
                                            <Form.Radio
                                                label='LR0'
                                                name='radioParserType'
                                                value={ EParserType[EParserType.k_LR0] }
                                                checked={ this.state.type === EParserType.k_LR0 }
                                                onChange={ (e, { value }) => this.setState({ type: EParserType[value] }) }
                                                disabled
                                            />
                                            <Form.Radio
                                                label='LR1'
                                                name='radioParserType'
                                                value={ EParserType[EParserType.k_LR1] }
                                                checked={ this.state.type === EParserType.k_LR1 }
                                                onChange={ (e, { value }) => this.setState({ type: EParserType[value] }) }
                                            />
                                            <Form.Radio
                                                label='LALR'
                                                name='radioParserType'
                                                value={ EParserType[EParserType.k_LALR] }
                                                checked={ this.state.type === EParserType.k_LALR }
                                                onChange={ (e, { value }) => this.setState({ type: EParserType[value] }) }
                                            />
                                        </Form.Group>
                                    </Grid.Column>
                                    <Grid.Column>
                                        <Form.Group grouped>
                                            <label>Parser flags:</label>
                                            <Form.Checkbox
                                                checked={ !!(flags & EParserFlags.k_Add) }
                                                onChange={ this.handleParserFlags.bind(this, EParserFlags.k_Add) }
                                                label='Only marked with `--AN` created'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(flags & EParserFlags.k_Negate) }
                                                onChange={ this.handleParserFlags.bind(this, EParserFlags.k_Negate) }
                                                label='Not marked with `--NN` created'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(flags & EParserFlags.k_AllNode) }
                                                onChange={ this.handleParserFlags.bind(this, EParserFlags.k_AllNode) }
                                                label='All created'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(flags & EParserFlags.k_Debug) }
                                                onChange={ this.handleParserFlags.bind(this, EParserFlags.k_Debug) }
                                                label='Debug mode'
                                            />
                                            <label>Parsing flags:</label>
                                            <Form.Checkbox
                                                checked={ !!(parsingFlags & EParsingFlags.k_Optimize) }
                                                onChange={ this.handleParsingFlags.bind(this, EParsingFlags.k_Optimize) }
                                                label='Created nodes if it has more than one child'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(parsingFlags & EParsingFlags.k_DeveloperMode) }
                                                onChange={ this.handleParsingFlags.bind(this, EParsingFlags.k_DeveloperMode) }
                                                label='Developer mode'
                                            />
                                        </Form.Group>
                                    </Grid.Column>
                                </Grid>
                                <Form.Button onClick={ this.reinit }>
                                    Reinit parser
                                </Form.Button>
                            </Form>
                        </Segment>
                    </Grid.Column>
                </Grid.Row>
            </Grid>

        );
    }

    @autobind
    private reinit() {
        const { type, flags, grammar, parsingFlags } = this.state;
        this.props.actions.setParams(type, flags);
        this.props.actions.setGrammar(grammar);
        this.props.actions.setParsingParams(parsingFlags);
    }

    @autobind
    private handleParserFlags(flag: EParserFlags, event, { checked: value }): void {
        let { flags } = this.state;
        switch (flag) {
            case EParserFlags.k_Add:
            case EParserFlags.k_Negate:
                if (value) {
                    flags = bf.clearFlags(flags, EParserFlags.k_AllNode);
                }
                break;
            case EParserFlags.k_AllNode:
                if (value) {
                    flags = bf.clearFlags(flags, EParserFlags.k_Negate | EParserFlags.k_Add);
                }
                break;
            default:
        }

        flags = setFlags(flags, flag, value);
        this.setState({ flags });
    }

    @autobind
    private handleParsingFlags(flag: EParsingFlags, event, { checked: value }): void {
        let { parsingFlags } = this.state;

        parsingFlags = setFlags(parsingFlags, flag, value);
        this.setState({ parsingFlags });
    }
}

export default connect<{}, {}, IParserProps>(mapProps(getParser), mapActions(parserActions))(ParserParameters) as any;
