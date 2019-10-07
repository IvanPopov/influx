import React = require("react");
import { Segment, Icon, Message, List, Loader, Button, Container } from "semantic-ui-react";
import { IScope, ETechniqueType, ICompileExprInstruction } from "@lib/idl/IInstruction";
import { IPartFxInstruction } from "@lib/idl/IPartFx";
import * as VM from "@lib/fx/bytecode/VM"
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import autobind from "autobind-decorator";


type PartFx = IPartFxInstruction;

interface IRunnable {
    run(): VM.INT32;
}

function prebuild(expr: ICompileExprInstruction): IRunnable {
    let code = Bytecode.translate(expr.function).code;
    let bundle = VM.load(code);
    return {
        run() {
            return VM.play(bundle);
        }
    }
}

class Emitter {
    nPartAddFloat: number;
    nPartAdd: number;

    constructor() {
        this.nPartAdd = 0;
        this.nPartAddFloat = 0;
    }

    spawn(nPart: number, elapsedTime: number) {
        this.nPartAddFloat += nPart * elapsedTime;
        this.nPartAdd = Math.floor(this.nPartAddFloat);
        this.nPartAddFloat -= this.nPartAdd;

        if (this.nPartAdd > 0) {
            console.log(`spawn ${this.nPartAdd} particles`);
        }
    }
}

function Pipeline(fx: PartFx) {

    let emitter: Emitter;

    let elapsedTime: number;
    let elapsedTimeLevel: number;

    let spawnRoutine: IRunnable;

    let $startTime: number;
    let $elapsedTimeLevel: number;
    let $interval = null;

    function load(fx: PartFx) {
        emitter = new Emitter;
        play();
    }

    function stop() {
        clearInterval($interval);
        $interval = null;
        console.log('pipeline stopped');
    }

    function play() {
        elapsedTime = 0;
        elapsedTimeLevel = 0;
        spawnRoutine = prebuild(fx.spawnRoutine);

        $startTime = Date.now();
        $elapsedTimeLevel = 0;
        $interval = setInterval(() => {

            const nPart = spawnRoutine.run();
            emitter.spawn(nPart, elapsedTime);

            let dt = Date.now() - $startTime;
            elapsedTime = (dt - $elapsedTimeLevel) / 1000.0;
            elapsedTimeLevel = $elapsedTimeLevel / 1000.0;
            $elapsedTimeLevel = dt;
        }, 33);
    }

    function isStopped() {
        return $interval === null;
    }


    load(fx);

    return { stop, play, isStopped, emitter };
}



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
        if (props.scope != state.scope) {
            console.log('playground has been updated.');

            let list: IPartFxInstruction[] = [];
            let { scope } = props;

            if (scope) {
                for (let name in scope.techniqueMap) {
                    let tech = scope.techniqueMap[name];
                    if (tech.type != ETechniqueType.k_PartFx)
                        continue;
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
                    let i = list.map(fx => fx.name).indexOf(active);
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

    render() {
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
                    </div>
                }
            </div>
        );
    }
}

export default Playground;