/* tslint:disable:typedef */

import { isNumber } from '@lib/common';
import { getCommon, mapProps, matchLocation } from '@sandbox/reducers';
import { filterPartFx, getFileState, getScope } from '@sandbox/reducers/sourceFile';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import withStyles, { WithStylesProps } from 'react-jss';
import { LiteGraph, LGraph, LGraphCanvas } from 'litegraph.js'

import 'litegraph.js/css/litegraph.css'
// import backgroundImage from 'litegraph.js/';


LiteGraph.debug = true;
LiteGraph.catch_exceptions = true;
LiteGraph.throw_errors = true;
LiteGraph.allow_scripts = false; //if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration); which could lead to exploits


// typescript bindding looks incomplete
let LiteGraphA = LiteGraph as any;
LiteGraphA.searchbox_extras = {}; //used to add extra features to the search box
LiteGraphA.auto_sort_node_types = true; // [true!] If set to true; will automatically sort node types / categories in the context menus
LiteGraphA.node_box_coloured_when_on = true; // [true!] this make the nodes box (top left circle) coloured when triggered (execute/action); visual feedback
LiteGraphA.node_box_coloured_by_mode = true; // [true!] nodebox based on node mode; visual feedback
LiteGraphA.dialog_close_on_mouse_leave = true; // [false on mobile] better true if not touch device;
LiteGraphA.dialog_close_on_mouse_leave_delay = 500;
LiteGraphA.shift_click_do_break_link_from = false; // [false!] prefer false if results too easy to break links
LiteGraphA.click_do_break_link_to = false; // [false!]prefer false; way too easy to break links
LiteGraphA.search_hide_on_mouse_leave = true; // [false on mobile] better true if not touch device;
LiteGraphA.search_filter_enabled = true; // [true!] enable filtering slots type in the search widget; !requires auto_load_slot_types or manual set registered_slot_[in/out]_types and slot_types_[in/out]
LiteGraphA.search_show_all_on_open = true; // [true!] opens the results list when opening the search widget

LiteGraphA.auto_load_slot_types = true; // [if want false; use true; run; get vars values to be statically set; than disable] nodes types and nodeclass association with node types need to be calculated; if dont want this; calculate once and set registered_slot_[in/out]_types and slot_types_[in/out]
/*// set these values if not using auto_load_slot_types
LiteGraphA.registered_slot_in_types = {}; // slot types for nodeclass
LiteGraphA.registered_slot_out_types = {}; // slot types for nodeclass
LiteGraphA.slot_types_in = []; // slot types IN
LiteGraphA.slot_types_out = []; // slot types OUT*/

LiteGraphA.alt_drag_do_clone_nodes = true; // [true!] very handy; ALT click to clone and drag the new node
LiteGraphA.do_add_triggers_slots = true; // [true!] will create and connect event slots when using action/events connections; !WILL CHANGE node mode when using onTrigger (enable mode colors); onExecuted does not need this
LiteGraphA.allow_multi_output_for_events = false; // [false!] being events; it is strongly reccomended to use them sequentually; one by one
LiteGraphA.middle_click_slot_add_default_node = true;  //[true!] allows to create and connect a ndoe clicking with the third button (wheel)
LiteGraphA.release_link_on_empty_shows_menu = true; //[true!] dragging a link to empty space will open a menu, add from list, search or defaults
LiteGraphA.pointerevents_method = "mouse"; // "mouse"|"pointer" use mouse for retrocompatibility issues? (none found @ now)



const styles = {
    sizing: {
        width: '100%',
        height: 'calc(100vh - 67px)',
        background: '#333'
    }
};

interface IGraphViewProps extends IStoreState, RouteComponentProps, Partial<WithStylesProps<typeof styles>> {

}

@(withRouter as any)
class GraphView extends React.Component<IGraphViewProps> {
    graph: LGraph;
    canvas: LGraphCanvas;

    canvasRef: React.RefObject<HTMLCanvasElement>;
    divRef: React.RefObject<HTMLDivElement>;

    constructor(props: IGraphViewProps) {
        super(props);

        this.canvasRef = React.createRef();
        this.divRef = React.createRef();
    }

    componentDidMount()
    {
        this.graph = new LGraph();
        this.canvas = new LGraphCanvas("#node-graph-canvas", this.graph);
        this.canvas.allow_reconnect_links = true;
        this.canvas.links_render_mode = LiteGraph.LINEAR_LINK;
        this.canvas.round_radius = 4;
        // this.canvas.live_mode = true;

        // this.canvas.background_image = "imgs/grid.png";
        // (this.graph as any).onAfterExecute = function() {
        //     this.canvas.draw(true);
        // };

	    // (this.canvas as any).onDropItem = this.onDropItem.bind(this);

        let nodeConst = LiteGraph.createNode("basic/const");
        nodeConst.pos = [200,200];
        this.graph.add(nodeConst);
        nodeConst.setValue(4.5);

        let nodeWatch = LiteGraph.createNode("basic/watch");
        nodeWatch.pos = [700,200];
        this.graph.add(nodeWatch);

        nodeConst.connect(0, nodeWatch, 0 );

        window.addEventListener('resize', this.onWindowResize, false);

        this.onWindowResize();
    }

    @autobind
    onDropItem(e) {
        console.log(e);
    }

    @autobind
    onWindowResize() {
        this.canvas.resize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onWindowResize, false);
    }

    render(): JSX.Element {
        return (
            <div
                ref = {this.divRef} 
                className={ this.props.classes.sizing } 
                >
                <canvas 
                    ref = {this.canvasRef}
                    id='node-graph-canvas' 
                >
                </canvas>
            </div>
        );
    }
}

export default connect<{}, {}, IGraphViewProps>(mapProps(getCommon), null) (withStyles(styles)(GraphView)) as any;

