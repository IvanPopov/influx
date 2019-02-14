import * as React from 'react';
import { render } from 'react-dom';
import { connect } from 'react-redux';
import { Sidebar, Icon, Menu, Tab, Container, Segment, Grid, Table, Button, Divider, Checkbox } from 'semantic-ui-react'
import injectSheet from 'react-jss'


import { ParserParameters, ASTView, ProgramView, SourceEditor, IWithStyles, FileListView, MemoryView, BytecodeView } from '../components';
import { getCommon, mapProps } from '../reducers';
import IStoreState from '../store/IStoreState';
import { IDispatch, sourceCode as sourceActions, mapActions } from '../actions';
import { IParseTree } from '../../lib/idl/parser/IParser';
import { IInstruction, IScope, IFunctionDeclInstruction, IInstructionCollector } from '../../lib/idl/IInstruction';
import { analyze as analyzeFlow } from '../../lib/fx/CodeFlow'
import { isDefAndNotNull, isNull } from '../../lib/common';

import * as Bytecode from '../../lib/fx/bytecode/Bytecode';
import * as VM from '../../lib/fx/bytecode/VM';

process.chdir(`${__dirname}/../../`); // making ./build as cwd

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
    checkboxTiny: {
        // transform: 'scale(.75)'
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
        scope: IScope;
        root: IInstructionCollector;
        bc: ReturnType<typeof Bytecode['translate']> // todo: fix type deduction;
        showFileBrowser: boolean;
        autocompile: boolean;
    };

    constructor(props) {
        super(props);
        this.state = { 
            ast: null, 
            scope: null, 
            root: null, 
            bc: null,
            showFileBrowser: false, 
            autocompile: false 
        };
    }


    shouldComponentUpdate(nextProps, nextState): boolean {
        const { props, state } = this;

        if (Object.keys(props.sourceFile.markers).length > 0) {
            // cleanup error highlighting before render
            this.props.actions.cleanupMarkers();
            return false;
        }

        return true;
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

    setProgram(scope: IScope, root: IInstructionCollector) {
        const { state } = this;
        this.setState({ scope, root, bc: null }, () => {
            if (state.autocompile) {
                this.compile(true);
            }
        });
    }

    render() {
        const { props, state } = this;
        console.log(state.bc && state.bc.cdl);
        const analysisResults = [
            {
                menuItem: (<Menu.Item>Bytecode</Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key="bytecode-view">
            
                        <Checkbox toggle label='auto compilation' onChange={ (e, data) => this.setAutocompile(data.checked) } className={props.classes.checkboxTiny}/>
                        <Divider />
                        { state.bc ? (
                            <div>
                                <MemoryView binaryData={ state.bc.constants.data.byteArray } layout={state.bc.constants.data.layout} />
                                <BytecodeView code={ new Uint8Array(state.bc.code) } />
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
                menuItem: (<Menu.Item>semantics<br/>analyzer</Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key="program-view">
                        <ProgramView
                            filename={ props.sourceFile.filename }
                            ast={ state.ast }

                            onNodeOver={ (instr: IInstruction) => props.actions.addMarker({
                                name: `ast-range-${instr.instructionID}`,
                                range: instr.sourceNode.loc,
                                type: `marker`
                            }) }
                            onNodeOut={ (instr: IInstruction) => props.actions.removeMarker(`ast-range-${instr.instructionID}`) }
                            onNodeClick={ (instr: IInstruction) => { } }

                            onError={ (range, message) => props.actions.addMarker({ name: `compiler-error-${message}`, range, type: 'error', tooltip: message }) }
                            onComplete= { (scope, root) => { this.setProgram(scope, root); } }
                        />
                    </Tab.Pane>
                )
            },
            {
                menuItem: (<Menu.Item>syntax<br/>analyzer</Menu.Item>),
                pane: (
                    <Tab.Pane attached={ false } key="ast-view">
                        <ASTView
                            filename={ props.sourceFile.filename }
                            parserParams={ props.parserParams }
                            content={ props.sourceFile.content }

                            onNodeOver={ (idx, node) => props.actions.addMarker({
                                name: `ast-range-${idx}`,
                                range: node.loc,
                                type: 'marker'
                            }) }
                            onNodeOut={ idx => props.actions.removeMarker(`ast-range-${idx}`) }
                            onError={ (range, message) => props.actions.addMarker({ name: `syntax-error-${message}`, range, type: 'error', tooltip: message }) }
                            onComplete={ ast => { this.setState({ ast }) } }
                        />
                    </Tab.Pane>
                )
            }
        ];


        const panes = [
            {
                menuItem: 'Source File',
                pane: (
                    <Tab.Pane key="source" className={ props.classes.mainViewHeightHotfix }>
                        <Grid divided={ false }>
                            <Grid.Row columns={ 3 }>
                                <Grid.Column computer="10" tablet="8" mobile="6">
                                    <SourceEditor
                                        name="source-code"
                                        content={ props.sourceFile.content }
                                        onChange={ props.actions.setContent }
                                        markers={ props.sourceFile.markers }
                                    />
                                </Grid.Column>
                                <Grid.Column computer="6" tablet="8" mobile="10">
                                    <Tab menu={ { secondary: true, size: 'mini' } } panes={ analysisResults } renderActiveOnly={ false } />
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
                        <FileListView path="./assets"  filters={ ['.fx'] } onFileClick={ (file) => { props.actions.openFile(file) } }/>
                    </Sidebar>
                    <Sidebar.Pusher dimmed={ this.state.showFileBrowser }>
                        <Container>
                            <Tab menu={ { secondary: true, pointing: true } } panes={ panes } renderActiveOnly={ false } />
                        </Container>
                    </Sidebar.Pusher>
                </Sidebar.Pushable>
                
                <Menu vertical icon='labeled' inverted fixed="left" className={ props.classes.sidebarLeftHotfix }>
                    <Menu.Item name='home' onClick={this.handleShowFileBrowser} >
                        <Icon name={ 'three bars' as UnknownIcon } />
                        File Browser
                    </Menu.Item>
                </Menu>
            </div>
        );
    }
}



export default connect<{}, {}, IAppProps>(mapProps(getCommon), mapActions(sourceActions))(App) as any;
