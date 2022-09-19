import { Bundle, BundleT } from '../../lib/idl/bundles/FxBundle_generated';
import * as flatbuffers from 'flatbuffers';
import fs from 'fs';
import minimist from 'minimist';

const argv = minimist(process.argv);

function printHelp() {
    let m = [
      "OPTIONS:",
      "\t--info",
      ""
    ];

    console.log(m.join('\n'));
}

if (argv['help'] || argv['h']) {
    printHelp();
    process.exit(0);
}

function main() {
    const filename = argv['_'][2];
    // console.log(argv);
    const data = fs.readFileSync(filename);
    const fx = new BundleT();
    const buf = new flatbuffers.ByteBuffer(data);
    Bundle.getRootAsBundle(buf).unpackTo(fx);
    
    // if (argv['info']) 
    {
        console.log(`Fx: ${fx.name}\n`);
        console.log(JSON.stringify(fx.signature, null, '   '));
        console.log(`\n`);
        const deps = { templates: fx.content.renderPasses.map(pass => pass.geometry) };
        console.log(JSON.stringify(deps, null, '   '));   
    }
}

main();
process.exit(0);

