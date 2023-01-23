import * as S3D from '@lib/util/s3d/prjenv';
import minimist from 'minimist';
import path from 'path';
import fs from 'fs';
import * as p4 from "@lib/util/p4/p4"


const argv = minimist(process.argv);


function printHelp() {
    let m = [
        "No options needed!",
        "Just specify path to project file."
    ];

    console.log(m.join('\n'));
}


if (argv['help'] || argv['h']) {
    printHelp();
    process.exit(0);
}

async function initP4(env: S3D.ProjectEnv) {
    const connect = env.Get('perforce-settings');
    try {
        await p4.run(`set P4PORT=${connect['server']}`)
        await p4.run(`set P4USER=${connect['login']}`);
        await p4.run(`set P4CLIENT=${connect['workspace']}`);
        console.log(await p4.run('info'));
        return true;
    } 
    finally {};
    return false;
}

function rewriteFile(src: string ,dst: string) {
    console.log(`[ OVERWRITE ] ${src} => ${dst}`);
    fs.copyFileSync(src, dst);
}

function copyFile(src: string, dst :string) {
    console.log(`[   COPY    ] ${src} => ${dst}`);
    fs.copyFileSync(src, dst);
}

async function main() {
    const filename = argv['_'][2];
    const prjenv = new S3D.ProjectEnv(filename);

    if (!await initP4(prjenv)) {
        console.error(`[ ERROR ] Could not connect to perforce.`);
    }

    // C:\Husky\streams2\common\code\gs\interactive_fx\ifx
    const dstPath = path.join(prjenv.Get(`common-code-dir`), `gs`, `interactive_fx`, `ifx`);
    // C:\Husky\streams2\tools\code\Influx\src
    const srcPath = path.join(prjenv.Get(`tools-code-dir`), `Influx`, `src`, `lib`);

    const tasks = {
        autogen: {
            path: '\\idl\\bundles\\',
            files: ['FxBundle_generated.h']
        },
        operations: {
            path: '\\idl\\bytecode\\',
            files: ['EOperations.ts']
        },
        vm: {
            path: '\\fx\\bytecode\\VM\\cpp\\',
            files: [
                'bundle.cpp',
                'bundle.h',
                'bundle_uav.cpp',
                'bundle_uav.h',
                'memory_view.h'
            ]
        },
        techniques: {
            path: '\\fx\\techniques\\cpp\\',
            files: [
                'bytecode_bundle.cpp',
                'bytecode_bundle.h',
                'emitter.cpp',
                'emitter.h',
                'uniforms.cpp',
                'uniforms.h'
            ]
        }
    }

    for (let taskName in tasks) {
        const task = tasks[taskName];
        for (let fname of task.files) {
            const src = path.join(srcPath, task.path, fname);
            const dst = path.join(dstPath, task.path, fname);

            fs.mkdirSync(path.dirname(dst), { recursive: true });

            if (fs.existsSync(dst)) {
                p4.edit(0, dst, () => rewriteFile(src, dst));
            } else {
                copyFile(src, dst);
                p4.add(0, dst, () => {});
            }
        }
    }
}


await main();

