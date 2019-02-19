"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const url = require("url");
const { app } = require ('electron');
// const userDataPath = app.getPath ('userData');
// console.log(path.resolve(path.join(__dirname, "dist/electron/")));
// app.setPath ('userData', path.resolve(path.join(__dirname, "dist/electron/")));
let win;
function createWindow() {
    win = new electron_1.BrowserWindow({ width: 800, height: 600, webPreferences: { experimentalFeatures: true } });
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/index-electron.html'),
        protocol: 'file:',
        slashes: true
    }));
    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
    win.on('closed', () => { win = null; });
}
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
electron_1.ipcMain.on('app-rendered', (event, arg) => {
    event.sender.send('grammar-loaded');
    event.sender.send('source-loaded');
});
//# sourceMappingURL=shell.js.map