import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import * as bf from '../../lib/bf/bf';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { setParserParams, setGrammar } from '../actions';
import { getParseMode, getParserType, getGrammar } from '../reducers';
import { IStoreState } from '../store/IStoreState';

import * as CodeMirror from 'react-codemirror';
import { Form, Segment, Grid } from 'semantic-ui-react'

const setFlags = (dest: number, src: number, value: boolean) => {
    return value ? bf.setFlags(dest, src) : bf.clearFlags(dest, src);
};

export interface IParserParametersProps {
    readonly mode: EParseMode;
    readonly type: EParserType;
    readonly grammar: string;
    // tslint:disable-next-line:prefer-method-signature
    setParserParams?: (type: EParserType, mode: EParseMode) => void;
    setGrammar: (content: string) => void;
}

export interface IParserParametersState {
    readonly mode: EParseMode;
    readonly type: EParserType;
    readonly grammar: string;
}

class ParserParameters extends React.Component<IParserParametersProps, IParserParametersState> {
    state: IParserParametersState;

    componentWillMount() {
        this.setState(this.props);
    }

    componentWillReceiveProps(nextProps: IParserParametersProps) {
        this.setState(nextProps);
    }

    render() {
        const { type, mode, grammar } = this.state;
        return (
            <Grid>
                <Grid.Row columns={ 1 }>
                    <Grid.Column>
                        <Segment>
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
                <Grid.Row columns={ 1 }>
                    <Grid.Column>
                        <CodeMirror
                            value={ grammar || '' }
                            onChange={ (grammar: string) => this.setState({ grammar }) }
                            options={ { lineNumbers: true, theme: 'eclipse' } } />
                    </Grid.Column>
                </Grid.Row>
            </Grid>

        );
    }

    @autobind
    private reinit() {
        const { type, mode, grammar } = this.state;
        this.props.setParserParams(type, mode);
        this.props.setGrammar(grammar);
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

function mapStateToProps(state: IStoreState) {
    return {
        mode: getParseMode(state),
        type: getParserType(state),
        grammar: getGrammar(state)
    };
}

export default connect<{}, {}, IParserParametersProps>(mapStateToProps, { setParserParams, setGrammar })(ParserParameters) as any;
