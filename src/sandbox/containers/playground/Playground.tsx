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
import * as flatbuffers from 'flatbuffers';



interface IPlaygroundProps extends IStoreState {
    actions: typeof playgroundActions;
}

function downloadByteBuffer(data: Uint8Array, fileName: string, mimeType: 'application/octet-stream') {
    downloadBlob(new Blob([data], { type: mimeType }), fileName);
};

function downloadBlob(blob: Blob, fileName: string) {
    let url;
    url = window.URL.createObjectURL(blob);
    downloadURL(url, fileName);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

function downloadURL(data: string, fileName: string) {
    let a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
};

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
            if (props.playground.timeline.isStopped()) {
                props.playground.timeline.start();
                this.forceUpdate();
            }
        }
    }

    @autobind
    handlePauseClick() {
        const props = this.props;
        if (props.playground.emitter) {
            if (!props.playground.timeline.isStopped()) {
                props.playground.timeline.stop();
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
    async handleDownloadDataClick() {
        const file = getFileState(this.props);
        const scope = getScope(file);
        const list = filterPartFx(scope);
        const playground = getPlaygroundState(this.props);
        const emitter = playground.emitter;

        const exportName = Path.parse(this.props.sourceFile.uri);
        exportName.ext = "bfx"; // binary fx

        // download packed version
        // -----------------------------------

        // todo: download collection!
        // let data = await FxBundle.createPartFxBundle(list.find((fx => fx.name == emitter.name)));
        // downloadByteBuffer(data, exportName.basename, 'application/octet-stream');

        // download unpacked version
        // -----------------------------------

        // const bundles = new BundleCollectionT(await Promise.all(list.map(async fx => await FxBundle.createPartFxBundle(fx))));
        // let fbb = new flatbuffers.Builder(1);
        // let size = bundles.pack(fbb);

        // downloadByteBuffer(fbb.asUint8Array(), exportName.basename, 'application/octet-stream');
        
        // -----------------------------------

        // hack to get global webgl/three.js canvas (from ThreeScene.ts)
        const canvas = document.getElementById('playground-main-canvas') as HTMLCanvasElement;
        exportName.ext = "jpeg";
        
        // const resizedCanvas = document.createElement("canvas") as HTMLCanvasElement;
        // const resizedContext = resizedCanvas.getContext("2d");
        
        // resizedCanvas.height = 512;
        // resizedCanvas.width = 512;
        
        // resizedContext.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
        // downloadURL(resizedCanvas.toDataURL('image/jpeg'), exportName.basename);
        downloadURL(canvas.toDataURL('image/jpeg'), exportName.basename);
    }

    pickEffect(active) {
        this.props.actions.selectEffect(active);
    }


    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return nextProps.playground.emitter !== this.props.playground.emitter ||
            (this.props.playground.emitter && this.$emitterName !== this.props.playground.emitter.getName());
    }

    componentDidUpdate() {
        if (this.props.playground.emitter) {
            this.$emitterName = this.props.playground.emitter.getName();
        } else {
            this.$emitterName = null;
        }
    }


    render() {
        // console.log('Playground:render()');
        const props = this.props;
        const emitter = props.playground.emitter;
        const timeline = props.playground.timeline;
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
                                            color={(timeline.isStopped() ? 'black' : null)}
                                            disabled={timeline.isStopped()}
                                            onClick={this.handlePauseClick}
                                        />
                                        <Button
                                            icon={<Icon className={'sync'} />}
                                            onClick={this.handleResetClick}
                                        />
                                        <Button
                                            icon={<Icon className={'playback play'} />}
                                            color={(!timeline.isStopped() ? 'black' : null)}
                                            disabled={!timeline.isStopped()}
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
                                            onClick={this.handleDownloadDataClick}
                                        />
                                    </Button.Group>
                                </Grid.Column>
                            </Grid>
                            <ThreeScene
                                style={threeStylesHotfix}
                                emitter={emitter}
                                timeline={timeline}
                            />
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getCommon), mapActions(playgroundActions))(Playground) as any;
