/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { IEmitter } from '@lib/idl/emitter';
import { IParticleDebugViewer } from '@lib/idl/emitter/IEmitter';
import { ETechniqueType } from '@lib/idl/IInstruction';
import { ITechnique11 } from '@lib/idl/ITechnique11';
import { ITechnique9 } from '@lib/idl/ITechnique9';
import * as Path from '@lib/path/path';
import { mapActions, playground as playgroundActions } from '@sandbox/actions';
import * as ipc from '@sandbox/ipc';
import { getCommon, mapProps } from '@sandbox/reducers';
import { filterTechniques, filterTechniques11, getEmitterName } from '@sandbox/reducers/playground';
import { getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Checkbox, Grid, Icon, List, Message, Popup, Table } from 'semantic-ui-react';
import PartView from '../PartView';
import FxScene from './FxScene';
import Technique9Scene from './Technique9Scene';
import Technique11Scene from './Technique11Scene';

const ipcRenderer = ipc.isElectron() ? require('electron').ipcRenderer : null;

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
    height: 'calc(100vh - 245px - 1em)',
    position: 'relative',
    left: '0',
    right: '0',
    margin: '1em -20px -20px -20px'
};



const textAlignCenter: React.CSSProperties = {
    textAlign: 'center'
};



class Playground extends React.Component<IPlaygroundProps> {
    techniqueName: string = null;
    // techniqueType: string = null;
    techniqueID: string = null;

    canvasRef: HTMLCanvasElement;
    canvasSnapshot: { w: number, h: number, content: string; }

    debugView: Window = null;
    debugViewChannel: BroadcastChannel = new BroadcastChannel(PartView.CHANNEL); // consumed by PartView.tsx
    debugViewer: IParticleDebugViewer = null;

    constructor(props) {
        super(props);

        this.canvasRef = null;

        this.debugViewChannel.onmessage = (event) => {
            switch (event.data) {
                case PartView.CONNECT_EVENT: this.onParticleDebugViewerConnected(); break;
                case PartView.DISCONNECT_EVENT: this.onParticleDebugViewerDisconnected(); break;
                case PartView.UPDATE_EVENT: this.onParticleDebugViewerUpdate(); break;
            }
        }
    }

    // static getDerivedStateFromProps(props: IPlaygroundProps, state: IPlaygroundState) {
    //     return null;
    // }

    @autobind
    handlePlayClick() {
        const props = this.props;
        if (props.playground.technique) {
            props.playground.timeline.unpause();
            this.forceUpdate();
        }
    }

    @autobind
    handlePauseClick() {
        const props = this.props;
        if (props.playground.technique) {
            props.playground.timeline.pause();
            this.forceUpdate();
        }
    }


    @autobind
    handleResetClick() {
        const props = this.props;
        const tech = props.playground.technique;

        if (props.playground.technique) {
            props.playground.timeline.stop();
            props.playground.timeline.start();
            this.forceUpdate();
        }

        // todo: add reset support for materials
        if (this.ranAsEmitter()) {
            (tech as IEmitter).reset();
        }
    }

    @autobind
    async handleAutosaveClick() {
        this.props.actions.setAutosave(!this.props.playground.autosave);
    }

    @autobind
    async handleDownloadDataClick(savePackedData: boolean = true, saveScreenshot: boolean = true) {
        if (savePackedData) {
            this.props.actions.saveFileAs();
        }

        if (saveScreenshot) {
            // hack to get global webgl/three.js canvas (from ThreeScene.ts)
            const canvas = document.getElementById('playground-main-canvas') as HTMLCanvasElement;
            const exportName = Path.parse(this.props.sourceFile.uri);
            exportName.ext = "jpeg";

            // const resizedCanvas = document.createElement("canvas") as HTMLCanvasElement;
            // const resizedContext = resizedCanvas.getContext("2d");

            // resizedCanvas.height = 512;
            // resizedCanvas.width = 512;

            // resizedContext.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
            // downloadURL(resizedCanvas.toDataURL('image/jpeg'), exportName.basename);
            downloadURL(canvas.toDataURL('image/jpeg'), exportName.basename);
        }
    }

