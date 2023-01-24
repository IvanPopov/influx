import * as electron from "electron";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import * as S3D from "../lib/util/s3d/prjenv";

// skip 2 arguments if it's run unpacked like: ./electron ./shell.js [arguments]
// otherwise it's expected to run as: app.exe [arguments]
const argv = require('minimist')(process.argv.slice(process.argv[1] == './shell.js' ? 2 : 1));
const logo = require('./black-sun-logo');
const ipc = electron.ipcMain;
const app = electron.app;

app.setName("FX Sandbox");

function printHelp() {
    let m = [
      "OVERVIEW: <todo/>.",
      "",
      "SHORT DESCRIPTION: <todo/>.",
      "",
      "USAGE: fxMaster [options]",
      "",
      "OPTIONS:",
      "\t--dev-tools                        Show developer tools.",
      "\t--disable-wasm                     To run with turned off WASM support.",
      "\t--help                             Print this message.",
      ""
    ];

    console.log(m.join('\n'));
}

if (argv['help'] || argv['h']) {
    printHelp();
    process.exit(0);
}


function processCommandLineArguments() {
    const file = argv['_'][0];
    argv['runtime'] = 'sandbox';

    // run preview window insted of sandbox?
    if (file && path.extname(file) == '.bfx')
    {
        argv['runtime'] = 'preview';
        argv['file'] = file;
    }
}

processCommandLineArguments();

function createImageWindow() {
    let win = new electron.BrowserWindow({ show: false, width: 350, height: 350, frame: false });
    win.loadURL(logo);
    win.webContents.on('did-finish-load', function () { win.show(); });
    win.on('closed', () => { win = null; });
    return win;
}


function createSandboxWindow() {
    const devTools = !!argv['dev-tools'];

    let win = new electron.BrowserWindow({
        show: devTools, width: 800, height: 600, webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            contextIsolation: false,
            // webSecurity: false
        }
    });

    if (devTools)
        win.webContents.openDevTools();
    

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/sandbox-electron.html'),
        protocol: 'file:',
        slashes: true,
        // hack to pass global variable before page initialization
        search: `disable-wasm=${String(!!argv['disable-wasm'])}`
    }));

    //win.removeMenu();

    win.on('closed', () => { win = null; });
    return win;
}

function createPreviewWindow() {
    const devTools = !!argv['dev-tools'];

    let win = new electron.BrowserWindow({
        show: devTools, width: 512, height: 512, webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            contextIsolation: false,
            // webSecurity: false
        }
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/preview-electron.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (devTools)
        win.webContents.openDevTools();
    
    win.removeMenu();

    win.on('closed', () => { win = null; });
    return win;
}

function createPartViewWindow() {
    let win = new electron.BrowserWindow({
        show: true, width: 800, height: 600, webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            contextIsolation: false,
            // webSecurity: false
        }
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/part-view.html'),
        protocol: 'file:',
        slashes: true
    }));

    // win.webContents.openDevTools();
    win.setAlwaysOnTop(true, "normal");
 
    // win.removeMenu();

    win.on('closed', () => { win = null; });
    return win;
}

let logoWin: electron.BrowserWindow;
let sandboxWin: electron.BrowserWindow;
let previewWin: electron.BrowserWindow;
let partviewWin: electron.BrowserWindow;

app.on('ready', () => {
    switch (argv['runtime'])
    {
        case 'preview':
            logoWin = createImageWindow();    
            previewWin = createPreviewWindow();        
            break;
        default:
            logoWin = createImageWindow();
            sandboxWin = createSandboxWindow();
    }

    // sandboxWin.once('ready-to-show', onReady);
});

ipc.on('argv', (event, arg) => {
    const win = electron.BrowserWindow.getAllWindows().find((win) => win.webContents.id === event.sender.id);
    event.returnValue = argv;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (sandboxWin === null) {
        createSandboxWindow();
    }
});

function onReady()
{
    if (logoWin && !logoWin?.isDestroyed() && (logoWin?.isFocusable() as any))
        logoWin.close();

    if (sandboxWin && !sandboxWin?.isVisible()) {
        sandboxWin.maximize();
        sandboxWin.show();
    }
    if (previewWin && !previewWin?.isVisible())
        previewWin.show();
}

// custom 'ready' event is more precise than basic 'ready-to-show'
ipc.on('app-ready', onReady);

ipc.on('process-save-file-silent', (event, arg) => {
    console.log(`Request to silent save file for '${arg.name}...'`);
    const filename = arg.name;

    if (fs.existsSync(path.dirname(filename)))
    {
        fs.writeFileSync(filename, arg.data);
        console.log(`File '${filename} has been saved.'`);
    }

    event.returnValue = filename;
});

ipc.on('process-save-file-dialog', (event, arg) => {
    const options = arg.options;
    console.log(`Request to process save file dialog for '${options.defaultPath}...'`);
    
    const filename = electron.dialog.showSaveDialogSync(options) || null;
    if (filename)
    {
        fs.writeFileSync(filename, arg.data);
        console.log(`File '${filename} has been saved.'`);
    }

    event.returnValue = filename;
});

ipc.on('show-part-view-debug', (event, arg) => {
    if (!partviewWin || partviewWin.isDestroyed()) {
        partviewWin = createPartViewWindow();
    }
});
