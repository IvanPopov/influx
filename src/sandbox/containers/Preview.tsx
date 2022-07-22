import * as Emitter from '@lib/fx/emitter';
import * as Timeline from '@lib/idl/emitter/timelime';
import ThreeScene from '@sandbox/containers/playground/ThreeScene';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import React from 'react';

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

class Preview extends React.Component<IProps> {
    constructor(props) {
        super(props);
    }

    componentDidMount(): void {
        // custom request to hide prevew window and show main when it's completely ready
        ipc.async.notifyAppReady();
    }

    render() {
        const name = this.props.name;
        const data = new Uint8Array(fs.readFileSync(name));
        const emitter = Emitter.create(data);
        const timeline = Timeline.make();
        timeline.start();
        return <ThreeScene style={style} emitter={emitter} timeline={timeline} />
    }
}

export default Preview;
