const _bluebird = require('bluebird');
const path = require('path');
const cp = require('child_process');
const fs = require('fs');
const md5 = require("md5");
const unlink = (fileName) => {
	return new Promise((res, rej) => {
		fs.unlink(fileName, (err) => {
			res();
		});
	});
}

const writeFile = _bluebird.promisify(fs.writeFile);
const readFile = _bluebird.promisify(fs.readFile);
const execFile = _bluebird.promisify(cp.execFile);
const locateFile = (filename) => process.env.PATH.split(';').find(dir => fs.existsSync(path.join(dir, filename))); 

function basename(resource)
{
    return path.basename(resource);
}

function createBuildWasmName(resource, content, outputPath) {
	const fileName = path.basename(resource, path.extname(resource));
    return path.join(`${__dirname}`, `${fileName}-${md5(content)}.wasm`);
}

module.exports = async function (source) {
    const callback = this.async();
    const options = this.getOptions();
    const outputPath = this._compiler.outputPath.replace(/\\/g, "/");
    const wasmBuildName = createBuildWasmName(this.resourcePath, source, outputPath);

    const defaults = { sourceMaps: false, debug: false };
    const { sourceMaps, debug, additionalFlags, defines } = { ...defaults, ...options };
    
    const wasmFile = wasmBuildName;
    const wasmMapFile = wasmBuildName.replace('.wasm', '.wasm.map');
	const indexFile = wasmBuildName.replace('.wasm', '.js');
    
    if (!locateFile('em++.bat'))
    {
        console.error(`Emscriptent compiler is not found, cpp module '${this.resourcePath}' will be omitted.`);
        callback(null, "module.exports = () => Promise.resolve();");
        return null;
    }

    //  emcc -o example.js example.cpp -gsource-map -O0  -s MODULARIZE=1 -s ENVIRONMENT=web -s EXPORT_ES6=1 --bind -s WASM=1
    let wasmFlags = [
        ...additionalFlags,
        this.resourcePath, 
        sourceMaps ? "-gsource-map" : "", 
        debug ? "-O0" : "-O3", 
        "-std=c++17",
        "-s", "MODULARIZE=1", 
        "-s", "ENVIRONMENT=web", 
        "-s", "EXPORT_ES6=1", 
        "-s", "WASM=1", 
        "-s", "TOTAL_MEMORY=128MB", 
        "-s", "ALLOW_MEMORY_GROWTH=1",
        
        // "-fsanitize=undefined",
        // "-s", "SAFE_HEAP=1",
        // "-s", "ASSERTIONS=1",
        // "-s", "STACK_OVERFLOW_CHECK=1",
        
        "--bind", 
    ];

    console.log(wasmFlags.concat(['-o', indexFile]).join(' '));
    console.log('EMCC_CFLAGS:', Object.keys(defines).map(key => `-D ${key}=${defines[key]}`).join(' '));
    try{
        await execFile('em++.bat', wasmFlags.concat(['-o', indexFile]), 
        { cwd: this.context, env: { ...process.env, 
            EMCC_CFLAGS: Object.keys(defines).map(key => `-D ${key}=${defines[key]}`).join(' ') } 
        });
        const mapFileName = basename(wasmMapFile);
    
        if (sourceMaps) {
            const sourceCpp = path.relative(__dirname, this.resourcePath);
            this.emitFile(mapFileName.slice(3)/* FIXME: ../ */, await readFile(wasmMapFile));   
            this.emitFile(sourceCpp.slice(3)/* FIXME: ../ */, await readFile(this.resourcePath));
        }
        
        let pathToWasmRelativeToResource = path.relative(path.dirname(this.resourcePath), __dirname);
        pathToWasmRelativeToResource = `${__dirname}/${basename(wasmFile)}`.replace(/\\/g, "/");
    
        let indexFileContent = await readFile(indexFile);
        callback(null, indexFileContent.toString().replace(new RegExp(basename(wasmFile), "g"), pathToWasmRelativeToResource));
    
        // hack to prevent deletion before webpack core logic is execeuted
        // setTimeout(() => {
        //     unlink(wasmFile);
            // unlink(wasmMapFile);
            unlink(indexFile);
        // }, 1000);
    
    } catch (e) {
        callback(e);
    }

    return null;
}
 