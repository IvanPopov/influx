import * as evt from '@sandbox/actions/ActionTypeKeys';
import IStoreState, { IDepotFolder } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import * as URI from '@lib/uri/uri';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import * as path from 'path';
import { ASSETS_MANIFEST, ASSETS_PATH, DEFAULT_FILENAME, DEPOT_PATH, EXT_FILTER, LIB_PATH } from './common';
import { isString } from '@lib/common';

async function feedFakeDepot(root: IDepotFolder) {
    let demos = depotNode();
    demos.files = <string[]>Object.values(ASSETS_MANIFEST['fx']['demos'])
    .filter(file => isString(file))
    .map(file => `${DEPOT_PATH}${file}`) 
    .sort();
    demos.path = '/demos';
    demos.totalFiles = demos.files.length;

    let graph = depotNode();
    graph.files = <string[]>Object.values(ASSETS_MANIFEST['graph'])
    .filter(file => isString(file))
    .map(file => `${DEPOT_PATH}${file}`) 
    .sort();
    graph.path = '/graph';
    graph.totalFiles = graph.files.length;

    root.folders = [ demos, graph ];
    root.path = '/';
    root.totalFiles = demos.totalFiles + graph.totalFiles;
}



function scan(dir: string, node: IDepotFolder, filters?: string[], excludes?: string[]) {
    try {
        node.path = URI.fromLocalPath(dir);

        let stats = fs.statSync(dir);
        if (!stats.isDirectory()) {
            return;
        }
        if (excludes?.includes(path.basename(dir))) {
            return;
        }

        fs.readdirSync(dir).forEach(async filename => {
            let filepath = path.join(dir, filename);
            let filestats = fs.statSync(filepath);

            if (filestats.isFile()) {
                if (!filters || filters.indexOf(path.extname(filename)) != -1) {
                    node.files = node.files || [];
                    node.files.push(URI.fromLocalPath(filepath));
                    node.totalFiles++;
                }
            }

            if (filestats.isDirectory()) {
                node.folders = node.folders || [];

                let subfolder = { path: URI.fromLocalPath(filepath), totalFiles: 0 };
                scan(filepath, subfolder, filters, excludes);

                node.folders.push(subfolder);
                node.totalFiles += subfolder.totalFiles;
            }
        });
    } catch (e) {
        console.log(e);
    }
}

const depotNode = (): IDepotFolder => ({ path: null, files: [], folders: [], totalFiles: 0 });

function currentPath() {
    // mac locations looks like:
    //  '/influx/dist/electron/sandbox-electron.html'
    if (window.navigator.platform.includes('Mac')) {
        return window.location.pathname;
    }
    // windows locations looks like:
    //  '/C:/Influx/dist/electron/sandbox-electron.html'
    return window.location.pathname.substr(1);
}

const depotUpdateRequestLogic = createLogic<IStoreState>({
    type: evt.DEPOT_UPDATE_REQUEST,
    latest: true,

    async process({ getState, action }, dispatch, done) {
        const { s3d: { env } } = getState();
        const root = depotNode();
        const sandboxPath = path.dirname(currentPath());

        if (!ipc.isElectron()) {
            await feedFakeDepot(root);
        } else {
            if (env) {
                let sfxFolder = depotNode();
                await scan(env.Get('influx-sfx-dir'), sfxFolder, EXT_FILTER);

                let shaderFolder = depotNode();
                await scan(env.Get('sdrproj-dir'), shaderFolder, EXT_FILTER, ['maya_fx', 'deploy_test', 'nrd']);

                let libFolder = depotNode();
                let sandboxLibPath = path.join(sandboxPath, LIB_PATH); 
                await scan(sandboxLibPath, libFolder, EXT_FILTER);

                root.path = URI.fromLocalPath(path.dirname(env.Get('project-dir')));
                root.folders = [ sfxFolder, shaderFolder, libFolder ];
                root.totalFiles = sfxFolder.totalFiles + shaderFolder.totalFiles;
            } else {
                let rootPath = path.join(sandboxPath, `${ASSETS_PATH}/fx/demos`); 
                await scan(rootPath, root, EXT_FILTER);
            }

            root.files.push(URI.fromLocalPath(DEFAULT_FILENAME));
        }
        
        dispatch({ type: evt.DEPOT_UPDATE_COMPLETE, payload: { root } });
        done();
    }
});

const depotUpdateCompleteLogic = createLogic<IStoreState>({
    type: evt.DEPOT_UPDATE_COMPLETE,

    async process({ getState, action }, dispatch, done) {
        // ...
        done();
    }
});


export default [
    depotUpdateRequestLogic,
    depotUpdateCompleteLogic
];