    @autobind
    async handleParticleDebugView() {
        if (!ipc.isElectron()) {
            // todo: not tested!
            if (this.debugView && !this.debugView.closed) {
                this.debugView.focus();
                console.log('view already exist');
                return;
            }

            this.debugView = window.open('./part-view.html');
        } else {
            ipcRenderer?.send('show-part-view-debug');
        }

        this.dumpParticles();
    }

    @autobind
    onParticleDebugViewerUpdate() {
        this.dumpParticles();
    }

    @autobind
    onParticleDebugViewerConnected() {
        let emitter = this.props.playground.technique as IEmitter;
        this.debugViewer = emitter.createDebugViewer();

        this.dumpParticles();
    }

    onParticleDebugViewerDisconnected() {
        this.debugViewer = null;
    }

    dumpParticles() {
        if (this.debugViewer) {
            this.debugViewer.dump();
            this.debugViewChannel.postMessage(this.debugViewer.readParticlesJSON());
        }
    }

    pickEffect(active) {
        this.props.actions.selectEffect(active);
    }


    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return nextProps.playground.exportName !== this.props.playground.exportName ||
            nextProps.playground.autosave !== this.props.playground.autosave ||
            nextProps.playground.technique !== this.props.playground.technique ||
            (this.props.playground.technique && this.techniqueName !== this.props.playground.technique.getName());
    }


    UNSAFE_componentWillUpdate(nextProps: Readonly<IPlaygroundProps>, nextState: Readonly<{}>) {
        const nextTechnique = nextProps.playground.technique;
        const prevTechnique = this.props.playground.technique;
        const bEffectChanged = this.techniqueID !== nextProps.sourceFile.uri;
        if (bEffectChanged) {
            this.dropSnapshot();
            return;
        }
        // do snapshot if next effect is broken
        if (!nextTechnique && prevTechnique) {
            this.makeSnapshot();
        }
    }


    backupProps() {
        const technique = this.props.playground.technique;
        const sourceFile = this.props.sourceFile;
        if (technique) {
            this.techniqueName = technique.getName();
            // this.techniqueType = technique.getType();
        } else {
            this.techniqueName = null;
        }
        this.techniqueID = sourceFile.uri;
    }


    componentDidUpdate() {
        this.backupProps();
    }

    componentDidMount(): void {
        this.backupProps();
    }


    /** @deprecated */
    ranAsMaterial() {
        return this.props.playground.technique?.getType() === 'material';
    }


    ranAsEmitter() {
        return this.props.playground.technique?.getType() === 'emitter';
    }


    ranAsTechnique11() {
        return this.props.playground.technique?.getType() === 'technique11';
    }


    dropSnapshot() {
        this.canvasSnapshot = null;
        console.log(`Snapshot has been dropped.`);
    }


    makeSnapshot() {
        if (!this.canvasRef) {
            return;
        }

        const content = this.canvasRef.toDataURL('image/png', 1);
        const w = this.canvasRef.clientWidth;
        const h = this.canvasRef.clientHeight;
        this.canvasSnapshot = { w, h, content };

        console.log(`Snapshot has been made.`);
    }

    render() {
        const props = this.props;
        const playground = props.playground;
        const technique = playground.technique;
        const timeline = playground.timeline;
        const controls = playground.controls;
        const snapshot = this.canvasSnapshot;
        const scope = getScope(props.sourceFile);

        /** @deprecated */
        const list = filterTechniques(scope);
        const list11 = filterTechniques11(scope);
        const active = getEmitterName(playground);

        return (
            <div>
                {!list.length && !list11.length &&
                    <Message info style={textAlignCenter}>
                        <Message.Content>
                            No effects found :/
                        </Message.Content>
                    </Message>
                }
                {(technique || 1) &&
                    <div>
                        <List bulleted horizontal>
                            {list.map(fx => (
                                <List.Item
                                    key={`li-${fx.name}`}
                                    disabled={(fx.type === ETechniqueType.k_PartFx && !fx.isValid())}
                                    as={(fx.name === active ? 'b' : 'a')}
                                    onClick={() => this.pickEffect(fx.name)}
                                >
                                    {fx.name}
                                </List.Item>
                            ))}
                            {list11.map(fx => (
                                <Popup inverted
                                    content={
                                        <span>{fx.name}</span>
                                    }
                                    trigger={
                                        <List.Item
                                            key={`li-${fx.name}`}
                                            disabled={!fx.isValid()}
                                            as={(fx.name === active ? 'b' : 'a')}
                                            onClick={() => this.pickEffect(fx.name)}
                                        >
                                            {fx.name.substring(0, Math.min(fx.name.length, 10)) + (fx.name.length > 10 ? `..` : ``)}
                                        </List.Item>
                                    }
                                />
                            ))}
                        </List>
                        <div>
                            <Grid verticalAlign="middle">
                                <Grid.Row>
                                    <Grid.Column width={6}>
                                        <Button.Group compact >
                                            <Button
                                                icon={<Icon className={'playback pause'} />}
                                                color={(timeline.isPaused() ? 'black' : null)}
                                                disabled={timeline.isPaused()}
                                                onClick={this.handlePauseClick}
                                            />
                                            <Button
                                                icon={<Icon className={'sync'} />}
                                                onClick={this.handleResetClick}
                                            />
                                            <Button
                                                icon={<Icon className={'playback play'} />}
                                                color={(!timeline.isPaused() ? 'black' : null)}
                                                disabled={!timeline.isPaused()}
                                                onClick={this.handlePlayClick}
                                            />
                                        </Button.Group>
                                    </Grid.Column>
                                    <Grid.Column width={10}>
                                        <Table unstackable basic='very'>
                                            <Table.Body>
                                                <Table.Row>
                                                    <Table.Cell collapsing style={{ width: '100%', textAlign: 'right' }}>
                                                        <Popup
                                                            content={playground.exportName || '[save file manually for the first time]'}
                                                            trigger={
                                                                <Checkbox
                                                                    style={{ marginRight: '-10px' }}
                                                                    label={`auto`}
                                                                    checked={playground.autosave}
                                                                    disabled={!ipc.isElectron() || !playground.exportName}
                                                                    onClick={this.handleAutosaveClick}
                                                                />
                                                            } />
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Button.Group compact >
                                                            <Button
                                                                // save packed version only
                                                                onClick={this.handleDownloadDataClick.bind(this, true, false)}
                                                            >export</Button>
                                                            <Button animated='vertical' onClick={this.handleParticleDebugView}>
                                                                <Button.Content visible>debug</Button.Content>
                                                                <Button.Content hidden>view</Button.Content>
                                                            </Button>
                                                            <Button
                                                                // save screenshot only
                                                                onClick={this.handleDownloadDataClick.bind(this, false, true)}
                                                            >screenshot</Button>
                                                        </Button.Group>
                                                    </Table.Cell>
                                                </Table.Row>
                                            </Table.Body>
                                        </Table>
                                    </Grid.Column>
                                </Grid.Row>
                            </Grid>

                            {this.ranAsEmitter() &&
                                <FxScene
                                    style={threeStylesHotfix}
                                    emitter={technique as IEmitter}
                                    timeline={timeline}
                                    controls={controls}
                                    canvasRef={(canvas) => this.canvasRef = canvas}
                                />
                            }

                            {this.ranAsMaterial() &&
                                <Technique9Scene
                                    style={threeStylesHotfix}
                                    timeline={timeline}
                                    controls={controls}
                                    material={technique as ITechnique9}
                                    canvasRef={(canvas) => this.canvasRef = canvas}
                                />
                            }

                            {this.ranAsTechnique11() &&
                                <Technique11Scene
                                    style={threeStylesHotfix}
                                    timeline={timeline}
                                    controls={controls}
                                    technique={technique as ITechnique11}
                                    canvasRef={(canvas) => this.canvasRef = canvas}
                                />
                            }

                            {/* todo: move snapshot preview to threescene class */}
                            {!this.ranAsEmitter() && !this.ranAsMaterial() && snapshot &&
                                <div style={{
                                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.63), rgba(0, 0, 0, 0.623)), url(${snapshot.content})`,
                                    backgroundAttachment: 'fixed',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: 'cover',
                                    filter: 'saturate(0)',
                                    height: 'calc(100vh - 245px - 1em)',
                                    position: 'relative',
                                    left: '0',
                                    right: '0',
                                    margin: '1em -20px -20px -20px',
                                    width: 'calc(100% + 40px)',
                                }} />
                            }
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getCommon), mapActions(playgroundActions))(Playground) as any;
