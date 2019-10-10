/* tslint:disable:max-func-body-length */
import { isNull } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import { IInstruction, IInstructionCollector } from '@lib/idl/IInstruction';
import { IParseNode, IParseTree } from '@lib/idl/parser/IParser';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { ASTView, FileListView, IWithStyles, MemoryView, ProgramView } from '@sandbox/components';
import { BytecodeView, ParserParameters, SourceEditor2, Playground } from '@sandbox/containers';
import { getCommon, mapProps } from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import * as React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { Button, Checkbox, Container, Divider, Form, Grid, Icon, Input, Menu, Segment, Sidebar, Tab, Label, Table, Header, Message } from 'semantic-ui-react';
import * as path from 'path';

declare const VERSION: string;
declare const COMMITHASH: string;
declare const BRANCH: string;
declare const MODE: string;


// process.chdir(`${__dirname}/../../`); // making ./build as cwd

type UnknownIcon = any;

export const styles = {
    sidebarLeftHotfix: {
        width: `79px !important`,
        backgroundColor: '#1e1e1e !important'
    },
    mainContentHotfix: {
        marginLeft: `calc(79px)`
    },
    mainViewHeightHotfix: {
        marginBottom: '0 !important'
    },
    fileBrowserSidebarHotfix: {
        padding: '10px !important',
        background: 'rgba(255,255,255,0.95) !important'
    },
    containerMarginFix: {
        border: '0px !important',
        padding: '0 !important'
    },
    topMenuFix: {
        '& > div:first-child': {
            marginBottom: '0',
            position: 'relative',
            zIndex: '2',
            // boxShadow: '0 2px 5px rgba(10,10,10, 0.1) !important',
            backgroundColor: 'white !important'
        }
    },
    rightColumnFix: {
        // boxShadow: '-5px 0 5px black',
        zIndex: 1,
        paddingLeft: '0 !important'
    },
    leftColumnFix: {
        paddingRight: '0px !important'
    },
    versionFix: {
        padding: '5px !important',
        margin: '-5px !important'
    }
}

// todo: remove the inheritance of the type of data
export interface IAppProps extends IStoreState, IWithStyles<typeof styles> {
    actions: typeof sourceActions;
}


const Version = (props) => {
    return (
        <div>
            <Message warning={ MODE != 'production' } size="tiny" compact className={ props.classes.versionFix }>
                { MODE != 'production' && <Icon name={ 'issue opened' as UnknownIcon } /> }{ MODE } | { BRANCH }-{ VERSION }
            </Message>
        </div>
    );
}

@injectSheet(styles)
class App extends React.Component<IAppProps> {

    state: {
        showFileBrowser: boolean;
        autocompile: boolean;
        entryPoint: string;
        bc: ReturnType<typeof Bytecode['translate']> // todo: fix type deduction;
    };

    constructor(props) {
        super(props);
        this.state = {
            bc: null,
            showFileBrowser: false,
            autocompile: false,
            entryPoint: Bytecode.DEFAULT_ENTRY_POINT_NAME
        };
    }

    handleShowFileBrowser = () => this.setState({ showFileBrowser: !this.state.showFileBrowser })
    hideFileBrowser = () => this.setState({ showFileBrowser: false })

    compile(force: boolean = false) {
        const { state, props } = this;

        if (!isNull(state.bc) && !force) {
            return;
        }

        if (!isNull(props.sourceFile.root)) {
            this.setState({ bc: Bytecode.translate(state.entryPoint, props.sourceFile.root.scope) });
        }
    }

    setEntryPoint(val: string) {
        this.setState({ entryPoint: val, bc: null });
    }

    setAutocompile(val: boolean) {
        this.setState({ autocompile: val });
    }

    static getDerivedStateFromProps(props, state) {
        let stateDiff = null;
        let nextRoot = props.sourceFile.root;
        let contentChanged = !(state.prevRoot == nextRoot);

        if (contentChanged) {
            stateDiff = { prevRoot: nextRoot };
        }

        if (!state.autocompile) {
            if (contentChanged && state.bc) {
                stateDiff.bc = null;
            }
        } else if ((contentChanged || !state.bc) && nextRoot) {
            stateDiff = stateDiff || {};
            stateDiff.bc = Bytecode.translate(state.entryPoint, nextRoot.scope);
            console.log('bytecode has been updated');
        }

        return stateDiff;
    }


    highlightInstruction(inst: IInstruction, show: boolean = true) {
        let markerName = `ast-range-${inst.instructionID}`;
        if (show) {
            this.props.actions.addMarker({
                name: markerName,
                range: inst.sourceNode.loc,
                type: `marker`
            });
        } else {
            this.props.actions.removeMarker(markerName);
        }
    }


    highlightPNode(id: string, pnode: IParseNode = null, show: boolean = true) {
        if (show) {
            this.props.actions.addMarker({
                name: `ast-range-${id}`,
                range: pnode.loc,
                type: 'marker'
            })
        } else {
            this.props.actions.removeMarker(`ast-range-${id}`);
        }
    }


    validateBreakpoint(ln: number) {
        let { state: { bc } } = this;
        let cdl = bc && bc.cdl;
        if (!cdl) {
            return ln;
        }

        let view = cdlview(cdl);
        return view.resolveBreakpointLocation(ln);
    }

