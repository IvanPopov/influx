import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import * as bf from '../../lib/bf/bf';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { setParserParams } from '../actions';
import { getParseMode, getParserType } from '../reducers';
import { IStoreState } from '../store/IStoreState';

import { Form, Segment } from 'semantic-ui-react'

const setFlags = (dest: number, src: number, value: boolean) => {
    return value ? bf.setFlags(dest, src) : bf.clearFlags(dest, src);
};

export interface IParserParametersProps {
    readonly mode: EParseMode;
    readonly type: EParserType;
    // tslint:disable-next-line:prefer-method-signature
    setParserParams?: (type: EParserType, mode: EParseMode) => (dispatch: Dispatch<IStoreState>) => Promise<void>;
}

export interface IParserParametersState {
    readonly mode: EParseMode;
    readonly type: EParserType;
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
        const { type, mode } = this.state;
        return (
            <Segment>
                <Form>
                    <Form.Group>
                        <label>Parser type:</label>
                        <Form.Radio
                            label='LR0'
                            name='radioParserType'
                            value={ EParserType[EParserType.k_LR0] }
                            checked={ this.state.type === EParserType.k_LR0 }
                            onChange={ (e, { value }) => this.setState({ type: EParserType[value] }) }
                            // disabled
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
                    <label>Parser flags:</label>
                    <Form.Checkbox
                        toggle
                        checked={ !!(mode & EParseMode.k_Add) }
                        onChange={ this.handleChangeMode.bind(this, EParseMode.k_Add) }
                        label='Only marked with `--AN` created'
                    />
                    <Form.Checkbox
                        toggle
                        checked={ !!(mode & EParseMode.k_Negate) }
                        onChange={ this.handleChangeMode.bind(this, EParseMode.k_Negate) }
                        label='Not marked with `--NN` created'
                    />
                    <Form.Checkbox
                        toggle
                        checked={ !!(mode & EParseMode.k_AllNode) }
                        onChange={ this.handleChangeMode.bind(this, EParseMode.k_AllNode) }
                        label='All created'
                    />
                    <Form.Checkbox
                        toggle
                        checked={ !!(mode & EParseMode.k_Optimize) }
                        onChange={ this.handleChangeMode.bind(this, EParseMode.k_Optimize) }
                        label='Created nodes if it has more than one child'
                    />
                    <Form.Button onClick={ () => this.props.setParserParams(type, mode) }>
                        Reinit parser
                    </Form.Button>
                </Form>
            </Segment>
        );
    }

    @autobind
    private handleChangeMode(flag: EParseMode, event, value: boolean): void {
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
        type: getParserType(state)
    };
}

export default connect<{}, {}, IParserParametersProps>(mapStateToProps, { setParserParams })(ParserParameters) as any;
