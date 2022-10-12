import { IMacro } from '@lib/idl/parser/IMacro';
import { IRange } from '@lib/idl/parser/IParser';
import * as path from '@lib/path/path';
import { getCommon, mapProps } from '@sandbox/reducers';
import { mapActions, sourceCode as sourceActions } from '@sandbox/actions';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import withStyles, { WithStylesProps } from 'react-jss';
import { connect } from 'react-redux';
import { Button, Checkbox, Dropdown, Input, List, Popup, Select } from 'semantic-ui-react';

const styles = {
    checkboxTiny: {
        fontSize: '0.92857143em !important',
        lineHeight: '15px !important',
        minWidth: '17px !important',
        transform: 'scale(0.85) !important',
        transformOrigin: 'left !important',
        minHeight: 'auto !important'
    },
    // checkboxTinyChanged: {
    //     fontSize: '0.92857143em !important',
    //     lineHeight: '15px !important',
    //     minWidth: '17px !important',
    //     transform: 'scale(0.85) !important',
    //     transformOrigin: 'left !important',
    //     minHeight: 'auto !important',
    //     fontWeight: 'bold'
    // }
    tipFix: {
        transform: 'scale(0.85) !important',
        display: 'inline-block',
        position: 'relative',
        left: '-11%'
    }
};

export interface IPPViewProps extends IStoreState, Partial<WithStylesProps<typeof styles>> {
    actions: typeof sourceActions;
}

class PPView extends React.Component<IPPViewProps, {}> {
    declare state: {
        // nodeStats: IMap<{ opened: boolean; selected: boolean; }>;
        showIncludes: boolean;
        showMacros: boolean;
        showMacrosOther: boolean;
        showUnreachableCode: boolean;

        filter: string;
    };

    rootRef: React.RefObject<HTMLDivElement>;

    constructor(props: IPPViewProps) {
        super(props);
        this.state = {
            showIncludes: false,
            showMacros: true,
            showMacrosOther: false,
            showUnreachableCode: false,
            filter: null
        };

        this.rootRef = React.createRef();
    }

    render(): JSX.Element {
        const slastDocument = this.props.sourceFile.slastDocument;

        if (!slastDocument) {
            return null;
        }

        const includes = slastDocument.includes;
        const macros = slastDocument.macros;
        const unresolvedMacros = slastDocument.unresolvedMacros;
        const unreachableCode = slastDocument.unreachableCode;

        const { showIncludes, showMacros, showUnreachableCode } = this.state;

        const style = {
            height: 'calc(100vh - 205px)',
            overflowY: 'auto'
        };


        return (
            <div ref={this.rootRef}>
                <Input
                    size='small'
                    iconPosition='left'
                    placeholder='Filter...'
                    onChange={(e) => { this.setState({ filter: e.target.value }) }}
                />
                <List style={style} selection size='small' className='astlist' >
                    <List.Item key={`pp-include-list`} className='astnode'
                        onClick={this.handleIncludesClick}
                    >
                        <List.Icon name={(showIncludes ? `chevron down` : `chevron right`)} />
                        <List.Content>
                            <List.Header>{'Include list'}</List.Header>
                            {this.renderIncludes([...includes.keys()])}
                        </List.Content>
                    </List.Item>
                    <List.Item key={`pp-macros`} className='astnode'
                        onClick={this.handleMacrosClick}
                    >
                        <List.Icon name={(showMacros ? `chevron down` : `chevron right`)} />
                        <List.Content>
                            <List.Header>{'Macro list'}</List.Header>
                            {this.renderMacros(macros.concat(unresolvedMacros).sort((a, b) => a.name.localeCompare(b.name)))}
                        </List.Content>
                    </List.Item>
                    <List.Item key={`pp-unreachable-code`} className='astnode'
                        onClick={this.handleUnreachableCodeClick}
                    >
                        <List.Icon name={(showUnreachableCode ? `chevron down` : `chevron right`)} />
                        <List.Content>
                            <List.Header>{'Unreachable regions'}</List.Header>
                            {this.renderUnreachableRegions(unreachableCode)}
                        </List.Content>
                    </List.Item>
                </List>
            </div>
        );
    }


    renderIncludes(includes: string[]): JSX.Element {
        if (!this.state.showIncludes) {
            return null;
        }

        const items = includes.map((filename, i) => (
            <List.Item key={`pp-include-${i}`}
                // onClick={ this.handleNodeClick.bind(this, idx, node) }
                // onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                // onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                className='astnode'
            >
                <List.Content>
                    {/* <List.Header>{ filename }</List.Header> */}
                    <List.Description>{path.normalize(filename)}</List.Description>
                </List.Content>
            </List.Item>
        ));

        return (
            <List.List className='astlist'>
                {items}
            </List.List>
        );
    }

    @autobind
    handleBoolMacroClick(macro: IMacro, checked: boolean) {
        if (checked) this.props.actions.setDefine(macro.name);
        else this.props.actions.removeDefine(macro.name);
    }


