import * as Autotests from '@lib/fx/autotests';
/* tslint:disable:max-func-body-length */
/* tslint:disable:typedef */
/* tslint:disable:no-single-line-block-comment */

import * as Bytecode from '@lib/fx/bytecode';
import { createTextDocument } from '@lib/fx/TextDocument';
import { IInstruction } from '@lib/idl/IInstruction';
import { IParseNode, IRange } from '@lib/idl/parser/IParser';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { ASTView, FileListView, IWithStyles, MemoryView, PPView, ProgramView } from '@sandbox/components';
import { BytecodeView, ParserParameters, Playground, ShaderTranslatorView, SourceEditor2 } from '@sandbox/containers';
import { getCommon, mapProps } from '@sandbox/reducers';
import { history } from '@sandbox/reducers/router';
import { filterPartFx, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import { routerActions } from 'connected-react-router';
import * as path from 'path';
import * as React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { matchPath, NavLink, Route, RouteComponentProps, Switch, withRouter } from 'react-router-dom';
import { Button, Checkbox, Container, Dropdown, Grid, Icon, Input, Loader, Menu, Message, Popup, Segment, Sidebar, Tab, Table } from 'semantic-ui-react';

declare const VERSION: string;
declare const COMMITHASH: string;
declare const BRANCH: string;
declare const MODE: string;
declare const TIMESTAMP: string;

// const DEFAULT_FX_NAME = `./assets/fx/tests/new`;

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
    fileBrowserSidebarFix: {
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
        },

        '& > .menu:first-child': {
            '& .item': {
                '&.active': {
                    border: '0 !important'
                }
            }
        }
    },
    rightColumnFix: {
        // boxShadow: '-5px 0 5px black',
        zIndex: 1,
        paddingLeft: '0 !important',
        backgroundColor: 'white',
        '& > .container': {
            paddingTop: '15px'
        }
    },
    leftColumnFix: {
        paddingRight: '0px !important'
    },
    versionFix: {
        padding: '5px !important',
        margin: '-5px !important'
    },

    tabHeaderFix: {
        marginTop: 0,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.075)'
    },

    mainMenu: {
        '& > .item': {
            padding: '0 7px !important',
            margin: '0 !important',
            borderRight: '1px solid #ccc !important',
            borderRadius: '0 !important',
            minHeight: '40px'
        }
    },

    //
    // SourceCodeMenu
    //

    mebFix: {
        background: '#1e1e1e !important',
        position: 'relative',
        zIndex: 1,
        height: 'auto !important',
        minHeight: 'auto !important',

        '& .item': {
            opacity: '0.6 !important',
            alignSelf: 'baseline !important',
            paddingRight: '0 !important',
            paddingTop: '5px !important',
            paddingBottom: '5px !important',

            '&:not(:first-child)': {
                paddingLeft: '0 !important',
            },

            '&.active': {
                border: '0 !important',
                opacity: '0.75 !important',
                fontWeight: 'normal !important'
            }
        }
    }

};

// todo: remove the inheritance of the type of data
export interface IAppProps extends IStoreState, IWithStyles<typeof styles>, RouteComponentProps<any> {
    actions: typeof sourceActions & typeof routerActions;
}


const Version = (props) => {
    return (
        <Popup
            trigger={
                <div>
                    <Message warning={ MODE !== 'production' } size='tiny' compact className={ props.classes.versionFix }>
                        { MODE !== 'production' && <Icon name={ 'issue opened' as UnknownIcon } /> }{ MODE } | { BRANCH }-{ VERSION }
                    </Message>
                </div>
            }
            // position='left center'
            size='small'
            content={ TIMESTAMP }
            inverted
        />
    );
};

interface ISourceCodeMenuProps extends IWithStyles<typeof styles> {
    path: {
        name?: string;
        pass?: string;
        property?: string;
    };
}

@injectSheet(styles)
class SourceCodeMenu extends React.Component<ISourceCodeMenuProps> {
    state = { activeItem: 'vertexshader' };

    handleItemClick = (e, { name }) => this.setState({ activeItem: name })

