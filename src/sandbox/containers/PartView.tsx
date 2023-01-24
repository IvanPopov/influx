import { isArray, isBoolean, isNumber } from '@lib/common';
import autobind from 'autobind-decorator';
import React from 'react';
import { Checkbox, Grid, Menu, Segment, Table, Input } from 'semantic-ui-react';

const style: React.CSSProperties = {
    height: 'calc(100vh)',
    width: 'calc(100vw)',
    position: 'relative',
    left: '0',
    right: '0',
    margin: '0',
    background: 'rgba(255, 0, 0, 0.5)'
};

const monofont: React.CSSProperties = {
    fontFamily: 'consolas',
    width: '100%'
};

interface IProps { };

function renderValue(value: any) {
    if (isBoolean(value)) {
        return value ? 'true' : 'false';
    }
    if (isArray(value)) {
        return value.map(x => renderValue(x));
    }
    if (isNumber(value)) {
        if (Number(value) !== Math.floor(value))
            return (<span> {Number(value).toFixed(2)}</span>);
    }
    return value;
}

function sortByColumn(data, column) {
    if (!column) return data;
    return data.sort((a, b) => {
        if (a[column] < b[column]) {
            return -1;
        }
        if (a[column] > b[column]) {
            return 1;
        }
        return 0;
    });
}

function reducer(state, action) {
    switch (action.type) {
        case 'CHANGE_SORT':
            if (state.column === action.column) {
                return {
                    ...state,
                    data: state.data.slice().reverse(),
                    direction:
                        state.direction === 'ascending' ? 'descending' : 'ascending',
                }
            }

            return {
                column: action.column,
                // data: _.sortBy(state.data, [action.column]),
                data: state.data.sort((a, b) => {
                    if (a[action.column] < b[action.column]) {
                        return -1;
                    }
                    if (a[action.column] > b[action.column]) {
                        return 1;
                    }
                    return 0;
                }),
                direction: 'ascending',
            }
        default:
            throw new Error()
    }
}

class TableSortable extends React.Component<{ tableData: Array<Object> }> {
    state;

    constructor(props) {
        super(props);

        this.state = {
            column: null,
            data: props.tableData,
            direction: null,
            counter: 0
        };
    }

    reduce(action) {
        this.setState(reducer(this.state, action));
    }

    // shouldComponentUpdate(nextProps: Readonly<{ tableData: Array<Object>; }>, nextState: Readonly<{}>, nextContext: any): boolean {
    //     console.log('yeah!');
    //     return true;
    // }

    // componentDidUpdate() {
    //     this.setState({ ...this.state });
    // }

    static getDerivedStateFromProps(props, state) {
        return { ...state, data: sortByColumn(props.tableData, state.column) };
    }

    render() {
        const { column, data, direction } = this.state

        if (!data) {
            return null;
        }

        const columns = Object.keys(data[0]);
        return (
            <Table attached='bottom' sortable celled fixed compact unstackable style={monofont}>
                <Table.Header>
                    <Table.Row>
                        {columns.map(name =>
                            <Table.HeaderCell
                                sorted={column === name ? direction : null}
                                onClick={() => this.reduce({ type: 'CHANGE_SORT', column: name })} >
                                {name}
                            </Table.HeaderCell>)}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {
                        data.map(part =>
                            <Table.Row>
                                {columns.map(name => <Table.Cell>{renderValue(part[name])}</Table.Cell>)}
                            </Table.Row>)
                    }
                </Table.Body>
            </Table>
        );
    }
}

class PartView extends React.Component<IProps> {

    bc: BroadcastChannel = new BroadcastChannel(PartView.CHANNEL);
    particles: Array<Object> = null;
    updateInterval = null;

    state: {
        autoUpdate: boolean,
        updateInterval: number
    };

    constructor(props) {
        super(props);

        this.bc.onmessage = (event) => this.updateContent(event.data);
        window.addEventListener('beforeunload', this.disconnected);

        this.state = {
            autoUpdate: false,
            updateInterval: 100
        };

        this.setAutoUpdate(this.state.autoUpdate, this.state.updateInterval);
    }

    @autobind
    requestUpdate() {
        this.bc.postMessage(PartView.UPDATE_EVENT);
    }

    @autobind
    connected() {
        this.bc.postMessage(PartView.CONNECT_EVENT);
    }

    @autobind
    disconnected() {
        this.bc.postMessage(PartView.DISCONNECT_EVENT);
    }

    updateContent(particles: Array<Object>) {
        this.particles = particles;
        this.forceUpdate();
    }

    componentDidMount(): void {
        this.connected();
    }

    componentWillUnmount(): void {
        this.disconnected()
    }

    setAutoUpdate(isset: boolean, int: number) {
        if (!isset) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        } else {
            this.updateInterval = setInterval(this.requestUpdate, int);
        }
    }

    onAutoUpdate(isset: boolean) {
        this.setAutoUpdate(isset, this.state.updateInterval);
        this.setState({ autoUpdate: isset })
    }

    onIntervalUpdate(int: number) {
        this.setAutoUpdate(this.state.autoUpdate, int);
        this.setState({ updateInterval: int });
    }

    render() {
        if (!isArray(this.particles) || !this.particles.length) {
            return (<div style={style}>No data has been provided.</div>);
        }

        return (
            <div>
                <Menu attached='top' size='tiny' style={{ width: '100%' }}>
                    <Menu.Item>
                        <Checkbox checked={this.state.autoUpdate} label='Update&nbsp;every' onChange={(e, data) => this.onAutoUpdate(data.checked)} />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        <Input defaultValue={this.state.updateInterval} onChange={(e, data) => this.onIntervalUpdate(Number(data.value))} />
                        &nbsp;ms
                    </Menu.Item>
                </Menu>

                <TableSortable tableData={this.particles} />

            </div>
        );
    }

    static CHANNEL = 'part-view-debugger';
    static CONNECT_EVENT = 'connected';
    static DISCONNECT_EVENT = 'disconnected';
    static UPDATE_EVENT = 'update';
}

export default PartView;
