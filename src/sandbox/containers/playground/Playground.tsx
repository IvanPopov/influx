/* tslint:disable:typedef */
/* tslint:disable:forin */
/* tslint:disable:no-for-in */
/* tslint:disable:newline-per-chained-call */


import { IPartFxInstruction } from '@lib/idl/part/IPartFx';
import * as Path from '@lib/path/path';
import { mapActions, playground as playgroundActions } from '@sandbox/actions';
import { getCommon, mapProps } from '@sandbox/reducers';
import { filterTechniques, getEmitterName } from '@sandbox/reducers/playground';
import { getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import * as ipc from '@sandbox/ipc';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Checkbox, Grid, Icon, List, Message, Popup, Table } from 'semantic-ui-react';
import FxScene from './FxScene';
import MaterialScene from './MaterialScene';
import { IEmitter } from '@lib/idl/emitter';
import { ETechniqueType } from '@lib/idl/IInstruction';
import { ITechnique } from '@lib/idl/ITechnique';


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

const isEmitter = tech => tech?.getType() === 'emitter';
const isMat = tech => tech?.getType() === 'material';


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
        if (props.playground.technique) {
            if (props.playground.timeline.isStopped()) {
                props.playground.timeline.start();
                this.forceUpdate();
            }
        }
    }

    @autobind
    handlePauseClick() {
        const props = this.props;
        if (props.playground.technique) {
            if (!props.playground.timeline.isStopped()) {
                props.playground.timeline.stop();
                this.forceUpdate();
            }
        }
    }


    @autobind
    handleResetClick() {
        const props = this.props;
        const tech = props.playground.technique;

        // todo: add reset support for materials
        if (isEmitter(tech)) {
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

    pickEffect(active) {
        this.props.actions.selectEffect(active);
    }


    shouldComponentUpdate(nextProps: IPlaygroundProps) {
        return nextProps.playground.exportName !== this.props.playground.exportName || 
            nextProps.playground.autosave !== this.props.playground.autosave || 
            nextProps.playground.technique !== this.props.playground.technique ||
            (this.props.playground.technique && this.$emitterName !== this.props.playground.technique.getName());
    }

    componentDidUpdate() {
        if (this.props.playground.technique) {
            this.$emitterName = this.props.playground.technique.getName();
        } else {
            this.$emitterName = null;
        }
    }


    render() {
        const props = this.props;
        const playground = props.playground;
        const technique = playground.technique;
        const timeline = playground.timeline;
        const controls = playground.controls;
        const scope = getScope(props.sourceFile);

        const list = filterTechniques(scope);
        const active = getEmitterName(playground);

        const renderAsEmitter = isEmitter(technique);
        const renderAsMaterial = isMat(technique);

        return (
            <div>
                {!list.length &&
                    <Message info style={textAlignCenter}>
                        <Message.Content>
                            No effects found :/
                        </Message.Content>
                    </Message>
                }
                {technique &&
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
                        </List>
                        <div>
                            <Grid verticalAlign="middle">
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
                                <Grid.Column width={10}>
                                    <Table unstackable basic='very'>
                                        <Table.Body>
                                            <Table.Row>
                                                <Table.Cell collapsing style={ { width: '100%', textAlign: 'right' } }>
                                                    <Popup
                                                        content={ playground.exportName || '[save file manually for the first time]' }
                                                        trigger={ 
                                                            <Checkbox 
                                                                style={ { marginRight: '-10px' } }
                                                                label={ `auto` }
                                                                checked={ playground.autosave } 
                                                                disabled={ !ipc.isElectron() || !playground.exportName } 
                                                                onClick={ this.handleAutosaveClick } 
                                                            /> 
                                                        } />
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Button.Group compact >
                                                        <Button
                                                            // save packed version only
                                                            onClick={this.handleDownloadDataClick.bind(this, true, false)}
                                                        >export</Button>
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
                            </Grid>

                            { renderAsEmitter &&                             
                                <FxScene
                                    style={threeStylesHotfix}
                                    emitter={technique as IEmitter}
                                    timeline={timeline}
                                    controls={controls}
                                /> 
                            }
                            
                            { renderAsMaterial &&  
                                <MaterialScene   
                                    style={threeStylesHotfix}
                                    timeline={timeline}
                                    controls={controls}
                                    material={technique as ITechnique}
                                />
                            }
                        </div>
                    </div>
                }
            </div>
        );
    }
}

export default connect<{}, {}, IPlaygroundProps>(mapProps(getCommon), mapActions(playgroundActions))(Playground) as any;