    render() {
        const { state: { activeItem }, props: { path } } = this;

        return (
            <Menu size='mini' pointing secondary inverted attached className={ this.props.classes.mebFix }>
                <Menu.Item
                    name='sourcecode'
                    // position='right'
                    active={ activeItem === 'sourcecode' }
                    onClick={ this.handleItemClick }
                >
                    source code <Icon name={ 'chevron right' as any } />
                </Menu.Item>

                <Menu.Item
                    name='vertexshader'
                    // position='right'
                    active={ activeItem === 'vertexshader' }
                    onClick={ this.handleItemClick }
                >
                    { path.name &&
                        <div>
                            { path.name } < Icon name={ 'chevron right' as any } />
                        </div>
                    }
                    { path.pass &&
                        <div>
                            { `pass[${path.pass}]` } < Icon name={ 'chevron right' as any } />
                        </div>
                    }
                    { path.property &&
                        <div>
                            { path.property }
                        </div>
                    }
                </Menu.Item>
            </Menu>
        );
    }
}



@injectSheet(styles)
@(withRouter as any) // << NOTE: known issue with TS decorators :/
class App extends React.Component<IAppProps> {

    state: {
        showFileBrowser: boolean;
        testProcessing: boolean;
    };

    private expressionRef = React.createRef<Input>();

    constructor(props) {
        super(props);
        this.state = {
            showFileBrowser: false,
            testProcessing: false
        };
    }


    static getDerivedStateFromProps(props: IAppProps, state) {
        const nextAnalysis = props.sourceFile.slDocument;
        const contentChanged = !(state.prevAnalysis === nextAnalysis);
        let stateDiff = null;

        if (contentChanged) {
            stateDiff = { prevAnalysis: nextAnalysis };
        }

        return stateDiff;
    }


    handleShowFileBrowser = () => this.setState({ showFileBrowser: !this.state.showFileBrowser });
    hideFileBrowser = () => this.setState({ showFileBrowser: false });



    @autobind
    async runAutotests() {
        this.setState({ testProcessing: true });

        // timeout for playing animation in UI
        setTimeout(async () => {
            const { content: source, uri } = getFileState(this.props);
            const textDocument = createTextDocument(uri, source);
            const autotests = await Autotests.parse(textDocument);

            await Autotests.run(autotests);

            if (!autotests.passed) {
                console.warn(autotests);
            }

            autotests.tests.forEach((test, iTest) => {
                const testName = `${test.name}-${iTest}`;
                this.highlightTest(test.name, test.loc, false);
                this.highlightTest(test.name, test.loc, true, test.passed);

                test.cases.forEach((exam, iExam) => {
                    const examName = `${testName}-${iExam}`;
                    this.highlightTest(examName, exam.loc, false);
                    this.highlightTest(examName, exam.loc, true, exam.passed, exam.note);
                });
            });

            this.setState({ testProcessing: false });
        }, 10);
    }

    @autobind
    compile() {
        const { state, props, expressionRef } = this;

        // fixme: kinda hack!
        const input: HTMLInputElement = (expressionRef.current as any).inputRef.current;
        props.actions.compile(input.value || null);
    }


    setAutocompile(autocompile: boolean) {
        this.props.actions.specifyOptions({ autocompile });
    }

    setBytecodeColorization(colorize: boolean) {
        this.props.actions.specifyOptions({ colorize });
    }

    resolveLocation(src: IRange): IRange {
        const file = getFileState(this.props);
        const uri = file.uri;
        const slastDocument = file.slastDocument;

        if (!slastDocument) {
            return null;
        }

        const includes = slastDocument.includes;

        let dst = src;
        while (dst && String(uri) !== String(dst.start.file)) {
            dst = includes.get(String(dst.start.file));
        }
        return dst;
    }

    /** @deprecated */
    highlightTest(testName: string, loc: IRange, show: boolean = true, passed?: boolean, tooltip?: string) {
        const name = `autotest-${testName}`;
        if (show) {
            const range = this.resolveLocation(loc);
            const color = passed ? 10 : 14;
            this.props.actions.addMarker({ name, range, type: `line`, payload: { color } });
            if (!passed && tooltip) {
                this.props.actions.addMarker({ name: `${name}-error`, range, type: `error`, payload: { color }, tooltip });
            }
        } else {
            this.props.actions.removeMarker(`${name}`);
            this.props.actions.removeMarker(`${name}-error`);
        }
    }

