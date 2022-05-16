/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { mapActions, playground as playgroundActions } from '@sandbox/actions';
import { getCommon, mapProps } from '@sandbox/reducers';
import { filterPartFx, getEmitterName, getPlaygroundState } from '@sandbox/reducers/playground';
import { getScope } from '@sandbox/reducers/sourceFile';
import IStoreState, { IPlaygroundState } from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Icon, List, Message } from 'semantic-ui-react';
import ThreeScene from './ThreeScene';


interface IPlaygroundProps extends IStoreState {
    actions: typeof playgroundActions;
}



// TODO: remove it
const threeStylesHotfix: React.CSSProperties = {
    height: 'calc(100vh - 275px - 1em)',
    position: 'relative',
    left: '0',
    right: '0',
    margin: '1em -20px -20px -20px'
};


const textAlignCenter: React.CSSProperties = {
    textAlign: 'center'
};

class Playground extends React.Component<IPlaygroundProps> {
    $emitterName: string = null;

    constructor(props) {
        super(props);
    }

    // static getDerivedStateFromProps(props: IPlaygroundProps, state: IPlaygroundState) {
    //     return null;
    // }

    @autobind
    handlePlayClick() {
        const props = this.props;
        if (props.playground.emitter) {
            if (props.playground.emitter.isStopped()) {
                props.playground.emitter.start();
                this.forceUpdate();
            }
        }
    }

    @autobind
    handlePauseClick() {
        const props = this.props;
        if (props.playground.emitter) {
            if (!props.playground.emitter.isStopped()) {
                props.playground.emitter.stop();
                this.forceUpdate();
            }
        }
    }


    @autobind
    handleResetClick() {
        const props = this.props;
        if (props.playground.emitter) {
            props.playground.emitter.reset();
        }
    }


    pickEffect(active) {
        this.props.actions.selectEffect(active);
    }


    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return nextProps.playground.emitter !== this.props.playground.emitter ||
            (this.props.playground.emitter && this.$emitterName !== this.props.playground.emitter.name);
    }

    componentDidUpdate() {
        if (this.props.playground.emitter) {
            this.$emitterName = this.props.playground.emitter.name;
        } else {
            this.$emitterName = null;
        }
    }


    render() {
        // console.log('Playground:render()');
        const props = this.props;
        const emitter = props.playground.emitter;
        const scope = getScope(props.sourceFile);

        const list: IPartFxInstruction[] = filterPartFx(scope);
        const active = getEmitterName(props.playground);

        return (
            <div>
                { !list.length &&
                    <Message info style={ textAlignCenter }>
                        <Message.Content>
                            No effects found :/
                    </Message.Content>
                    </Message>
                }
                { emitter &&
                    <div>
                        <List bulleted horizontal>
                            { list.map(fx => (
                                <List.Item
                                    key={`li-${ fx.name }`}
                                    disabled={ !fx.isValid() }
                                    as={ (fx.name === active ? 'b' : 'a') }
                                    onClick={ () => this.pickEffect(fx.name) }
                                >
                                    { fx.name }
                                </List.Item>
                            )) }
                        </List>
                        <div>
                            <Button.Group compact >
                                <Button
                                    icon={ <Icon className={ 'playback pause' } /> }
                                    color={ (emitter.isStopped() ? 'black' : null) }
                                    disabled={ emitter.isStopped() }
                                    onClick={ this.handlePauseClick }
                                />
                                <Button
                                    icon={ <Icon className={ 'sync' } /> }
                                    onClick={ this.handleResetClick }
                                />
                                <Button
                                    icon={ <Icon className={ 'playback play' } /> }
                                    color={ (!emitter.isStopped() ? 'black' : null) }
                                    disabled={ !emitter.isStopped() }
                                    onClick={ this.handlePlayClick }
                                />
                            </Button.Group>
                            <ThreeScene
                                style={ threeStylesHotfix }
                                emitter={ emitter }
                            />
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getCommon), mapActions(playgroundActions))(Playground) as any;
