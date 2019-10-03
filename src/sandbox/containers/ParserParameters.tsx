import * as bf from '@lib/bf/bf';
import { EParseMode, EParserType } from '@lib/idl/parser/IParser';
import { mapActions, parser as parserActions } from '@sandbox/actions';
import { mapProps } from '@sandbox/reducers';
import { getParser } from '@sandbox/reducers/parserParams';
import { IParserParams } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';
import { connect } from 'react-redux';
import { Form, Grid, Segment } from 'semantic-ui-react';


const setFlags = (dest: number, src: number, value: boolean) => {
    return value ? bf.setFlags(dest, src) : bf.clearFlags(dest, src);
};

export interface IParserProps extends IParserParams {
    // warning, actions actually have void return type!
    actions: typeof parserActions;
}


class ParserParameters extends React.Component<IParserProps, IParserParams> {
    state: IParserParams;

    componentWillMount() {
        this.setState(this.props);
    }

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps);
    }

    render() {
        const { type, mode, grammar } = this.state;
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
                                                checked={ !!(mode & EParseMode.k_Add) }
                                                onChange={ this.handleChangeMode.bind(this, EParseMode.k_Add) }
                                                label='Only marked with `--AN` created'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(mode & EParseMode.k_Negate) }
                                                onChange={ this.handleChangeMode.bind(this, EParseMode.k_Negate) }
                                                label='Not marked with `--NN` created'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(mode & EParseMode.k_AllNode) }
                                                onChange={ this.handleChangeMode.bind(this, EParseMode.k_AllNode) }
                                                label='All created'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(mode & EParseMode.k_Optimize) }
                                                onChange={ this.handleChangeMode.bind(this, EParseMode.k_Optimize) }
                                                label='Created nodes if it has more than one child'
                                            />
                                            <Form.Checkbox
                                                checked={ !!(mode & EParseMode.k_DebugMode) }
                                                onChange={ this.handleChangeMode.bind(this, EParseMode.k_DebugMode) }
                                                label='Debug mode'
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
        const { type, mode, grammar } = this.state;
        this.props.actions.setParams(type, mode);
        this.props.actions.setGrammar(grammar);
    }

    @autobind
    private handleChangeMode(flag: EParseMode, event, { checked: value }): void {
        let { mode } = this.state;
        switch (flag) {
            case EParseMode.k_Add:
            case EParseMode.k_Negate:
                if (value) {
                    mode = bf.clearFlags(mode, EParseMode.k_AllNode);
                }
                break;
            case EParseMode.k_AllNode:
                if (value) {
                    mode = bf.clearFlags(mode, EParseMode.k_Negate | EParseMode.k_Add);
                }
                break;
            default:
        }

        mode = setFlags(mode, flag, value);
        this.setState({ mode });
    }
}

export default connect<{}, {}, IParserProps>(mapProps(getParser), mapActions(parserActions))(ParserParameters) as any;
