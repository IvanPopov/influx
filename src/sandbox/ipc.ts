
import isElectronRuntime from 'is-electron';
    
export function isElectron () {
    return isElectronRuntime();
};

const ipcRenderer = isElectron() ? require('electron').ipcRenderer : null;

export const sync = {
    argv() {
        return ipcRenderer?.sendSync('argv', {});
    },    

    // returns saved file name
    saveFile(name: string, data: any): string {
        return ipcRenderer?.sendSync('process-save-file-silent', { name, data });
    },

    // save file using file dialog
    // returns saved file name
    saveFileDialog(name: string, data: any): string {
        return ipcRenderer?.sendSync('process-save-file-dialog', { name, data });
    },

    // readFile(name: string): string {

    // }
};


export const async = {
    notifyAppReady() {
        ipcRenderer?.send('app-ready', {});
    }
}
