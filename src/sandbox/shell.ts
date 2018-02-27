import { app, BrowserWindow } from 'electron';

import { ipcMain as AppDispatcher } from 'electron';
import * as path from 'path';
import * as url from 'url';

let win: Electron.BrowserWindow;


function createWindow(): void {
  win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL(url.format({
    pathname: path.join(__dirname, '../index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
  win.on('closed', () => { win = null; });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

AppDispatcher.on('app-rendered', (event, arg) => {
  event.sender.send('grammar-loaded');
  event.sender.send('source-loaded');
});
