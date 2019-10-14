/* tslint:disable:max-func-body-length */
/* tslint:disable:typedef */

import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { IInstruction } from '@lib/idl/IInstruction';
import { IParseNode } from '@lib/idl/parser/IParser';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { ASTView, FileListView, IWithStyles, MemoryView, ProgramView } from '@sandbox/components';
import { BytecodeView, ParserParameters, Playground, SourceEditor2 } from '@sandbox/containers';
import { getCommon, mapProps } from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as path from 'path';
import * as React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { HashRouter as Router, matchPath, NavLink, Route, Switch, Redirect } from 'react-router-dom';
import { Button, Checkbox, Container, Dropdown, Grid, Header, Icon, Input, Menu, Message, Segment, Sidebar, Tab, Table } from 'semantic-ui-react';

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
            <Message warning={ MODE !== 'production' } size='tiny' compact className={ props.classes.versionFix }>
                { MODE !== 'production' && <Icon name={ 'issue opened' as UnknownIcon } /> }{ MODE } | { BRANCH }-{ VERSION }
            </Message>
        </div>
    );
}


@injectSheet(styles)
class App extends React.Component<IAppProps> {

    state: {
        showFileBrowser: boolean;
    };

    private entryPointRef = React.createRef<Input>();

    constructor(props) {
        super(props);
        this.state = {
            showFileBrowser: false,
        };
    }


    static getDerivedStateFromProps(props: IAppProps, state) {
        const nextAnalysis = props.sourceFile.analysis;
        const contentChanged = !(state.prevAnalysis === nextAnalysis);
        let stateDiff = null;

        if (contentChanged) {
            stateDiff = { prevAnalysis: nextAnalysis };
        }

        return stateDiff;
    }


    handleShowFileBrowser = () => this.setState({ showFileBrowser: !this.state.showFileBrowser })
    hideFileBrowser = () => this.setState({ showFileBrowser: false })

    @autobind
    compile() {
        const { state, props, entryPointRef } = this;

        // fixme: kinda hack!
        const input: HTMLInputElement = (entryPointRef.current as any).inputRef.current;
        props.actions.compile(input.value || null);
    }


    setAutocompile(autocompile: boolean) {
        this.props.actions.specifyOptions({ autocompile });
    }

    setBytecodeColorization(colorize: boolean) {
        this.props.actions.specifyOptions({ colorize });
    }