    /** @deprecated */
    highlightInstruction(inst: IInstruction, show: boolean = true) {
        const markerName = `ast-range-${inst.instructionID}`;
        if (show) {
            const range = this.resolveLocation(inst.sourceNode.loc);
            this.props.actions.addMarker({
                name: markerName,
                range,
                type: `marker`
            });
        } else {
            this.props.actions.removeMarker(markerName);
        }
    }


    /** @deprecated */
    highlightPNode(id: string, pnode: IParseNode = null, show: boolean = true) {
        if (show) {
            const range = this.resolveLocation(pnode.loc);
            this.props.actions.addMarker({
                name: `ast-range-${id}`,
                range,
                type: 'marker'
            })
        } else {
            this.props.actions.removeMarker(`ast-range-${id}`);
        }
    }


    canCompile(): boolean {
        const { sourceFile } = this.props;
        return sourceFile.slDocument && sourceFile.slDocument.diagnosticReport.errors === 0;
    }


    buildShaderMenu(): { name: string; link: string }[] {
        const props = this.props;
        const file = getFileState(props);
        const list = filterPartFx(getScope(file));

        if (!file.uri) {
            return [];
        }

        const links: string[] = [];
        const basepath = `/playground/${path.basename(file.uri)}`;
        for (const fx of list) {
            links.push(`${fx.name}`);
            links.push(...fx.passList
                .filter(pass => !!pass.vertexShader)
                .map((pass, i) => `${fx.name}/${pass.name || i}/VertexShader`));
            links.push(...fx.passList
                .filter(pass => !!pass.pixelShader)
                .map((pass, i) => `${fx.name}/${pass.name || i}/PixelShader`));
        }
        return links.map(name => ({ name, basepath, link: `${basepath}/${name}` }));
    }


