/* tslint:disable:typedef */

import { isArray } from '@lib/common';
import { IDepotFolder } from '@sandbox/store/IStoreState';
import * as path from 'path';
import * as React from 'react';
import { Header, Icon, List } from 'semantic-ui-react';

interface IFileListViewProps {
    root: IDepotFolder;
    onFileClick: (file: string) => void;
    expanded?: boolean;
    desc?: string;
}

const FileDirectoryIcon: any = 'file directory';
const FileCodeIcon: any = 'file code';


class FileListView extends React.Component<IFileListViewProps, {}> {
    constructor(props: IFileListViewProps) {
        super(props);
    }

    renderFolder(folder: IDepotFolder) {
        if (!folder || !folder.path || !folder.totalFiles) {
            return null;
        }

        return (
            <List.Item key={ folder.path }>
                <List.Icon className={ FileDirectoryIcon } />
                <List.Content>
                    <List.Header>
                        { path.basename(folder.path) }
                    </List.Header>
                    <List.List>
                        { (folder.folders || []).map(folder => this.renderFolder(folder)) }
                        { (folder.files || []).map(file => this.renderFile(file)) }
                    </List.List>
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
        const { root } = props;
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
