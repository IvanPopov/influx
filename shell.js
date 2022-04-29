"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const url = require("url");
const { app } = require('electron');

let win;
function createWindow() {
    win = new electron_1.BrowserWindow({ width: 800, height: 600, webPreferences: { experimentalFeatures: true, nodeIntegration: true, contextIsolation: false } });
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'dist/electron/index-electron.html'),
        protocol: 'file:',
        slashes: true
    }));
    // win.removeMenu();
    
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
