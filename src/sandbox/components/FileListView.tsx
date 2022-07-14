/* tslint:disable:typedef */

import { isArray } from '@lib/common';
import { ASSETS_PATH } from '@sandbox/logic';
import * as fs1 from 'fs';
import isElectron from 'is-electron';
import * as path from 'path';
import * as React from 'react';
import { Header, Icon, List, Message } from 'semantic-ui-react';
// import { promisify } from 'util';

interface IFileListViewProps {
    path: string;
    onFileClick: (file: string) => void;
    filters?: string[];
    expanded?: boolean;
    desc?: string;
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

const FS_NO_STATS = {
    isDirectory() { return false },
    isFile() { return false }
};

const fs = isElectron() 
    ? fs1
    : { statSync: (dir) => FS_NO_STATS, readdirSync: null };


function scan($dir: string, node: IFolder, filters?: string[], shown?: boolean) {
    if (!isElectron()) {
        node.files = [
            'lwi.fx',
            'light.fx',
            'sphere.fx',
            'part.fx',
            'part.xfx',
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

        const dir = path.isAbsolute($dir)? $dir : path.join(path.dirname(window.location.pathname.substr(1)), $dir);

        let stats = fs.statSync(dir);    
        if (!stats.isDirectory()) {
            return;
        }

        fs.readdirSync(dir).forEach(async filename => {
            let $filepath = path.join($dir, filename);
            let filepath = path.join(dir, filename);
            let filestats = fs.statSync(filepath);

            if (filestats.isFile()) {
                if (!filters || filters.indexOf(path.extname(filename)) != -1) {
                    node.files = node.files || [];
                    node.files.push($filepath);
                    node.totalFiles++;
                    node.shown = !!shown; // ??
                }
            }

            if (filestats.isDirectory()) {
                node.folders = node.folders || [];

                let subfolder = { path: $filepath, totalFiles: 0 };
                scan($filepath, subfolder, filters, shown);

                node.folders.push(subfolder);
                node.totalFiles += subfolder.totalFiles;
            }
        });
    } catch (e) {
        console.log(e);
    }
}

class FileListView extends React.Component<IFileListViewProps, {}> {
    declare state: { root: IFolder };

    constructor(props: IFileListViewProps) {
        super(props);
        this.state = { root: { path: null, shown: !!props.expanded, totalFiles: 0 } };
    }

    UNSAFE_componentWillUpdate(nextProps: IFileListViewProps, nextState) {
        const { state } = this;

        if (state.root.path === nextProps.path) {
            return;
        }

        scan(nextProps.path, state.root, nextProps.filters, nextProps.expanded);
    }


    renderFolder(folder: IFolder) {
        if (!folder || !folder.path || !folder.totalFiles) {
            return null;
        }

        return (
            <List.Item key={ folder.path }>
                <List.Icon className={ FileDirectoryIcon } />
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
            <List.Item as='a' onClick={ () => this.props.onFileClick(file) } key={ file }>
                <List.Icon name={ FileCodeIcon } />
                <List.Content>
                    <List.Header>{ path.basename(file) }</List.Header>
                </List.Content>
            </List.Item>
        );
    }

    render() {
        const props = this.props;
        const { root } = this.state;
        return (
            <div>
                 
                { props.desc &&
                    <Header as='h4' block>
                        <Icon name='inbox' />
                        <Header.Content>{ props.desc }</Header.Content>
                    </Header>   
                }
                <List divided celled>
                    { this.renderFolder(root) }
                </List>
            </div>
        );
    }
}

export default FileListView;
