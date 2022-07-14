import { exec } from "child_process";
import * as React from "react";
// import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';


const p4 = require("node-perforce");

// const { dialog } = require('electron');

// function MessageBox(message, opt) {
//     var params;

//     if (typeof arguments[0] == "string") {
//         params = opt || {};
//         params.message = message;
//     } else params = arguments[0];

//     params.type = params.type || 'info';
//     params.buttons = params.buttons || ['Ok'];

//     dialog.showMessageBox(params);
// }

// interface P4Props extends React.Props<P4Status> {
//     info: any;
//     config: {
//         p4: boolean;
//     }
// }

// interface P4State {
//     enabled: boolean;
//     message: string;
// }

// export class P4Status extends React.Component<P4Props, P4State> {
//     constructor(props: P4Props, context) {
//         super(props, context);
//         this.state = {
//             enabled: props.config.p4,
//             message: 'Perforce is available.'
//         };
//     }

//     handleClick() {
//         if (this.props.info["Proxy address"]) return; //temp hack

//         let useP4 = !this.state.enabled;
//         this.props.config.p4 = useP4;
//         this.setState({ enabled: useP4, message: 'Perforce is ' + (useP4 ? 'enabled' : 'disabled') + '.' });
//     }

//     render() {
//         return (
//             <div style={{ zIndex: 9999, position: 'fixed', top: '10px', right: '40px' }} onClick={this.handleClick.bind(this)} >
//                 <OverlayTrigger placement="bottom" overlay={
//                     <Tooltip placement="bottom" id="">
//                         <p style={{ textAlign: "left" }}>
//                             {this.state.message}<br />
//                             Current server: <b>{this.props.info["Proxy address"]}</b><br />
//                             User name: <b>{this.props.info["User name"]}</b>
//                         </p>
//                     </Tooltip>
//                 }>
//                     <Button bsStyle={this.state.enabled ? 'primary' : 'default'} className="btn-sm" >
//                         <strong>P4<sub> perforce</sub></strong>
//                     </Button>
//                 </OverlayTrigger>
//             </div>
//         );
//     }
// }

export function run(command: string, done?: (e: Error, stdout: string) => void): Promise<any>;
export function run(command: string, args: string, done?: (e: Error, stdout: string) => void): Promise<any>;
export function run(command: string, args?, done?): Promise<any> {
    if (typeof args === "function") {
        done = args;
        args = "";
    }

    let p4cmd = '"C:\\Program Files\\Perforce\\p4.exe"';

    done = done || ((e: Error, stdout: string) => { });

    return new Promise((resolve, reject) => {
        // console.log(p4cmd + " " + command + " " + (args || ""));
        exec(p4cmd + " " + command + " " + (args || ""), (err, stdOut, stdErr) => {
            if (err) {
                reject(err);
                return done(err);
            }

            if (stdErr) {
                // reject(new Error(stdErr));
                // return done(new Error(stdErr));
                console.warn(stdErr);
                // IP: handle properly
            }

            resolve(stdOut);
            done(null, stdOut);
        });
    });
}

export function addToChangelist(changelist, file, cb: () => void) {
    if (changelist < 0) return cb();

    p4.edit({ changelist: changelist, files: [file] }, function (err) {
        if (err) {
            // MessageBox('Error:: Could not add files to p4 changelist. See console for details.', { type: 'warning' });
            return console.error(err);
        }

        cb();
    });
}

export function createChangelist(description: string, cb: (changelist: number) => void) {
    p4.changelist.create({ description: description }, (e, changelist) => {
        if (e) {
            // MessageBox('Error:: Could not create p4 changelist. See console for details.', { type: 'warning' });
            cb(-1);
            console.error(e);
            return;
        }

        cb(changelist);
    });
}

