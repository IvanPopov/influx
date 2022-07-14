import * as evt from '@sandbox/actions/ActionTypeKeys';
import { createLogic } from 'redux-logic';
import IStoreState from '@sandbox/store/IStoreState';
import { IS3DInitEnv } from '@sandbox/actions/ActionTypes';
import { isString } from '@lib/common';
import * as S3D from '@lib/util/s3d/prjenv';
import * as p4 from "@lib/util/p4/p4"


const initEnvLogic = createLogic<IStoreState, IS3DInitEnv['payload']>({
    type: evt.S3D_INIT_ENV,

    process({ getState, action }, dispatch, done) {
        const projectRoot = action.payload.projectRoot;

        if (isString(projectRoot)) {
            const prjenv = new S3D.ProjectEnv(projectRoot);

            // console.log(prjenv.Get('game-name'));
            // console.log(prjenv.Get('project-prebuild-dir'));
            // console.log(prjenv.Get('pic-dir'));
            // console.log(prjenv.Get('common-prebuild-dir'));
            // console.log(prjenv.Get('common-assets-dir'));
            // console.log(prjenv.Get('project-assets-dir'));

            // todo: use more strict check
            if (prjenv.Get('game-name')) {
                dispatch({ type: evt.S3D_INIT_ENV_SUCCESSED, payload: { env: prjenv } });
                dispatch({ type: evt.S3D_CONNECT_P4, payload: {} });
                return done();
            }
        }

        dispatch({ type: evt.S3D_INIT_ENV_FAILED, payload: {} })
        return done();
    }
});


const connectP4Logic = createLogic<IStoreState>({
    type: evt.S3D_CONNECT_P4,

    async process({ getState, action }, dispatch, done) {
        const connect = getState().s3d.env.Get('perforce-settings');
        try {
            await p4.run(`set P4PORT=${connect['server']}`)
            await p4.run(`set P4USER=${connect['login']}`);
            await p4.run(`set P4CLIENT=${connect['workspace']}`);

            const stdout = await p4.run('info');

            let info = {};

            stdout.split('\n').forEach((note: string) => {
                let v = note.split(':');
                let field = v[0];
                let value = v[1];

                info[field] = value;
            });

            dispatch({ type: evt.S3D_CONNECT_P4_SUCCESSED, payload: { info } });
            done();

        } finally {
            done();
        }
    }
});


export default [
    initEnvLogic,
    connectP4Logic
];
