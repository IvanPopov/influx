/* tslint:disable:typedef */

import { mapActions, nodes as nodesActions, sourceCode as sourceActions } from '@sandbox/actions';
import { getCommon, mapProps } from '@sandbox/reducers';
import IStoreState from '@sandbox/store/IStoreState';
import autobind from 'autobind-decorator';
import { LGraph, LGraphCanvas, LGraphNode, LiteGraph } from 'litegraph.js';
import 'litegraph.js/css/litegraph.css';
import * as React from 'react';
import withStyles, { WithStylesProps } from 'react-jss';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import './graph';

import '@sandbox/styles/custom/fonts/OpenSans/stylesheet.css';


// LiteGraph.debug = true;
LiteGraph.catch_exceptions = true;
LiteGraph.throw_errors = true;
LiteGraph.allow_scripts = false; //if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration); which could lead to exploits
LiteGraph.NODE_TITLE_HEIGHT = 26;
LiteGraph.NODE_TITLE_TEXT_Y = 18;
LiteGraph.NODE_DEFAULT_COLOR = 'rgba(72, 201, 176, 0.5)';
LiteGraph.NODE_DEFAULT_BGCOLOR = 'rgba(112, 123, 124, 0.5)';
LiteGraph.NODE_DEFAULT_BOXCOLOR = 'rgba(255, 0, 0, 0.0)';


// LiteGraph.NODE_TEXT_COLOR = 'rgba(255,255,255,0.75)';
// LiteGraph.LINK_COLOR = 'red';
// LiteGraph.EVENT_LINK_COLOR = 'red';
// LiteGraph.CONNECTING_LINK_COLOR = 'red';

// typescript bindding looks incomplete
let LiteGraphA = LiteGraph as any;
LiteGraphA.searchbox_extras = {};                           //used to add extra features to the search box
LiteGraphA.auto_sort_node_types = true;                     // [true!] If set to true; will automatically sort node types / categories in the context menus
LiteGraphA.node_box_coloured_when_on = true;                // [true!] this make the nodes box (top left circle) coloured when triggered (execute/action); visual feedback
LiteGraphA.node_box_coloured_by_mode = true;                // [true!] nodebox based on node mode; visual feedback
LiteGraphA.dialog_close_on_mouse_leave = true;              // [false on mobile] better true if not touch device;
LiteGraphA.dialog_close_on_mouse_leave_delay = 500;
LiteGraphA.shift_click_do_break_link_from = false;          // [false!] prefer false if results too easy to break links
LiteGraphA.click_do_break_link_to = false;                  // [false!]prefer false; way too easy to break links
LiteGraphA.search_hide_on_mouse_leave = true;               // [false on mobile] better true if not touch device;
LiteGraphA.search_filter_enabled = true;                    // [true!] enable filtering slots type in the search widget; !requires auto_load_slot_types or manual set registered_slot_[in/out]_types and slot_types_[in/out]
LiteGraphA.search_show_all_on_open = true;                  // [true!] opens the results list when opening the search widget

LiteGraphA.auto_load_slot_types = true;                     // [if want false; use true; run; get vars values to be statically set; than disable] nodes types and nodeclass association with node types need to be calculated; if dont want this; calculate once and set registered_slot_[in/out]_types and slot_types_[in/out]
/*
// set these values if not using auto_load_slot_types
LiteGraphA.registered_slot_in_types = {};                   // slot types for nodeclass
LiteGraphA.registered_slot_out_types = {};                  // slot types for nodeclass
LiteGraphA.slot_types_in = [];                              // slot types IN
LiteGraphA.slot_types_out = [];                             // slot types OUT
*/

LiteGraphA.alt_drag_do_clone_nodes = true;                  // [true!] very handy; ALT click to clone and drag the new node
LiteGraphA.do_add_triggers_slots = true;                    // [true!] will create and connect event slots when using action/events connections; !WILL CHANGE node mode when using onTrigger (enable mode colors); onExecuted does not need this
LiteGraphA.allow_multi_output_for_events = false;           // [false!] being events; it is strongly reccomended to use them sequentually; one by one
LiteGraphA.middle_click_slot_add_default_node = true;       // [true!] allows to create and connect a ndoe clicking with the third button (wheel)
LiteGraphA.release_link_on_empty_shows_menu = true;         // [true!] dragging a link to empty space will open a menu, add from list, search or defaults
LiteGraphA.pointerevents_method = "mouse";                  // "mouse"|"pointer" use mouse for retrocompatibility issues? (none found @ now)

LiteGraphA.middle_click_canvas_dragging = true;


const styles = {
    sizing: {
        width: '100%',
        height: 'calc(100vh - 67px)',
        background: '#333'
    }
};


interface IGraphViewProps extends IStoreState, RouteComponentProps, Partial<WithStylesProps<typeof styles>> {
    actions: typeof nodesActions & typeof sourceActions;
}

