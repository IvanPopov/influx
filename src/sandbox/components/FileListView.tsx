/* tslint:disable:typedef */

import { isArray } from '@lib/common';
import { ASSETS_PATH } from '@sandbox/logic';
import * as fs1 from 'fs';
import * as isElectron from 'is-electron-renderer';
import * as path from 'path';
import * as React from 'react';
import { List } from 'semantic-ui-react';
import { promisify } from 'util';

interface IFileListViewProps {
    path: string;
    onFileClick: (file: string) => void;
    filters?: string[];
}

const FileDirectoryIcon: any = 'file directory';
const FileCodeIcon: any = 'file code';

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

async function scan($dir: string, node: IFolder, filters?: string[]) {
    if (!isElectron) {
        node.files = [
            'sphere.fx',
            'part.fx',
            'holographicTable.fx',
            'messy.fx',
            'speed.fx',
            'errorHandling.fx',
            'autotests.fx',
            'tail.fx',
            'tree.fx',
            'macro.fx'
        ].map(file => `${ASSETS_PATH}/${file}`).sort();
        node.path = 'tests';
        node.totalFiles = 5;
        return;
    }

    try {
        node.path = $dir;

        const dir = path.join(path.dirname(window.location.pathname.substr(1)), $dir);

        let stats = await fs.stat(dir);
        if (!stats.isDirectory()) {
            return;
        }

        (await fs.readdir(dir)).forEach(async filename => {
            let $filepath = path.join($dir, filename);
            let filepath = path.join(dir, filename);
            let filestats = await fs.stat(filepath);

            if (filestats.isFile()) {
                if (!filters || filters.indexOf(path.extname(filename)) != -1) {
                    node.files = node.files || [];
                    node.files.push($filepath);
                    node.totalFiles++;
                }
            }

            if (filestats.isDirectory()) {
                node.folders = node.folders || [];

                let subfolder = { path: $filepath, totalFiles: 0 };
                scan($filepath, subfolder, filters);

                node.folders.push(subfolder);
                node.totalFiles += subfolder.totalFiles;
            }
        });
    } catch (e) {
        console.log(e);
    }
}

class FileListView extends React.Component<IFileListViewProps, {}> {
    state: { root: IFolder };

    constructor(props: IFileListViewProps) {
        super(props);
        this.state = { root: { path: null, shown: true, totalFiles: 0 } };
    }

    UNSAFE_componentWillUpdate(nextProps: IFileListViewProps, nextState) {
        const { state } = this;

        if (state.root.path === nextProps.path) {
            return;
        }

        scan(nextProps.path, state.root, nextProps.filters);
    }


    renderFolder(folder: IFolder) {
        if (!folder || !folder.path || !folder.totalFiles) {
            return null;
        }

        return (
            <List.Item key={ folder.path }>
                <List.Icon name={ FileDirectoryIcon } />
                <List.Content>
                    <List.Header onClick={ () => { folder.shown = !folder.shown; this.forceUpdate(); } }>
                        { path.basename(folder.path) }
                    </List.Header>
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
        if (!file) {
            return null;
        }

        return (
            <List.Item onClick={ () => this.props.onFileClick(file) } key={ file }>
                <List.Icon name={ FileCodeIcon } />
                <List.Content>
                    <List.Header>{ path.basename(file) }</List.Header>
                </List.Content>
            </List.Item>
        );
    }

    render() {
        // temp check in order to be compatible with browsers;
        // if (!isElectron) {
        //     return null;
        // }

        const { root } = this.state;
        return (
            <List selection>
                { this.renderFolder(root) }
            </List>
        );
    }
}

export default FileListView;
