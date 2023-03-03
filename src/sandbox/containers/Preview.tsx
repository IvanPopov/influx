import * as Techniques from '@lib/fx/techniques';
import * as Timeline from '@lib/fx/timeline';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import React from 'react';
import FxScene from '@sandbox/containers/playground/FxScene';
import { IEmitter } from '@lib/idl/emitter';
import Technique9Scene from './playground/Technique9Scene';
import { ITechnique9 } from '@lib/idl/ITechnique9';
import { decodeBundleControls } from '@lib/fx/bundles/utils';

import * as flatbuffers from 'flatbuffers';
import { BundleMetaT } from '@lib/idl/bundles/auto/fx/bundle-meta';
import { Bundle } from '@lib/idl/bundles/auto/fx/bundle';


const style: React.CSSProperties = {
    height: 'calc(100vh)',
    width: 'calc(100vw)',
    position: 'relative',
    left: '0',
    right: '0',
    margin: '0'
};

interface IProps {
    name: string;
};

function decodeBundleMeta(data: Uint8Array): BundleMetaT {
    let meta = new BundleMetaT();
    let buf = new flatbuffers.ByteBuffer(data);
    Bundle.getRootAsBundle(buf).meta().unpackTo(meta);
    return meta;
}


class Preview extends React.Component<IProps> {
    constructor(props) {
        super(props);
    }

    componentDidMount(): void {
        // custom request to hide prevew window and show main when it's completely ready
        ipc.async.notifyAppReady();
    }

    render() {
        // TODO: add support of material's preview
        const name = this.props.name;
        const data = new Uint8Array(fs.readFileSync(name));
        const controls = decodeBundleControls(data);
        const tech = Techniques.createTechnique(data);
        const timeline = Timeline.make();
        timeline.start();
        console.log(`source: ${decodeBundleMeta(data).source}`);
        if (tech.getType() == 'emitter')
            return <FxScene style={style} emitter={tech as IEmitter} timeline={timeline} controls={controls} />
        else
            // todo: pass technique
            return <Technique9Scene style={style} material={tech as ITechnique9} timeline={timeline} controls={controls} />
    }
}

export default Preview;
