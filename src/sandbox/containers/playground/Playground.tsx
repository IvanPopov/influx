/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { ETechniqueType, IScope } from '@lib/idl/IInstruction';
import { IPartFxInstruction } from '@lib/idl/IPartFx';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { Button, List, Message } from 'semantic-ui-react';
import Pipeline from './Pipeline';
import ThreeScene from './ThreeScene';


interface IPlaygroundProps {
    scope: IScope;
}


interface IPlaygroundState {
    active: string;
    list: IPartFxInstruction[];
    pipeline: ReturnType<typeof Pipeline>;
    scope: IScope;
    running: boolean;
}


class Playground extends React.Component<IPlaygroundProps, IPlaygroundState> {
    state: IPlaygroundState;

    constructor(props) {
        super(props);
        this.state = {
            active: null,
            pipeline: null,
            list: [],
            scope: null,
            running: false
        };
    }

    static getDerivedStateFromProps(props: IPlaygroundProps, state: IPlaygroundState) {
        if (props.scope !== state.scope) {
            console.log('playground has been updated (scope has beed changed).');

            const list: IPartFxInstruction[] = [];
            const { scope } = props;

            if (scope) {
                for (let name in scope.techniqueMap) {
                    let tech = scope.techniqueMap[name];
                    if (tech.type != ETechniqueType.k_PartFx) {
                        continue;
                    }
                    list.push(tech as IPartFxInstruction);
                }

                let active = null;
                let pipeline = state.pipeline;
                let running = false;

                if (state.active) {
                    if (list.map(fx => fx.name).indexOf(state.active) != -1) {
                        active = state.active;
                    }
                }

                if (!active) {
                    for (let fx of list) {
                        if (fx.isValid()) {
                            active = fx.name;
                            break;
                        }
                    }
                }

                if (pipeline) {
                    pipeline.stop();
                    pipeline = null;
                    console.log('pipeline has been dropped.');
                }

                if (active) {
                    const i = list.map(fx => fx.name).indexOf(active);
                    pipeline = Pipeline(list[i]);
                    console.log('pipeline has been created.');
                    running = !pipeline.isStopped();
                }

                return { list, active, scope, pipeline, running };
            }
        }

        return null;
    }

    @autobind
    handlePlayPauseClick() {
        let state = this.state;
        if (state.pipeline) {
            let running = !state.running;
            if (running != !state.pipeline.isStopped()) {
                running ? state.pipeline.play() : state.pipeline.stop();
                this.setState({ running });
            }
        }
    }

    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return this.state.scope !== nextProps.scope;
    }


    render() {
        console.log('Playground:render()');
        let { list, active, pipeline } = this.state;
        return (
            <div>
                { !list.length &&
                    <Message info textAlign='center'>
                        <Message.Content>
                            No effects found :/
                    </Message.Content>
                    </Message>
                }
                <List bulleted horizontal>
                    { list.map(fx => (
                        <List.Item disabled={ !fx.isValid() } as={ fx.name == active ? 'b' : 'a' }>
                            {/* <Icon name={'pulse' as any}/>&nbsp; */ }
                            {/* { fx.name == active && <Loader as="span" size='mini' active inline>{ fx.name }</Loader> } */ }
                            { fx.name }
                            {/* { fx.name == active && (" (active)") } */ }
                        </List.Item>
                    )) }
                </List>
                { pipeline &&
                    <div>
                        <Button.Group compact >
                            <Button icon='playback pause' color={ pipeline.isStopped() ? "black" : null } disabled={ pipeline.isStopped() } onClick={ this.handlePlayPauseClick } />
                            <Button icon='playback play' color={ !pipeline.isStopped() ? "black" : null } disabled={ !pipeline.isStopped() } onClick={ this.handlePlayPauseClick } />
                        </Button.Group>
                        <ThreeScene 
                            style={ { 
                                height: 'calc(100vh - 275px - 1em)', 
                                position: 'relative',
                                left: 0,
                                right: 0,
                                margin: '1em -20px -20px -20px'
                             } } 
                             emitter={ pipeline.emitter || null }
                        />
                    </div>
                }
            </div>
        );
    }
}

export default Playground;