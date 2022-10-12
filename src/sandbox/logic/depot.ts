import * as evt from '@sandbox/actions/ActionTypeKeys';
import IStoreState, { IDepotFolder } from '@sandbox/store/IStoreState';
import { createLogic } from 'redux-logic';
import * as URI from '@lib/uri/uri';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_FILENAME } from './common';

const ASSETS_PATH = './assets/fx/tests';

function feedFakeDepot(root: IDepotFolder) {
    root.files = [
        '@new',
        'annotations.fx',
        'autotests.fx',
        'basic.fx',
        'call.fx',
        'CSShader.fx',
        'errorHandling.fx',
        'funcDecl.fx',
        'holographicTable.fx',
        'light.fx',
        'lwi.fx',
        'macro.fx',
        'messy.fx',
        'numeric.fx',
        'part.fx',
        'part.xfx',
        'speed.fx',
        'sphere.fx',
        'swizzling.fx',
        'tail.fx',
        'tree.fx'
    ].map(file => `${ASSETS_PATH}/${file}`).sort();
    root.path = 'tests';
    root.totalFiles = 23;
    
    const aux: IDepotFolder = {
        path: 'tests/auxiliary',
        files: [
            'noise.fx',
            'random.fx'
        ].map(file => `${ASSETS_PATH}/auxiliary/${file}`).sort(),
        totalFiles: 2
    };

    root.folders = [ aux ];
}



function scan(dir: string, node: IDepotFolder, filters?: string[]) {
    try {
        node.path = URI.fromLocalPath(dir);

        let stats = fs.statSync(dir);
        if (!stats.isDirectory()) {
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
                scan(filepath, subfolder, filters);

                node.folders.push(subfolder);
                node.totalFiles += subfolder.totalFiles;
            }
        });
    } catch (e) {
        console.log(e);
    }
}

const depotUpdateRequestLogic = createLogic<IStoreState>({
    type: evt.DEPOT_UPDATE_REQUEST,
    latest: true,

    async process({ getState, action }, dispatch, done) {
        let { s3d: { env } } = getState();
        let root: IDepotFolder = {
            path: null,
            files: [],
            folders: [],
            totalFiles: 0
        };

        if (!ipc.isElectron()) {
            feedFakeDepot(root);
        } else {
            const rootPath = !env 
                ? path.join(path.dirname(window.location.pathname.substr(1)), ASSETS_PATH) 
                : env.Get('influx-sfx-dir');
            await scan(rootPath, root, ['.fx', '.xfx', '.vsh', '.psh', '.csh', '.vs', '.ps']);

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
