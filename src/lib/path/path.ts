import { isString, isDef, isNull } from "../common";

class Pathinfo {
    private _dirname: string = null;
    private _extension: string = null;
    private _filename: string = null;

    get path(): string {
        return this.toString();
    }

    set path(path: string) {
        this.set(path);
    }

    get dirname(): string {
        return this._dirname;
    }

    set dirname(dirname: string) {
        this._dirname = dirname;
    }

    get filename(): string {
        return this._filename;
    }

    set filename(filename: string) {
        this._filename = filename;
    }

    get ext(): string {
        return this._extension;
    }

    set ext(extension: string) {
        this._extension = extension;
    }

    get basename(): string {
        return (this._filename ? this._filename + (this._extension ? "." + this._extension : "") : "");
    }

    set basename(basename: string) {
        var nPos: number = basename.lastIndexOf(".");

        if (nPos < 0) {
            this._filename = basename.substr(0);
            this._extension = null;
        }
        else {
            this._filename = basename.substr(0, nPos);
            this._extension = basename.substr(nPos + 1);
        }
    }


    constructor(path: Pathinfo);
    constructor(path: string);
    constructor(path?: any) {
        if (isDef(path)) {
            this.set(<string>path);
        }
    }


    set(path: string): void;
    set(path: Pathinfo): void;
    set(path?: any) {
        if (isString(path)) {
            var pParts: string[] = path.replace('\\', '/').split('/');

            this.basename = (pParts.pop());

            this._dirname = pParts.join('/');
        }
        else if (path instanceof Pathinfo) {
            this._dirname = path.dirname;
            this._filename = path.filename;
            this._extension = path.ext;
        }
        else if (isNull(path)) {
            return null;
        }
        else {
            //critical_error
            throw new Error(`Unexpected data type was used: ${path}`);
        }
    }

    isAbsolute(): boolean { return this._dirname[0] === "/"; }


    toString(): string {
        return (this._dirname ? this._dirname + "/" : "") + (this.basename);
    }
}

function normalizeArray(parts, allowAboveRoot) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === '.') {
            parts.splice(i, 1);
        } else if (last === "..") {
            parts.splice(i, 1);
            up++;
        } else if (up) {
            parts.splice(i, 1);
            up--;
        }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
        for (; up--;) {
            parts.unshift("..");
        }
    }

    return parts;
}


export function normalize(path: string): string {
    var info: Pathinfo = parse(path);
    var isAbsolute: boolean = info.isAbsolute();
    var tail: string = info.dirname;
    var trailingSlash: boolean = /[\\\/]$/.test(tail);

    tail = normalizeArray(tail.split(/[\\\/]+/).filter(function (p) {
        return !!p;
    }), !isAbsolute).join("/");

    if (tail && trailingSlash) {
        tail += "/";
    }

    info.dirname = ((isAbsolute ? "/" : "") + tail);

    return info.toString();
}

export function parse(path: Pathinfo): Pathinfo;
export function parse(path: string): Pathinfo;
export function parse(path?): Pathinfo {
    return new Pathinfo(path);
}
