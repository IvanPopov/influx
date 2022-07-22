import React from 'react';
import ThreeScene from '@sandbox/containers/playground/ThreeScene';
import * as Timeline from '@lib/idl/emitter/timelime';
import * as Emitter from '@lib/fx/emitter';
import * as fs from 'fs';

const style: React.CSSProperties = {
    height: 'calc(100vh)',
    width: 'calc(100vw)',
    position: 'relative',
    left: '0',
    right: '0',
    margin: '0'
};

function Preview(props) {
    const name = props.name;
    const data = new Uint8Array(fs.readFileSync(name));
    const emitter = Emitter.create(data);
    const timeline = Timeline.make();
    timeline.start();
    return <ThreeScene style={ style } emitter={ emitter } timeline={ timeline } />
}

export default Preview;
