import { IMap } from '@lib/idl/IMap';
import * as ipc from '@sandbox/ipc';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader';

export interface IDeps {
    models: IMap<THREE.Mesh[]>;
    textures: IMap<THREE.Texture>;
}


function GetAssetsTexturesPath() {
    return "./assets/textures";
}

function GetAssetsModelsPath() {
    return "./assets/models";
}


function currentPath() {
    if (window.navigator.platform.includes('Mac')) {
        return window.location.pathname;
    }
    return window.location.pathname.substr(1);
}


export function GetAssetsTextures() {
    if (!ipc.isElectron()) {
        return [
            'saber-logo.png',
            'checker2x2.png'
        ];
    } else {
        const sandboxPath = path.dirname(currentPath());
        const texturePath = path.join(sandboxPath, GetAssetsTexturesPath());
        return fs.readdirSync(texturePath);
    }
}


export function GetAssetsModels() {
    if (!ipc.isElectron()) {
        return [
            'cube.obj',
            'probe.obj'
        ];
    } else {
        const sandboxPath = path.dirname(currentPath());
        const texturePath = path.join(sandboxPath, GetAssetsModelsPath());
        return fs.readdirSync(texturePath).filter(fname => path.extname(fname) === '.obj');
    }
}


function loadObjModel(name: string): Promise<THREE.Mesh[]> {
    const loader = new OBJLoader();
    return new Promise<THREE.Mesh[]>((resolve, reject) => {
        loader.load(
            `${GetAssetsModelsPath()}/${name}`,
            (group: THREE.Group) => {
                console.log(`model '${GetAssetsModelsPath()}/${name}.obj' is loaded.`);
                resolve(group.children as THREE.Mesh[]);
            },
            (xhr) => {
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.log('An error happened');
                reject();
            }
        );
    });
}

function loadTGATexture(name: string): Promise<THREE.DataTexture> {
    const loader = new TGALoader();
    return new Promise<THREE.DataTexture>((resolve, reject) => {
        loader.load(
            `${GetAssetsTexturesPath()}/${name}`,
            (texture: THREE.DataTexture) => {
                console.log(`texture '${GetAssetsTexturesPath()}/${name}' is loaded.`);
                resolve(texture);
            },
            (xhr) => {
                // console.log( `${GetAssetsTexturesPath()}/${name}` + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            (error) => {
                console.log('An error happened');
                reject();
            }
        );
    });
}

function loadTexture(name: string): Promise<THREE.Texture> {
    if (path.extname(name) === '.tga') return loadTGATexture(name);

    const loader = new THREE.TextureLoader();
    return new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
            `${GetAssetsTexturesPath()}/${name}`,
            (texture: THREE.Texture) => {
                // texture.encoding = THREE.sRGBEncoding;
                console.log(`texture '${GetAssetsTexturesPath()}/${name}' is loaded.`);
                resolve(texture);
            },
            (xhr) => {
                // console.log( `${GetAssetsTexturesPath()}/${name}` + ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            },
            (error) => {
                console.log('An error happened');
                reject();
            }
        );
    });
}



function resolveExternalDependencies(
    preloadTextures: boolean,
    preloadMeshes: boolean,
    deps: IDeps,
    onComplete?: (deps: IDeps) => void) {

    const geoms: Set<string> = new Set();
    const textures: Set<string> = new Set();

    if (preloadTextures) {
        // IP: quick solution - request all possible textures as sub resources
        // if resource requires at least one texture.
        GetAssetsTextures().forEach(fname => textures.add(fname));
    }

    if (preloadMeshes || true /* ?? */) {
        // IP: quick solution - request all possible textures as sub resources
        // if resource requires at least one texture.
        GetAssetsModels().forEach(fname => geoms.add(fname));
    }

    let depNum = 1;
    let tryFinish = () => {
        depNum--;
        if (depNum == 0) {
            onComplete?.(deps);
        }
    }

    for (let name of geoms.values()) {
        if (!deps.models[name]) {
            depNum++;
            loadObjModel(name).then(meshes => {
                deps.models[name] = meshes;
                tryFinish();
            });
        }
    }

    for (let name of textures.values()) {
        if (!deps.textures[name]) {
            depNum++;
            loadTexture(name).then(texture => {
                deps.textures[name] = texture;
                tryFinish();
            });
        }
    }

    tryFinish();
}


export class Deps implements IDeps {
    models = {};
    textures = {};

    resolve(preloadTextures: boolean, preloadMeshes: boolean, onComplete?: (deps: IDeps) => void) {
        resolveExternalDependencies(preloadTextures, preloadMeshes, this, onComplete);
    }
}

