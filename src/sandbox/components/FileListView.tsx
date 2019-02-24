import { isArray } from '@lib/common';
import * as fs1 from 'fs';
import * as path from 'path';
import * as React from 'react';
import { List } from 'semantic-ui-react';
import { promisify } from 'util';
import * as isElectron from 'is-electron-renderer';

interface IFileListViewProps {
    path: string;
    onFileClick: (file: string) => void;
    filters?: string[];
}

let FileDirectoryIcon: any = 'file directory';
let FileCodeIcon: any = 'file code';

interface IFolder {
    path: string;
    folders?: IFolder[];
    files?: string[];
    shown?: boolean;
    totalFiles: number;
}


const fs = {
    stat: isElectron ? 
        promisify(fs1.lstat) : 
        (dir) => ({ 
            isDirectory() { return false }, 
            isFile() { return false }
        }),
    readdir: isElectron ? 
        promisify(fs1.readdir) : null
}


// todo: remove "sync" calls

async function scan(dir: string, node: IFolder, filters?: string[]) {
    try {
        node.path = dir;

        let stats = await fs.stat(dir);
        if (!stats.isDirectory()) {
            return;
        }

        (await fs.readdir(dir)).forEach(async filename => {
            let filepath = path.join(dir, filename);
            let filestats = await fs.stat(filepath);
            
            if (filestats.isFile()) {
                if (!filters || filters.indexOf(path.extname(filename)) != -1) {
                    node.files = node.files || [];
                    node.files.push(filepath);
                    node.totalFiles ++;
                }
            }

            if (filestats.isDirectory()) {
                node.folders = node.folders || [];

                let subfolder = { path: filepath, totalFiles: 0 };
                scan(filepath, subfolder, filters);

                node.folders.push(subfolder);
                node.totalFiles += subfolder.totalFiles;
            }
        });
    } catch (e) {
        console.log(e);
    }
}

class FileListView extends React.Component<IFileListViewProps, {}> {
    state: { root: IFolder; };

    constructor(props: IFileListViewProps) {
        super(props);
        this.state = { root: { path: null, shown: true, totalFiles: 0 } };
    }

    componentWillUpdate(nextProps: IFileListViewProps, nextState) {
        const { state } = this;

        if (state.root.path == nextProps.path) {
            return;
        }

        scan(nextProps.path, state.root, nextProps.filters);
    }


    renderFolder(folder: IFolder) {
        if (!folder || !folder.path || !folder.totalFiles) return null;

        return (
            <List.Item key={folder.path}>
                <List.Icon name={ FileDirectoryIcon } />
                <List.Content>
                    <List.Header onClick={ () => { folder.shown = !folder.shown; this.forceUpdate(); } }>{ path.basename(folder.path) }</List.Header>
                    { folder.shown && (isArray(folder.folders) || isArray(folder.files)) &&
                        <List.List>
                            { (folder.folders || []).map(folder => this.renderFolder(folder)) }
                            { (folder.files || []).map(file => this.renderFile(file)) }
                        </List.List>
                    }
                </List.Content>
            </List.Item>
        );
    }

    renderFile(file: string) {
        if (!file) return null;

        return (
            <List.Item onClick={ () => this.props.onFileClick(file) } key={file}>
                <List.Icon name={ FileCodeIcon } />
                <List.Content>
                    <List.Header>{ path.basename(file) }</List.Header>
                </List.Content>
            </List.Item>
        );
    }

    render() {
        // temp check in order to be compatible with browsers;
        if (!isElectron) {
            return null;
        }

        const { root } = this.state;
        return (
            <List selection>
                { this.renderFolder(root) }
            </List>
        );
    }
}

export default FileListView;