    renderMacros(macros: IMacro[]): JSX.Element {
        if (!this.state.showMacros) {
            return null;
        }

        if (macros.length === 0) {
            return null;
        }

        const { showMacrosOther } = this.state;
        const { sourceFile } = this.props;
        const filter = this.state.filter?.toLowerCase();

        const doFilter = (value) => !filter || (value.toLowerCase()).indexOf(filter) !== -1;

        return (
            <List.List className='astlist'>
                {
                    macros.filter(macro => macro.bRegionExpr && doFilter(macro.name)).map((macro, i) => (
                        <List.Item key={`pp-macro-${i}`}
                            // onClick={ this.handleNodeClick.bind(this, idx, node) }
                            // onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                            // onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                            className='astnode'
                        >
                            <List.Content>
                                {/* <List.Header>{ filename }</List.Header> */}
                                <List.Description>
                                    <Checkbox 
                                        label={macro.name} 
                                        checked={!!macro.tokens}
                                        disabled={!!macro.tokens && !sourceFile.defines.find(def => def === macro.name)}
                                        onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                this.handleBoolMacroClick(macro, !macro.tokens);
                                            }
                                        }
                                        className={this.props.classes.checkboxTiny} />

                                        { (macro.tokens?.length > 0) && 
                                            <Popup inverted
                                                    content={<span>{`${macro.name}${macro.params ? `(${macro.params.join(' ,')})` : ``} ${(macro.tokens || []).map(tk => tk.value).join(' ')}`}</span>}
                                                    trigger={<span className={this.props.classes.tipFix} >{`(?)`}</span>} 
                                                />
                                        }
                                </List.Description>
                            </List.Content>
                        </List.Item>
                    ))
                }
                <List.Item key={`pp-macros-other`} className='astnode'
                    onClick={this.handleMacrosOtherClick}
                >
                    <List.Icon name={(showMacrosOther ? `chevron down` : `chevron right`)} />
                    <List.Content>
                        <List.Header>{'other...'}</List.Header>
                        {
                            showMacrosOther &&
                            macros.filter(macro => !macro.bRegionExpr && doFilter(macro.name)).map((macro, i) => (
                                <List.Item key={`pp-macro-${i}`}
                                    // onClick={ this.handleNodeClick.bind(this, idx, node) }
                                    // onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                                    // onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                                    className='astnode'
                                >
                                    <List.Content>
                                        {/* <List.Header>{ filename }</List.Header> */}
                                        <List.Description>
                                            <Popup inverted
                                                content={<span>{`${macro.name}${macro.params ? `(${macro.params.join(' ,')})` : ``} ${(macro.tokens || []).map(tk => tk.value).join(' ')}`}</span>}
                                                trigger={<span>{`${macro.name}`}</span>} />
                                        </List.Description>
                                    </List.Content>
                                </List.Item>
                            ))
                        }
                    </List.Content>
                </List.Item>
            </List.List>
        );
    }


    renderUnreachableRegions(regions: IRange[]): JSX.Element {
        if (!this.state.showUnreachableCode) {
            return null;
        }

        const items = regions.map(({ start, end }, i) => (
            <List.Item key={`pp-include-${i}`}
                // onClick={ this.handleNodeClick.bind(this, idx, node) }
                // onMouseOver={ this.handleNodeOver.bind(this, idx, node) }
                // onMouseOut={ this.handleNodeOut.bind(this, idx, node) }
                className='astnode'
            >
                <List.Content>
                    {/* <List.Header>{ filename }</List.Header> */}
                    <List.Description>{path.parse(start.file.toString()).filename}{` (${start.line} - ${end.line})`}</List.Description>
                </List.Content>
            </List.Item>
        ));

        return (
            <List.List className='astlist'>
                {items}
            </List.List>
        );
    }


    @autobind
    handleIncludesClick(e: React.MouseEvent<HTMLAnchorElement>): void {
        e.stopPropagation();
        const { showIncludes } = this.state;
        this.setState({ showIncludes: !showIncludes });
    }


    @autobind
    handleUnreachableCodeClick(e: React.MouseEvent<HTMLAnchorElement>): void {
        e.stopPropagation();
        const { showUnreachableCode } = this.state;
        this.setState({ showUnreachableCode: !showUnreachableCode });
    }


    @autobind
    handleMacrosOtherClick(e: React.MouseEvent<HTMLAnchorElement>): void {
        e.stopPropagation();
        const { showMacrosOther } = this.state;
        this.setState({ showMacrosOther: !showMacrosOther });
    }


    @autobind
    handleMacrosClick(e: React.MouseEvent<HTMLAnchorElement>): void {
        e.stopPropagation();
        const { showMacros } = this.state;
        this.setState({ showMacros: !showMacros });
    }
}

export default connect<{}, {}, IPPViewProps>(mapProps(getCommon), mapActions(sourceActions))(withStyles(styles)(PPView)) as any;