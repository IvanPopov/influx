import { isNull } from '@lib/common';
import * as Bytecode from '@lib/fx/bytecode/Bytecode';
import { cdlview } from '@lib/fx/bytecode/DebugLayout';
import { IInstruction, IInstructionCollector } from '@lib/idl/IInstruction';
import { IParseNode, IParseTree } from '@lib/idl/parser/IParser';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import { ASTView, FileListView, IWithStyles, MemoryView, ProgramView } from '@sandbox/components';
import { BytecodeView, ParserParameters, SourceEditor } from '@sandbox/containers';
import { getCommon, mapProps } from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import * as React from 'react';
import injectSheet from 'react-jss';
import { connect } from 'react-redux';
import { Button, Checkbox, Container, Divider, Grid, Icon, Menu, Segment, Sidebar, Tab } from 'semantic-ui-react';




// process.chdir(`${__dirname}/../../`); // making ./build as cwd

type UnknownIcon = any;

export const styles = {
    sidebarLeftHotfix: {
        width: `79px !important`
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
            zIndex: '1', 
            boxShadow: '0 2px 5px rgba(10,10,10, 0.1) !important' 
        }
    }
}

// todo: remove the inheritance of the type of data
export interface IAppProps extends IStoreState, IWithStyles<typeof styles> {
    actions: typeof sourceActions;
}

@injectSheet(styles)
class App extends React.Component<IAppProps> {

    state: {
        ast: IParseTree;
        root: IInstructionCollector;
        bc: ReturnType<typeof Bytecode['translate']> // todo: fix type deduction;
        showFileBrowser: boolean;
        autocompile: boolean;


    };

    constructor(props) {
        super(props);
        this.state = {
            ast: null,
            root: null,
            bc: null,
            showFileBrowser: false,
            autocompile: false
        };
    }

    handleShowFileBrowser = () => this.setState({ showFileBrowser: !this.state.showFileBrowser })
    hideFileBrowser = () => this.setState({ showFileBrowser: false })

    compile(force: boolean = false) {
        const { state } = this;

        if (!isNull(state.bc) && !force) {
            return;
        }

        if (!isNull(state.root)) {
            this.setState({ bc: Bytecode.translate(Bytecode.DEFAULT_ENTRY_POINT_NAME, state.root) });
        }
    }

    setAutocompile(val: boolean) {
        this.setState({ autocompile: val });

        if (val) {
            this.compile();
        }
    }

    setProgram(root: IInstructionCollector) {
        const { state } = this;
        this.setState({ root, bc: null }, () => {
            if (state.autocompile) {
                this.compile(true);
            }
        });
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


    handleProgramViewUpdate(errors) {
        const { props } = this;

        for (let markerName in props.sourceFile.markers) {
            if (markerName.startsWith('compiler-error-')) {
                props.actions.removeMarker(markerName);
            }
        }

        // todo: add support for multiple errors on the same lines;
        errors.forEach(err => {
            let { loc, message } = err;
            this.props.actions.addMarker({
                name: `compiler-error-${message}`,
                range: loc,
                type: 'error',
                tooltip: message
            })
        })
    }


    validateBreakpoint(ln: number) {
        let { state: { bc } } = this;
        let cdl = bc && bc.cdl;
        if (!cdl) {
            return ln;
        }

        let view = cdlview(cdl);
        return view.placeBreakpoint(ln);
    }

    render() {
        const { props, state } = this;
        // console.log(state.bc && state.bc.cdl);

        const analysisResults = [
            {
                menuItem: (<Menu.Item>Bytecode</Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key="bytecode-view">
                        <Checkbox toggle label='auto compilation' onChange={ (e, data) => this.setAutocompile(data.checked) } />
                        <Divider />
                        { state.bc ? (
                            <div>
                                {/* todo: move memory view inside bytecode view; */ }
                                <MemoryView binaryData={ state.bc.constants.data.byteArray } layout={ state.bc.constants.data.layout } />
                                <BytecodeView code={ new Uint8Array(state.bc.code) } cdl={ state.bc.cdl } />
                            </div>
                        ) : (
                                <Container textAlign="center">
                                    <Button onClick={ () => this.compile() }>Compile</Button>
                                </Container>
                            ) }
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item>semantics<br />analyzer</Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key="program-view">
                        <ProgramView
                            filename={ props.sourceFile.filename }
                            ast={ props.sourceFile.parseTree }

                            onNodeOver={ inst => this.highlightInstruction(inst, true) }
                            onNodeOut={ inst => this.highlightInstruction(inst, false) }
                            onNodeClick={ inst => { } }

                            onUpdate={ errors => this.handleProgramViewUpdate(errors) }
                            onComplete={ (root) => { this.setProgram(root); } }
                        />
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item>syntax<br />analyzer</Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key="ast-view">
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
                menuItem: 'Source File',
                pane: (
                    <Tab.Pane key="source" className={ `${props.classes.containerMarginFix} ${props.classes.mainViewHeightHotfix}` }
                        // fixme: remove style from line below;
                        // as={ ({ ...props }) => <Container fluid { ...props } /> }
                        >
                        <Grid divided={ false }>
                            <Grid.Row columns={ 3 }>
                                <Grid.Column computer="10" tablet="8" mobile="6" >
                                    <SourceEditor
                                        name="source-code"
                                        validateBreakpoint={ line => this.validateBreakpoint(line) }
                                    />
                                </Grid.Column>
                                <Grid.Column computer="6" tablet="8" mobile="10">
                                    <Container style={ { paddingTop: '15px' } }>
                                        <Tab menu={ { secondary: true, size: 'mini' } } panes={ analysisResults } renderActiveOnly={ false } />
                                    </Container>
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </Tab.Pane>
                )
            },
            {
                menuItem: 'Grammar',
                pane: (
                    <Tab.Pane key="grammar">
                        <ParserParameters />
                    </Tab.Pane>
                )
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
                        <FileListView path="./assets" filters={ ['.fx'] } onFileClick={ (file) => { props.actions.openFile(file) } } />
                    </Sidebar>
                    <Sidebar.Pusher dimmed={ this.state.showFileBrowser }>
                    {/* <Container> */}
                        <Tab menu={ { secondary: true, pointing: true } } panes={ panes } renderActiveOnly={ false } 
                            className={ props.classes.topMenuFix } />
                            {/* </Container> */}
                    </Sidebar.Pusher>
                </Sidebar.Pushable>

                <Menu vertical icon='labeled' inverted fixed="left" className={ props.classes.sidebarLeftHotfix }>
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