    render() {
        const { props, state } = this;

        const analysisResults = [
            {
                menuItem: (<Menu.Item key='playground'><Menu.Header>Playground</Menu.Header></Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key='playground-view'>
                        <Header as='h4' dividing>
                            <Icon name={ 'flame' as any } />
                            <Header.Content>
                                Playground
                                <Header.Subheader>Take a look at what's under the hood</Header.Subheader>
                            </Header.Content>
                        </Header>
                        <Playground scope={ props.sourceFile.scope } />
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item key='bytecode'><Menu.Header>Bytecode<br />Debugger</Menu.Header></Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key='bytecode-view'>
                        <Header as='h4' dividing>
                            <Icon name='plug' />
                            <Header.Content>
                                Bytecode Debugger
                            </Header.Content>
                        </Header>
                        <Table size='small' basic='very' compact='very'>
                            <Table.Body>
                                {/* todo: remove this padding hack */ }
                                <Table.Row style={ { paddingTop: 0 } }>
                                    <Table.Cell>
                                        <Input
                                            fluid
                                            size='small'
                                            label='entry point'
                                            placeholder={ state.entryPoint }
                                            onChange={ (e, data) => this.setEntryPoint(data.value) }
                                        />
                                    </Table.Cell>
                                    <Table.Cell >
                                        <Button disabled={ this.state.autocompile } onClick={ () => this.compile(true) } width={ 10 } >Compile</Button>
                                        &nbsp;
                                        <Checkbox
                                            width={ 6 }
                                            label='auto compilation'
                                            size='small'

                                            onChange={ (e, data) => this.setAutocompile(data.checked) }
                                        />
                                    </Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table>
                        { state.bc ? (
                            <div>
                                {/* todo: move memory view inside bytecode view; */ }
                                <MemoryView binaryData={ state.bc.constants.data.byteArray } layout={ state.bc.constants.data.layout } />
                                <BytecodeView code={ state.bc.code } cdl={ state.bc.cdl } />
                            </div>
                        ) : null }
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item key='semantic-analysis'><Menu.Header>Semantics<br />Analyzer</Menu.Header></Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key='program-view'>
                        <ProgramView
                            onNodeOver={ inst => this.highlightInstruction(inst, true) }
                            onNodeOut={ inst => this.highlightInstruction(inst, false) }
                            onNodeClick={ inst => { } }
                        />
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item key='syntax-analysis'><Menu.Header>Syntax<br />Analyzer</Menu.Header></Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key='ast-view'>
                        <ASTView
                            onNodeOver={ (idx, node) => this.highlightPNode(idx, node, true) }
                            onNodeOut={ idx => this.highlightPNode(idx, null, false) }
                        />
                    </Tab.Pane>
                )
            }
        ];

        const panes = [
            {
                menuItem: (
                    <Menu.Item>
                        Source File
                        <span style={ { fontWeight: 'normal', color: 'rgba(0, 0, 0, 0.6)' } }>
                            &nbsp;|&nbsp;{ path.basename(props.sourceFile.filename) }
                        </span>
                    </Menu.Item>
                ),
                render: () => (
                    <Tab.Pane key='source' className={ `${props.classes.containerMarginFix} ${props.classes.mainViewHeightHotfix}` }
                    // fixme: remove style from line below;
                    // as={ ({ ...props }) => <Container fluid { ...props } /> }
                    >
                        <Grid divided={ false }>
                            <Grid.Row columns={ 2 }>
                                <Grid.Column computer='10' tablet='8' mobile='6' className={ props.classes.leftColumnFix }>
                                    <SourceEditor2
                                        name='source-code'
                                        validateBreakpoint={ line => this.validateBreakpoint(line) }
                                    />
                                </Grid.Column>
                                <Grid.Column computer='6' tablet='8' mobile='10' className={ props.classes.rightColumnFix }>
                                    <Container style={ { paddingTop: '15px' } }>
                                        <Tab
                                            menu={ { attached: false, secondary: true, pointing: false, size: 'mini' } } 
                                            panes={ analysisResults }
                                            renderActiveOnly={ false } />
                                    </Container>
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Tab.Pane>
                )
            },
            {
                menuItem: 'Grammar',
                render: () => (
                    <Tab.Pane key='grammar' className={ `${props.classes.containerMarginFix} ${props.classes.mainViewHeightHotfix}` }>
                        <ParserParameters />
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item key='ver' position='right' inverted disabled color='red'><Version classes={ props.classes } /></Menu.Item>),
                render: () => null
            }
        ];

        return (
            <div className={ props.classes.mainContentHotfix }>
                <Sidebar.Pushable>
                    <Sidebar
                        as={ Segment }
                        animation='overlay'
                        // onHide={ this.hideFileBrowser }
                        vertical
                        visible={ this.state.showFileBrowser }
                        className={ this.props.classes.fileBrowserSidebarHotfix }
                    >
                        <FileListView path='./assets' filters={ ['.fx'] } onFileClick={ (file) => { props.actions.openFile(file) } } />
                    </Sidebar>
                    <Sidebar.Pusher dimmed={ this.state.showFileBrowser }>
                        {/* "renderActiveOnly" should always be true because only one instance of Monaco editor can be used simultaneously */ }
                        <Tab menu={ { secondary: true, pointing: true } } panes={ panes } renderActiveOnly={ true }
                            className={ props.classes.topMenuFix } />
                    </Sidebar.Pusher>
                </Sidebar.Pushable>

                <Menu vertical icon='labeled' color='black' inverted fixed='left' className={ props.classes.sidebarLeftHotfix }>
                    <Menu.Item name='home' onClick={ this.handleShowFileBrowser } >
                        <Icon name={ 'three bars' as UnknownIcon } />
                        File Browser
                    </Menu.Item>
                </Menu>
            </div>
        );
    }
}



export default connect<{}, {}, IAppProps>(mapProps(getCommon), mapActions(sourceActions))(App) as any;