    render() {
        const { props, state, props: { sourceFile } } = this;
        const $debugger = sourceFile.debugger;

        // console.log(props.match.params);
        // console.log(`/${props.match.params.view}/${props.match.params.fx}`);

        // console.log(JSON.stringify(props.match, null, '\t'));

        const showAutotestMenu = (sourceFile.content || '').substr(0, 40).indexOf('@autotests') !== -1;

        const analysisResults = [
            {
                menuItem: {
                    as: NavLink,
                    content: (<Menu.Header>Playground</Menu.Header>),
                    to: `/playground/${props.match.params.fx}`,
                    // exact: true,
                    key: 'playground'
                },
                pane: (
                    <Route path='/playground'>
                        {/* <Header as='h5' textAlign='right' mini block attached={ 'top' } style={ { marginTop: 0 } }>
                            Playground
                        </Header> */}
                        <Menu secondary borderless attached={ 'top' } className={ props.classes.tabHeaderFix }>
                            <Dropdown item icon='gear' simple>
                                <Dropdown.Menu>
                                    {
                                        this.buildShaderMenu().map(item => (
                                            <Dropdown.Item
                                                as={ NavLink }
                                                to={ item.link } >
                                                { item.name }
                                            </Dropdown.Item>
                                        ))
                                    }
                                </Dropdown.Menu>
                            </Dropdown>
                            <Menu.Menu position='right'>
                                <div className='ui right aligned category search item'>
                                    Playground
                                </div>
                            </Menu.Menu>
                        </Menu>
                        <Tab.Pane attached={ 'bottom' } key='playground-view'>
                            <Playground />
                        </Tab.Pane>
                    </Route>
                )
            },
            {
                menuItem: {
                    as: NavLink,
                    content: (<Menu.Header>Bytecode<br />Debugger</Menu.Header>),
                    to: `/bytecode/${props.match.params.fx}`,
                    // exact: true,
                    key: 'bytecode'
                },
                pane: (
                    <Route path='/bytecode'>
                        {/* <Header as='h5' textAlign='right' mini block attached={ 'top' } style={ { marginTop: 0 } }>
                            Bytecode Debugger
                        </Header> */}
                        <Menu secondary borderless attached={ 'top' } className={ props.classes.tabHeaderFix }>
                            <Menu.Menu position='right'>
                                <div className='ui right aligned category search item'>
                                    Bytecode Debugger
                                </div>
                            </Menu.Menu>
                        </Menu>
                        <Tab.Pane attached={ 'bottom' } key='bytecode-view'>
                            { showAutotestMenu &&
                                <Segment color='orange'>
                                    { !this.state.testProcessing &&
                                        <Button
                                            onClick={ this.runAutotests } width={ '100%' } >
                                            <span>Run autotests!</span>
                                        </Button>
                                    }
                                    { this.state.testProcessing &&
                                        <Loader active inline />
                                    }
                                </Segment>
                            }
                            <Table size='small' basic='very' compact='very'>
                                <Table.Body>
                                    <Table.Row style={ { paddingTop: 0 } }>
                                        <Table.Cell>
                                            <Input
                                                fluid
                                                size='small'
                                                label='expression'
                                                placeholder={ `${Bytecode.DEFAULT_ENTRY_POINT_NAME}()` }
                                                ref={ this.expressionRef }
                                            />
                                        </Table.Cell>
                                        <Table.Cell >
                                            <Button
                                                disabled={ ($debugger.options.autocompile || !this.canCompile()) }
                                                onClick={ this.compile } width={ 10 } >
                                                Compile
                                            </Button>
                                            &nbsp;
                                            <Dropdown text='Options' pointing='left' >
                                                <Dropdown.Menu>
                                                    <Dropdown.Item>
                                                        <Checkbox label='auto compilation' size='small'
                                                            checked={ $debugger.options.autocompile }
                                                            onMouseDown={
                                                                e => this.setAutocompile(!$debugger.options.autocompile)
                                                            } />
                                                    </Dropdown.Item>
                                                    <Dropdown.Item>
                                                        <Checkbox disabled label='no optimisations' size='small' checked />
                                                    </Dropdown.Item>
                                                    <Dropdown.Item>
                                                        <Checkbox label='colorize' size='small'
                                                            checked={ $debugger.options.colorize }
                                                            onMouseDown={
                                                                e => this.setBytecodeColorization(!$debugger.options.colorize)
                                                            } />
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                            {/* <NoOptimizations /> */ }
                                        </Table.Cell>
                                    </Table.Row>
                                </Table.Body>
                            </Table>
                            { $debugger.runtime ? (
                                <div>
                                    {/* todo: move memory view inside bytecode view; */ }
                                    <MemoryView program={ $debugger.runtime } />
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
                    to: `/program/${props.match.params.fx}`,
                    // exact: true,
                    key: 'program'
                },
                pane: (
                    <Route path='/program'>
                        <Menu secondary borderless attached={ 'top' } className={ props.classes.tabHeaderFix }>
                            <Menu.Menu position='right'>
                                <div className='ui right aligned category search item'>
                                    Semantic Analisys
                                </div>
                            </Menu.Menu>
                        </Menu>
                        <Tab.Pane attached={ 'bottom' } key='program-view'>
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
                    to: `/ast/${props.match.params.fx}`,
                    // exact: true,
                    key: 'ast'
                },
                pane: (
                    <Route path='/ast'>
                        {/* <Header as='h5' textAlign='right' mini block attached={ 'top' } style={ { marginTop: 0 } }>
                            Syntax Analysis
                        </Header> */}
                        <Menu secondary borderless attached={ 'top' } className={ props.classes.tabHeaderFix }>
                            <Menu.Menu position='right'>
                                <div className='ui right aligned category search item'>
                                    Syntax Analysis
                                </div>
                            </Menu.Menu>
                        </Menu>
                        <Tab.Pane attached={ 'bottom' } key='ast-view'>
                            <ASTView
                                onNodeOver={ (idx, node) => this.highlightPNode(idx, node, true) }
                                onNodeOut={ idx => this.highlightPNode(idx, null, false) }
                            />
                        </Tab.Pane>
                    </Route>
                )
            },
            {
                menuItem: {
                    as: NavLink,
                    content: <Menu.Header>Pre<br />Processor</Menu.Header>,
                    to: `/preprocessor/${props.match.params.fx}`,
                    // exact: true,
                    key: 'preprocessor'
                },
                pane: (
                    <Route path='/preprocessor'>
                        {/* <Header as='h5' textAlign='right' mini block attached={ 'top' } style={ { marginTop: 0 } }>
                            Syntax Analysis
                        </Header> */}
                        <Menu secondary borderless attached={ 'top' } className={ props.classes.tabHeaderFix }>
                            <Menu.Menu position='right'>
                                <div className='ui right aligned category search item'>
                                    Preprocessor Summary
                                </div>
                            </Menu.Menu>
                        </Menu>
                        <Tab.Pane attached={ 'bottom' } key='ast-view'>
                            <PPView
                            // onNodeOver={(idx, node) => this.highlightPNode(idx, node, true)}
                            // onNodeOut={idx => this.highlightPNode(idx, null, false)}
                            />
                        </Tab.Pane>
                    </Route>
                )
            }
        ];

        const defaultActiveIndex = analysisResults.findIndex(pane => {
            return !!matchPath(window.location.pathname, {
                path: pane.menuItem.to,
                exact: false
            });
        });

        const panes = [
            {
                menuItem: (
                    <Menu.Item>
                        Source File
                        <span style={ { fontWeight: 'normal', color: 'rgba(0, 0, 0, 0.6)' } }>
                            &nbsp;|&nbsp;{ path.basename(props.sourceFile.uri || '') }
                        </span>
                    </Menu.Item>
                ),
                render: () => (
                    <Tab.Pane key='source' className={ `${props.classes.containerMarginFix} ${props.classes.mainViewHeightHotfix}` }>
                        <Grid divided={ false }>
                            <Grid.Row columns={ 2 }>
                                <Grid.Column computer='10' tablet='8' mobile='6' className={ props.classes.leftColumnFix }>
                                    <SourceCodeMenu path={ props.match.params } />
                                    <Switch>
                                        {/* TODO: sync all pathes with business logic */ }
                                        <Route path='/playground/:fx/:name/:pass/(vertexshader|pixelshader)'>
                                            <ShaderTranslatorView name='shader-translator-view' />
                                        </Route>
                                        <Route path='/playground/:fx/:name'>
                                            <ShaderTranslatorView name='shader-translator-view' />
                                        </Route>
                                        <Route exact path='/playground/:fx'>
                                            <SourceEditor2 name='source-code' />
                                        </Route>
                                        <Route exact path='/bytecode/:fx'>
                                            <SourceEditor2 name='source-code' />
                                        </Route>
                                        <Route exact path='/program/:fx'>
                                            <SourceEditor2 name='source-code' />
                                        </Route>
                                        <Route exact path='/ast/:fx'>
                                            <SourceEditor2 name='source-code' />
                                        </Route>
                                        <Route exact path='/preprocessor/:fx'>
                                            <SourceEditor2 name='source-code' />
                                        </Route>
                                    </Switch>
                                </Grid.Column>
                                <Grid.Column computer='6' tablet='8' mobile='10' className={ props.classes.rightColumnFix }>
                                    <Container>
                                        <Tab
                                            defaultActiveIndex={ defaultActiveIndex }
                                            menu={ {
                                                attached: false, secondary: true, pointing: false,
                                                size: 'mini', className: props.classes.mainMenu
                                            } }
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
                menuItem: (
                    <Menu.Item key='ver' position='right' inverted disabled color='red'>
                        <Version classes={ props.classes } />
                    </Menu.Item>),
                render: () => null
            }
        ];

        return (
            <div className={ props.classes.mainContentHotfix }>
                <Sidebar.Pushable>
                    <Sidebar
                        as={ Segment }
                        animation='overlay'
                        vertical
                        visible={ this.state.showFileBrowser }
                        className={ this.props.classes.fileBrowserSidebarFix }
                    >
                        <FileListView
                            path='./assets/fx/tests/'
                            filters={ ['.fx'] }
                            onFileClick={ (file) => { history.push(`/${props.match.params.view}/${path.basename(file)}`); } } />
                    </Sidebar>
                    <Sidebar.Pusher dimmed={ this.state.showFileBrowser }>
                        {
                            /*
                                NOTE: "renderActiveOnly" should always be true
                                       because only one instance of Monaco editor
                                       can be used simultaneously
                            */
                        }
                        <Tab
                            menu={ { secondary: true, pointing: true } }
                            panes={ panes }
                            renderActiveOnly={ true }
                            size='tiny'
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



export default connect<{}, {}, IAppProps>(mapProps(getCommon), mapActions({ ...sourceActions, ...routerActions }))(App) as any;
