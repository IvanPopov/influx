import { exec } from "child_process";
import * as React from "react";
// import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';


import p4 from 'node-perforce';


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

export function edit(changelist, file, cb: () => void) {
    if (changelist < 0) return cb();

    p4.edit({ changelist: changelist, files: [file] }, function (err) {
        if (err) {
            // MessageBox('Error:: Could not add files to p4 changelist. See console for details.', { type: 'warning' });
            return console.error(err);
        }

        cb();
    });
}

export function add(changelist, file, cb: () => void) {
    p4.add({ changelist: changelist, files: [file] }, function (err) {
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

export function revert(file: string, cb: () => void) {
    p4.revert({files: [ file ]}, function(err) {
        if (err) return console.log(err);
        cb();
    });
}