    highlightInstruction(inst: IInstruction, show: boolean = true) {
        const markerName = `ast-range-${inst.instructionID}`;
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

    canCompile(): boolean {
        const { sourceFile } = this.props;
        return sourceFile.analysis && sourceFile.analysis.diag.errors === 0;
    }

    render() {
        const { props, state, props: { sourceFile } } = this;
        const $debugger = sourceFile.debugger;

        const analysisResults = [
            {
                menuItem: {
                    as: NavLink,
                    content: (<Menu.Header>Playground</Menu.Header>),
                    to: '/playground',
                    exact: true,
                    key: 'playground'
                },
                pane: (
                    <Route path='/playground' exact>
                        <Tab.Pane attached={ false } key='playground-view'>
                            <Header as='h4' dividing>
                                <Icon name={ 'flame' as any } />
                                <Header.Content>
                                    Playground
                                    <Header.Subheader>Take a look at what's under the hood</Header.Subheader>
                                </Header.Content>
                            </Header>
                            <Playground scope={ props.sourceFile.analysis && props.sourceFile.analysis.scope } />
                        </Tab.Pane>
                    </Route>
                )
            },
            {
                menuItem: {
                    as: NavLink,
                    content: (<Menu.Header>Bytecode<br />Debugger</Menu.Header>),
                    to: '/bytecode',
                    exact: true,
                    key: 'bytecode'
                },
                pane: (
                    <Route path='/bytecode' exact>
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
                                                placeholder={ Bytecode.DEFAULT_ENTRY_POINT_NAME }
                                                ref={ this.entryPointRef }
                                            />
                                        </Table.Cell>
                                        <Table.Cell >
                                            <Button
                                                disabled={ $debugger.options.autocompile || !this.canCompile() }
                                                onClick={ this.compile } width={ 10 } >
                                                Compile
                                            </Button>
                                            &nbsp;
                                            <Dropdown text='Options' pointing='left' >
                                                <Dropdown.Menu>
                                                    <Dropdown.Item>
                                                        <Checkbox label='auto compilation' size='small'
                                                            checked={ $debugger.options.autocompile }
                                                            onMouseDown={ e => this.setAutocompile(!$debugger.options.autocompile) } />
                                                    </Dropdown.Item>
                                                    <Dropdown.Item>
                                                        <Checkbox disabled label='no optimisations' size='small' checked />
                                                    </Dropdown.Item>
                                                    <Dropdown.Item>
                                                        <Checkbox label='colorize' size='small'
                                                            checked={ $debugger.options.colorize }
                                                            onMouseDown={ e => this.setBytecodeColorization(!$debugger.options.colorize) } />
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                            {/* <NoOptimizations /> */}
                                        </Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table>
                            { $debugger.runtime ? (
                                <div>
                                    {/* todo: move memory view inside bytecode view; */ }
                                    <MemoryView
                                        binaryData={ $debugger.runtime.constants.data.byteArray }
                                        layout={ $debugger.runtime.constants.data.layout } />
                                    <BytecodeView />
                                </div>
                            ) : null }
                        </Tab.Pane>
                    </Route>
                )
            },
            {
                menuItem: {
                    as: NavLink,
                    content: <Menu.Header>Semantic<br />Analyzer</Menu.Header>,
                    to: '/program',
                    exact: true,
                    key: 'program'
                },
                pane: (
                    <Route path='/program' exact>
                        <Tab.Pane attached={ false } key='program-view'>
                            <Header as='h4' dividing>
                                <Header.Content>
                                    <Icon name={'git compare' as UnknownIcon} />
                                    Symantic Analysis
                                </Header.Content>
                            </Header>
                            <ProgramView
                                onNodeOver={ inst => this.highlightInstruction(inst, true) }
                                onNodeOut={ inst => this.highlightInstruction(inst, false) }
                                onNodeClick={ inst => { } }
                            />
                        </Tab.Pane>
                    </Route>
                )
            },
            {
                menuItem: {
                    as: NavLink,
                    content: <Menu.Header>Syntax<br />Analyzer</Menu.Header>,
                    to: '/ast',
                    exact: true,
                    key: 'ast'
                },
                pane: (
                    <Route path='/ast' exact>
                        <Tab.Pane attached={ false } key='ast-view'>
                            <Header as='h4' dividing>
                                <Header.Content>
                                    <Icon name='pencil' />
                                    Syntax Analysis
                                </Header.Content>
                            </Header>
                            <ASTView
                                onNodeOver={ (idx, node) => this.highlightPNode(idx, node, true) }
                                onNodeOut={ idx => this.highlightPNode(idx, null, false) }
                            />
                        </Tab.Pane>
                    </Route>
                )
            }
        ];

        const defaultActiveIndex = analysisResults.findIndex(pane => {
            return !!matchPath(window.location.pathname, {
                path: pane.menuItem.to,
                exact: true
            });
        });

        const panes = [
            {
                menuItem: (
                    <Menu.Item>
                        Source File
                        <span style={ { fontWeight: 'normal', color: 'rgba(0, 0, 0, 0.6)' } }>
                            &nbsp;|&nbsp;{ path.basename(props.sourceFile.filename || '') }
                        </span>
                    </Menu.Item>
                ),
                render: () => (
                    <Tab.Pane key='source' className={ `${props.classes.containerMarginFix} ${props.classes.mainViewHeightHotfix}` }>
                        <Grid divided={ false }>
                            <Grid.Row columns={ 2 }>
                                <Grid.Column computer='10' tablet='8' mobile='6' className={ props.classes.leftColumnFix }>
                                    <SourceEditor2 name='source-code' />
                                </Grid.Column>
                                <Grid.Column computer='6' tablet='8' mobile='10' className={ props.classes.rightColumnFix }>
                                    <Container style={ { paddingTop: '15px' } }>
                                        <Switch>
                                            <Redirect from='/' strict exact to='/playground' />
                                            <Tab
                                                defaultActiveIndex={ defaultActiveIndex }
                                                menu={ { attached: false, secondary: true, pointing: false, size: 'mini' } }
                                                panes={ analysisResults }
                                                renderActiveOnly={ false } />
                                        </Switch>
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
                menuItem: (
                    <Menu.Item key='ver' position='right' inverted disabled color='red'>
                        <Version classes={ props.classes } />
                    </Menu.Item>),
                render: () => null
            }
        ];

        return (
    <Router>
                <div className={ props.classes.mainContentHotfix }>
                    <Sidebar.Pushable>
                        <Sidebar
                            as={ Segment }
                            animation='overlay'
                            vertical
                            visible={ this.state.showFileBrowser }
                            className={ this.props.classes.fileBrowserSidebarHotfix }
                        >
                            <FileListView
                                path='./assets'
                                filters={ ['.fx'] }
                                onFileClick={ (file) => { props.actions.openFile(file); } } />
                        </Sidebar>
                        <Sidebar.Pusher dimmed={ this.state.showFileBrowser }>
                            {
                                /*
                                    "renderActiveOnly" should always be true
                                    because only one instance of Monaco editor
                                    can be used simultaneously
                                */
                                }
                            <Tab
                                menu={ { secondary: true, pointing: true } }
                                panes={ panes }
                                renderActiveOnly={ true }
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
            </Router>
        );
    }

}



export default connect<{}, {}, IAppProps>(mapProps(getCommon), mapActions(sourceActions))(App) as any;