@(withRouter as any)
class GraphView extends React.Component<IGraphViewProps> {
    canvas: LGraphCanvas;

    canvasRef: React.RefObject<HTMLCanvasElement>;
    divRef: React.RefObject<HTMLDivElement>;

    spawnRoutine: LGraphNode;

    get graph(): LGraph {
        return this.props.nodes.graph;
    }

    constructor(props: IGraphViewProps) {
        super(props);

        this.canvasRef = React.createRef();
        this.divRef = React.createRef();
    }

    setupCanvas() {
        this.canvas = new LGraphCanvas("#node-graph-canvas", this.graph);
        this.canvas.show_info = true;
        // this.canvas.use_gradients = true;
        this.canvas.allow_reconnect_links = true;
        this.canvas.links_render_mode = LiteGraph.LINEAR_LINK;
        this.canvas.round_radius = 4;
        this.canvas.render_link_tooltip = false;
        this.canvas.render_link_center = false;
        this.canvas.over_link_center = null;
        this.canvas.title_text_font = "13px 'Open Sans'";
        this.canvas.inner_text_font = "13px 'Open Sans'";
        this.canvas.node_title_color = 'rgba(255,255,255,0.75)';
        this.canvas.title_shadow_blur = 4;
        this.canvas.title_shadow_offset_x = 1;
        this.canvas.title_shadow_offset_y = 1;
        this.canvas.title_shadow_color = '#111';
    }


    setupTypesColoring() {
        const palette = { 
            "Cadet Blue": "#51a3a3", 
            "Steel Teal": "#5A8D92",
            "Slate Gray": "#637681", 
            "Old Lavender": "#6c5f70", 
            "Eggplant": "#75485e", 
            "Blast Off Bronze": "#a06c56",
            "Persian Orange": "#cb904d", 
            "Sunray": "#d5ae61", 
            "Arylide Yellow": "#dfcc74", 
            "Yellow Green Crayola": "#c3e991" 
        };

        (this.canvas as any).default_connection_color_byType = {
            uint: palette["Cadet Blue"],
            int: palette["Steel Teal"],
            int2: palette["Slate Gray"],
            bool: palette["Old Lavender"],
            float: palette["Eggplant"],
            float2: palette["Blast Off Bronze"],
            float3: palette["Sunray"],
            float4: palette["Arylide Yellow"]
        };
    }

    setupListeners() {
        // (this.canvas as any).onAfterChange = () => { console.log('canvas change detected!'); }
        // (this.graph as any).onAfterChange = () => { console.log('graph change detected!'); }
        // (this.canvas as any).onNodeConnectionChange = () => { console.log('canvas connection change detected!'); }
        // (this.graph as any).onNodeConnectionChange = () => { console.log('graph connection change detected!'); }
        // (this.canvas as any).onBeforeChange = () => { console.log('canvas b change detected!'); }
        // (this.graph as any).onBeforeChange = () => { console.log('graph b change detected!'); }

        // todo: move to redux logic
        // notify store that graph have to be update
        (this.graph as any).onNodeConnectionChange = () => { this.execute(); }
        (this.graph as any).onAfterChange = () => { this.changed(); }
    }

    componentDidMount() {
        this.setupCanvas();
        this.setupTypesColoring();
        this.setupListeners();

        // execute graph on ctrl+enter
        document.addEventListener('keypress', this.onKeypress);
        
        // draw graph of correct size
        window.addEventListener('resize', this.onWindowResize, false);
        this.onWindowResize();

        // trick to force redraw when font is loaded
        document.fonts.onloadingdone = () => {
            if (document.fonts.check("13px 'Open Sans'")) {
                this.canvas.draw(true, true);
            }
        };

        // IP: fix of unknown problem with keydown event which doen't work without this magic.
        this.canvasRef.current.setAttribute("tabindex", '0');
    }

    @autobind
    onKeypress(e: KeyboardEvent) {
        // ctrl+enter
        if (e.ctrlKey && e.keyCode == 10) {
            e.preventDefault();
            this.execute();
        }
    }

    @autobind
    execute()
    {
        this.props.actions.recompile();
    }

    @autobind
    changed()
    {
        this.props.actions.changed();
    }

    @autobind
    onWindowResize() {
        this.canvas.resize();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onWindowResize, false);
        document.removeEventListener('keypress', this.onKeypress);
    }

    render(): JSX.Element {
        return (
            <div
                ref={this.divRef}
                className={`litegraph  ${this.props.classes.sizing}`}
            >
                <canvas
                    ref={this.canvasRef}
                    id='node-graph-canvas'
                >
                </canvas>
                {/* <div className="litegraph dialog settings" id="node-panel"></div> */}
            </div>
        );
    }
}

export default connect<{}, {}, IGraphViewProps>(mapProps(getCommon), mapActions({ ...nodesActions, ...sourceActions }))(withStyles(styles)(GraphView)) as any;
