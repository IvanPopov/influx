import { isString, isNull, isDef } from "../common";
import * as path from "../path/path"
import { IDataURI } from "../idl/IDataURI";

class URI {
    private _scheme: string = null;
    private _userinfo: string = null;
    private _host: string = null;
    private _port: number = 0;
    private _path: string = null;
    private _query: string = null;
    private _fragment: string = null;

    get urn(): string {
        return (this._path ? this._path : "") +
            (this._query ? '?' + this._query : "") +
            (this._fragment ? '#' + this._fragment : "");
    }

    get url(): string {
        return (this._scheme ? this._scheme + '//' : "") + this.authority;
    }

    get authority(): string {
        return (this._host ? (this._userinfo ? this._userinfo + '@' : "") +
            this._host + (this._port ? ':' + this._port : "") : "");
    }

    get scheme(): string {
        return this._scheme;
    }

    get protocol(): string {
        if (!this._scheme) {
            return this._scheme;
        }

        return (this._scheme.substr(0, this._scheme.lastIndexOf(':')));
    }

    get userInfo(): string {
        return this._userinfo;
    }

    get host(): string {
        return this._host;
    }

    set host(sHost: string) {
        //TODO: check host format
        this._host = sHost;
    }

    get port(): number {
        return this._port;
    }

    set port(iPort: number) {
        this._port = iPort;
    }

    get path(): string {
        return this._path;
    }

    set path(sPath: string) {
        // debug_assert(!isNull(sPath.match(new RegExp("^(/(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)$"))), 
        //     "invalid path used: " + sPath);
        //TODO: check path format
        this._path = sPath;
    }

    get query(): string {
        //TODO: check query format
        return this._query;
    }

    set query(sQuery: string) {
        this._query = sQuery;
    }

    get fragment(): string {
        return this._fragment;
    }


    constructor(uri: URI);
    constructor(uri: string);
    constructor(uri?) {
        if (uri) {
            this.set(uri);
        }
    }

    set(uri: URI);
    set(uri: string);
    set(data?): URI {
        if (isString(data)) {
            var uri: RegExpExecArray = URI.uriExp.exec(<string>data);

            console.assert(uri !== null, 'Invalid URI format used.\nused uri: ' + data);

            if (!uri) {
                return null;
            }

            this._scheme = uri[1] || null;
            this._userinfo = uri[2] || null;
            this._host = uri[3] || null;
            this._port = parseInt(uri[4]) || null;
            this._path = uri[5] || uri[6] || null;
            this._query = uri[7] || null;
            this._fragment = uri[8] || null;

            return this;

        }
        else if (data instanceof URI) {
            return this.set(data.toString());
        }

        console.error('Unexpected data type was used.');

        return null;
    }

    toString(): string {
        return this.url + this.urn;
    }

    //------------------------------------------------------------------//
    //----- Validate a URI -----//
    //------------------------------------------------------------------//
    //- The different parts are kept in their own groups and can be recombined
    //  depending on the scheme:
    //  - http as $1://$3:$4$5?$7#$8
    //  - ftp as $1://$2@$3:$4$5
    //  - mailto as $1:$6?$7
    //- groups are as follows:
    //  1   == scheme
    //  2   == userinfo
    //  3   == host
    //  4   == port
    //  5,6 == path (5 if it has an authority, 6 if it doesn't)
    //  7   == query
    //  8   == fragment


    private static uriExp: RegExp = new RegExp("^([a-z0-9+.-]+:)?(?:\\/\\/(?:((?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*)@)?((?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*)(?::(\\d*))?(\\/(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)?|(\\/?(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})*(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)?)(?:\\?((?:[a-z0-9-._~!$&'()*+,;=:/?@]|%[0-9A-F]{2})*))?(?:#((?:[a-z0-9-._~!$&'()*+,;=:/?@]|%[0-9A-F]{2})*))?$", "i");

    /*
     composed as follows:
     ^
     ([a-z0-9+.-]+):                            #scheme
     (?:
     //                            #it has an authority:
     (?:((?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*)@)?    #userinfo
     ((?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*)        #host
     (?::(\d*))?                        #port
     (/(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)?    #path
     |
     #it doesn't have an authority:
     (/?(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})+(?:[a-z0-9-._~!$&'()*+,;=:@/]|%[0-9A-F]{2})*)?    #path
     )
     (?:
     \?((?:[a-z0-9-._~!$&'()*+,;=:/?@]|%[0-9A-F]{2})*)    #query string
     )?
     (?:
     #((?:[a-z0-9-._~!$&'()*+,;=:/?@]|%[0-9A-F]{2})*)    #fragment
     )?
     $
     */
}


function normalizeURIPath(file: URI): URI {
    if (!isNull(file.path)) {
        if (file.scheme === "filesystem:") {
            var uri = parse(file.path);

            uri.path = path.normalize(uri.path);
            file.path = uri.toString();
        }
        else {
            file.path = path.normalize(file.path);
        }
    }

    return file;
}



export function resolve(from: string, to: string = document.location.href): string {
    var currentPath = parse(to);
    var file = parse(from);
    var dirname: string;

    normalizeURIPath(file);
    normalizeURIPath(currentPath);

    if (!isNull(file.scheme) || !isNull(file.host) || path.parse(file.path).isAbsolute()) {
        //another server or absolute path
        return from;
    }

    dirname = path.parse(currentPath.path).dirname;
    currentPath.path = dirname ? (dirname + "/" + from) : from;

    return normalizeURIPath(currentPath).toString();
}


export function parseDataURI(uri: string): IDataURI {
    var re: RegExp = /^data:([\w\d\-\/]+)?(;charset=[\w\d\-]*)?(;base64)?,(.*)$/;
    var m: string[] = uri.match(re);

    return {
        //like [text/plain]
        mediatype: m[1] || null,
        //like [;charset=windows-1251]
        charset: isString(m[2]) ? m[2].substr(9) : null,
        //like [;base64]
        base64: isDef(m[3]),
        data: m[4] || null
    };
}


export function parse(uri: string): URI {
    return new URI(uri);
}


export function currentScript(): HTMLScriptElement {
    if (isDef(document['currentScript'])) {
        return <HTMLScriptElement>document['currentScript'];
    }

    var scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
}


export function currentPath(): string {
    var uri = parse(currentScript().src);
    let dirname = path.parse(uri.path).dirname;
    return uri.url + dirname + "/";
}


export function here(): URI {
    return new URI(document.location.href);
}
