/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import { mapActions, playground as playgroundActions } from '@sandbox/actions';
import { getCommon, mapProps } from '@sandbox/reducers';
import { filterPartFx, getEmitterName, getPlaygroundState } from '@sandbox/reducers/playground';
import { getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Grid, Icon, List, Message } from 'semantic-ui-react';
import ThreeScene from './ThreeScene';
import * as FxBundle from '@lib/fx/bundles/Bundle';
import * as Path from '@lib/path/path';
import * as Uri from '@lib/uri/uri';



interface IPlaygroundProps extends IStoreState {
    actions: typeof playgroundActions;
}


function downloadObjectAsJson(jsonString: string, exportName: string) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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


    @autobind
    async handleDownloadClick() {
        const file = getFileState(this.props);
        const scope = getScope(file);
        const list = filterPartFx(scope);
        const bundles = await Promise.all(list.map(async fx => await FxBundle.createPartFxBundle(fx)));
        const exportName = Path.parse(this.props.sourceFile.uri).basename;
        downloadObjectAsJson(FxBundle.serializeBundlesToJSON(bundles), exportName);
        // const jsonBundle = JSON.stringify(list.map(async fx => await FxBundle.createPartFxBundle(fx)), null, '\t');
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
                {!list.length &&
                    <Message info style={textAlignCenter}>
                        <Message.Content>
                            No effects found :/
                        </Message.Content>
                    </Message>
                }
                {emitter &&
                    <div>
                        <List bulleted horizontal>
                            {list.map(fx => (
                                <List.Item
                                    key={`li-${fx.name}`}
                                    disabled={!fx.isValid()}
                                    as={(fx.name === active ? 'b' : 'a')}
                                    onClick={() => this.pickEffect(fx.name)}
                                >
                                    {fx.name}
                                </List.Item>
                            ))}
                        </List>
                        <div>
                            <Grid>
                                <Grid.Column width={6}>
                                    <Button.Group compact >
                                        <Button
                                            icon={<Icon className={'playback pause'} />}
                                            color={(emitter.isStopped() ? 'black' : null)}
                                            disabled={emitter.isStopped()}
                                            onClick={this.handlePauseClick}
                                        />
                                        <Button
                                            icon={<Icon className={'sync'} />}
                                            onClick={this.handleResetClick}
                                        />
                                        <Button
                                            icon={<Icon className={'playback play'} />}
                                            color={(!emitter.isStopped() ? 'black' : null)}
                                            disabled={!emitter.isStopped()}
                                            onClick={this.handlePlayClick}
                                        />
                                    </Button.Group>
                                </Grid.Column>
                                <Grid.Column width={7}>

                                </Grid.Column>
                                <Grid.Column width={3}>
                                    <Button.Group compact >
                                        <Button
                                            icon={<Icon className={'cloud download'} />}
                                            onClick={this.handleDownloadClick}
                                        />
                                    </Button.Group>
                                </Grid.Column>
                            </Grid>
                            <ThreeScene
                                style={threeStylesHotfix}
                                emitter={emitter}
                            />
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getCommon), mapActions(playgroundActions))(Playground) as any;
