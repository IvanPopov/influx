const electron = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");
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
    let win = new electron.BrowserWindow({
        show: false, width: 800, height: 600, webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            contextIsolation: false,
            // webSecurity: false
        }
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/index-electron.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (argv['dev-tools'])
        win.webContents.openDevTools();
    
    //win.removeMenu();

    win.on('closed', () => { win = null; });
    return win;
}

function createPreviewWindow() {
    let win = new electron.BrowserWindow({
        show: true, width: 512, height: 512, webPreferences: {
            experimentalFeatures: true,
            nodeIntegration: true,
            contextIsolation: false,
            // webSecurity: false
        }
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/index-electron.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (argv['dev-tools'])
        win.webContents.openDevTools(), console.log('!!');
    
    win.removeMenu();

    win.on('closed', () => { win = null; });
    return win;
}

let logoWin;
let mainWin;

app.on('ready', () => {
    switch (argv['runtime'])
    {
        case 'preview':
            mainWin = createPreviewWindow();        
            break;
        default:
            mainWin = createSandboxWindow();
            logoWin = createImageWindow();
            mainWin.once('ready-to-show', onReady);
    }
});

ipc.on('argv', (event, arg) => {
    const win = electron.BrowserWindow.getAllWindows().find((win) => win.webContents.id === event.sender.id);
    event.returnValue = argv;
    console.log(win == mainWin);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWin === null) {
        createSandboxWindow();
    }
});

function onReady()
{
    if (!logoWin?.isDestroyed() && logoWin?.isFocusable())
        logoWin.close();
    if (!mainWin?.isVisible())
        mainWin.maximize() && mainWin.show();
}

// custom 'ready' event is more precise than basic 'ready-to-show'
// ipc.on('app-ready', onReady);

ipc.on('process-save-file-silent', (event, arg) => {
    console.log(`Request to silent save file for '${arg.name}...'`);
    const filename = arg.name;
    if (fs.existsSync(filename))
    {
        fs.writeFileSync(filename, arg.data);
        console.log(`File '${filename} has been saved.'`);
    }

    event.returnValue = filename;
});

ipc.on('process-save-file-dialog', (event, arg) => {
    console.log(`Request to process save file dialog for '${arg.name}...'`);
    let options = {
        title: "Save binary FX",
        defaultPath: arg.name,
        buttonLabel: "Save",
        filters: [
            { name: 'Binary FX', extensions: ['bfx'] },
        ]
    }
    const filename = electron.dialog.showSaveDialogSync(options) || null;
    if (filename)
    {
        fs.writeFileSync(filename, arg.data);
        console.log(`File '${filename} has been saved.'`);
    }

    event.returnValue = filename;
});
