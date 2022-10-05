import * as Emitter from '@lib/fx/emitter';
import * as Timeline from '@lib/fx/timelime';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import React from 'react';
import * as flatbuffers from 'flatbuffers';
import { Bundle, BundleMetaT } from '@lib/idl/bundles/FxBundle_generated';
import FxScene from '@sandbox/containers/playground/FxScene';

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
        const emitter = Emitter.create(data);
        const timeline = Timeline.make();
        timeline.start();
        console.log(`source: ${decodeBundleMeta(data).source}`);
        return <FxScene style={style} emitter={emitter} timeline={timeline} />
    }
}

export default Preview;
