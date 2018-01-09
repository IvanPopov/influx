import autobind from 'autobind-decorator';
import {
    Button, FormControl, FormControlLabel, FormGroup, FormLabel,
    Paper, Radio, RadioGroup, StyledComponentProps, Switch, Typography, withStyles, WithStyles
} from 'material-ui';
import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import * as bf from '../../lib/bf/bf';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { setParserParams } from '../actions';
import { getParseMode, getParserType } from '../reducers';
import { IStoreState } from '../store/IStoreState';

const decorate = withStyles<'root'>(({ mixins }) => ({
    root: mixins.gutters({
        paddingTop: 16,
        paddingBottom: 16
    })
}));

const customStyles = {
    switch: {
        height: '32px'
    }
};

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

class ParserParameters extends React.Component<IParserParametersProps & WithStyles<'root'>, IParserParametersState> {
    state: IParserParametersState;

    componentWillMount() {
        this.setState(this.props);
    }

    componentWillReceiveProps(nextProps: IParserParametersProps) {
        this.setState(nextProps);
    }

    render() {
        const { classes } = this.props;
        const { type, mode } = this.state;
        return (
            <Paper classes={ classes } elevation={ 1 }>
                <FormControl component='fieldset' margin='dense'>
                    <FormLabel component='legend'>Parser type:</FormLabel>
                    <FormGroup>
                        <RadioGroup
                            aria-label='parser-type'
                            name='parser-type'
                            // className={ classes.group }
                            value={ EParserType[this.state.type] }
                            onChange={ (event, value: string) => this.setState({ type: EParserType[value] }) }
                            row
                        >
                            <FormControlLabel value={ EParserType[EParserType.k_LR0] } control={ <Radio /> } label='LR0' disabled />
                            <FormControlLabel value={ EParserType[EParserType.k_LR1] } control={ <Radio /> } label='LR1' />
                            <FormControlLabel value={ EParserType[EParserType.k_LALR] } control={ <Radio /> } label='LALR' />
                        </RadioGroup>
                    </FormGroup>
                    <FormLabel component='legend'>Parser flags:</FormLabel>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Switch style={ customStyles.switch }
                                    checked={ !!(mode & EParseMode.k_Add) }
                                    onChange={ this.handleChangeMode.bind(this, EParseMode.k_Add) }
                                />
                            }
                            label='Only marked with `--AN` created'
                        />
                        <FormControlLabel
                            control={
                                <Switch style={ customStyles.switch }
                                    checked={ !!(mode & EParseMode.k_Negate) }
                                    onChange={ this.handleChangeMode.bind(this, EParseMode.k_Negate) }
                                />
                            }
                            label='Not marked with `--NN` created'
                        />
                        <FormControlLabel
                            control={
                                <Switch style={ customStyles.switch }
                                    checked={ !!(mode & EParseMode.k_AllNode) }
                                    onChange={ this.handleChangeMode.bind(this, EParseMode.k_AllNode) }
                                />
                            }
                            label='All created'
                        />
                        <FormControlLabel
                            control={
                                <Switch style={ customStyles.switch }
                                    checked={ !!(mode & EParseMode.k_Optimize) }
                                    onChange={ this.handleChangeMode.bind(this, EParseMode.k_Optimize) }
                                />
                            }
                            label='Created nodes if it has more than one child'
                        />
                    </FormGroup>
                    <label htmlFor='raised-button-file'>
                        <Button raised component='span' onClick={ () => this.props.setParserParams(type, mode) }>
                            Reinit parser
                        </Button>
                    </label>
                </FormControl>
            </Paper>
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

export default decorate<{}>(
    connect<{}, {}, IParserParametersProps>(mapStateToProps, { setParserParams })(ParserParameters)
);
