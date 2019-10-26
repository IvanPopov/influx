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
import { CSSProperties } from 'jss/css';


interface IPlaygroundProps {
    scope: IScope;
}


interface IPlaygroundState {
    active: string;
    list: IPartFxInstruction[];
    pipeline: ReturnType<typeof Pipeline>;
    scope: IScope;
    // running: boolean;
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
            // running: false
        };
    }

    static getDerivedStateFromProps(props: IPlaygroundProps, state: IPlaygroundState) {
        if (props.scope !== state.scope) {
            console.log('playground has been updated (scope has beed changed).');

            const list: IPartFxInstruction[] = [];
            const { scope } = props;

            if (scope) {
                for (const name in scope.techniqueMap) {
                    const tech = scope.techniqueMap[name];
                    if (tech.type !== ETechniqueType.k_PartFx) {
                        continue;
                    }
                    list.push(tech as IPartFxInstruction);
                }

                let active = null;
                let pipelinePrev = state.pipeline;
                let pipelineNext = null;
                // let running = false;

                if (state.active) {
                    if (list.map(fx => fx.name).indexOf(state.active) !== -1) {
                        active = state.active;
                    }
                }

                if (!active) {
                    for (const fx of list) {
                        if (fx.isValid()) {
                            active = fx.name;
                            break;
                        }
                    }
                }

                if (active) {
                    const i = list.map(fx => fx.name).indexOf(active);

                    if (!pipelinePrev || !pipelinePrev.shadowReload(list[i])) {
                        pipelineNext = Pipeline(list[i]);
                        console.log('next pipeline has been created.');
                        // running = !pipelineNext.isStopped();
                    }
                }

                if (pipelineNext && pipelinePrev) {
                    pipelinePrev.stop();
                    pipelinePrev = null;
                    console.log('previous pipeline has been dropped.');
                }

                const pipeline = pipelineNext || pipelinePrev;
                return { list, active, scope, pipeline/*, running */ };
            }
        }

        return null;
    }

    @autobind
    handlePlayClick() {
        const state = this.state;
        if (state.pipeline) {
            // let running = !state.running;
            if (state.pipeline.isStopped()) {
                state.pipeline.play();
                this.forceUpdate();
            }
        }
    }

    @autobind
    handlePauseClick() {
        const state = this.state;
        if (state.pipeline) {
            // let running = !state.running;
            if (!state.pipeline.isStopped()) {
                state.pipeline.stop();
                this.forceUpdate();
            }
        }
    }

    pickEffect(active) {
        const scope = this.state.scope;
        const list: IPartFxInstruction[] = [];

        let pipelinePrev = this.state.pipeline;
        let pipelineNext = null;

        for (const name in scope.techniqueMap) {
            const tech = scope.techniqueMap[name];
            if (tech.type !== ETechniqueType.k_PartFx) {
                continue;
            }
            list.push(tech as IPartFxInstruction);
        }

        const i = list.map(fx => fx.name).indexOf(active);
        if (!pipelinePrev || !pipelinePrev.shadowReload(list[i])) {
            pipelineNext = Pipeline(list[i]);
            console.log('next pipeline has been created.');
        }


        if (pipelineNext && pipelinePrev) {
            pipelinePrev.stop();
            pipelinePrev = null;
            console.log('previous pipeline has been dropped.');
        }

        const pipeline = pipelineNext || pipelinePrev;
        this.setState({ active, pipeline });
    }

    shouldComponentUpdate(nextProps: IPlaygroundProps, nextState: IPlaygroundState) {
        return this.state.scope !== nextProps.scope || this.state.active !== nextState.active;
    }


    render() {
        console.log('Playground:render()');
        const { list, active, pipeline } = this.state;

        const threeStylesHotfix: React.CSSProperties = {
            height: 'calc(100vh - 275px - 1em)',
            position: 'relative',
            left: '0',
            right: '0',
            margin: '1em -20px -20px -20px'
        };

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
                        <List.Item disabled={ !fx.isValid() } as={ (fx.name === active ? 'b' : 'a') } onClick={ () => this.pickEffect(fx.name) }  >
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
                            <Button
                                icon='playback pause'
                                color={ (pipeline.isStopped() ? 'black' : null) }
                                disabled={ pipeline.isStopped() }
                                onClick={ this.handlePauseClick }
                            />
                            <Button
                                icon='playback play'
                                color={ (!pipeline.isStopped() ? 'black' : null) }
                                disabled={ !pipeline.isStopped() }
                                onClick={ this.handlePlayClick }
                            />
                        </Button.Group>
                        <ThreeScene
                            style={ threeStylesHotfix }
                            emitter={ pipeline.emitter }
                        />
                    </div>
                }
            </div>
        );
    }
}

export default Playground;
