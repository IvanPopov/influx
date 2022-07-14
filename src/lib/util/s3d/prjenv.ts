import * as fs from "fs";
import * as path from "path";
import * as type from "@lib/common";

function ReadFile(filename: string) {
    return fs.readFileSync(filename, 'utf8');
}

function IsFileExists(filename: string) {
    return fs.existsSync(filename);
}

function IsDirectory(filename: string) {
    return fs.lstatSync(filename).isDirectory();
}

export class ProjectEnv {
    // static ApplicationSettingsTpl = "scope/{0}";
    static DefaultProjectName = ".project";
    static DefaultSubprojectName = ".subproject";
    static LocalProjectSuffix = "-local";

    props: Object = {};

    constructor(projectPath: string) {
        this.Load(projectPath);
    }

    Load(projectPath: string) {
        this.LoadPrjenv(path.join(projectPath, ProjectEnv.DefaultProjectName));
    }

    static IsLocal(filename: string) {
        return filename.substr(-ProjectEnv.LocalProjectSuffix.length) == ProjectEnv.LocalProjectSuffix;
    }

    static IsDefault(filename: string) {
        return filename.substr(-ProjectEnv.DefaultProjectName.length) == ProjectEnv.DefaultProjectName;
    }

    private LoadPrjenv(filename: string) {
        if (!IsFileExists(filename)) {
            if (!ProjectEnv.IsLocal(filename)) {
                console.error(`could not find project env file '${path.normalize(filename)}'`);
            }
            return;
        }

        if (IsDirectory(filename)) {
            return this.LoadPrjenv(path.join(filename, ProjectEnv.DefaultSubprojectName));
        }

        if (ProjectEnv.IsDefault(filename)) {
            this.props[`project-dir`] = path.dirname(filename);
            this.props[`project-name`] = path.basename(this.props[`project-dir`]);
        }

        let prjenv = require("js-yaml").load(ReadFile(filename));

        if (!prjenv) {
            console.error(`could not read prjenv: ${filename}`);
            return;
        }

        this.ReadProperties(prjenv, this.props, filename);

        if (!ProjectEnv.IsLocal(filename)) {
            this.LoadPrjenv(filename + ProjectEnv.LocalProjectSuffix);
        }
    }

    private ReadProperties(prjenv: Object, dest: Object, filename: string) {
        if (!prjenv) {
            return;
        }

        Object.keys(prjenv).forEach((propName: string) => {
            if (propName == 'references') {
                return;
            }

            let prop = prjenv[propName];

            if (type.isString(prop) || type.isNumber(prop) || type.isBoolean(prop)) {
                dest[propName] = prop;
            } else if (type.isArray(prop)) {
                dest[propName] = dest[propName] || [];

                (prop as Array<any>).forEach((val: string) => {
                    dest[propName].push(val);
                });
            } else {
                // TODO: remove this workaround for scopes
                if (propName == 'scope' && dest[propName]) {
                    return;
                }

                dest[propName] = dest[propName] || {};
                this.ReadProperties(prop, dest[propName], filename);
            }
        });

        this.LoadReferences(prjenv, path.dirname(filename));
    }

    private LoadReferences(prjenv: Object, cwd: string) {
        let references: Array<any> = prjenv['references'];

        if (references) {
            references.forEach((ref: any) => {
                if (type.isString(ref)) {
                    this.LoadPrjenv(path.join(cwd, ref));
                } else if (type.isObject(ref)) {
                    Object.keys(ref).forEach((refName: string) => {
                        if (type.isString(ref[refName])) {
                            let prjenvPath = path.join(cwd, ref[refName]);

                            if (IsFileExists(prjenvPath))
                            {
                                // creating inner reference dir name
                                this.props[`${refName}-dir`] = IsDirectory(prjenvPath) ? path.normalize(prjenvPath) : path.dirname(prjenvPath);
                                this.LoadPrjenv(path.join(cwd, ref[refName]));
                            } else {
                                console.warn(`Reference '${prjenvPath}' is not found.`);
                            }
                        }
                    });
                }
            });
        }
    }

    Get(propName: string) {
        // convert from 'root/subdir/path' to '$(root)/subdir/path'
        let parts = propName.split(/[\\\/]/);
        parts[0] = `$(${parts[0]})`;
        return this.Resolve(parts.join('/'));
    }

    private Resolve(val: any) {
        if (type.isArray(val)) {
            val = val.map((v: any) => {
                return this.Resolve(v);
            });
            return val;
        }

        if (type.isObject(val)) {
            Object.keys(val).forEach((key: string) => {
                val[key] = this.Resolve(val[key]);
            });
            return val;
        }

        if (type.isNumber(val)) {
            return val;
        }

        let parts = val.split(/[\\\/]/);

        // handle as path
        if (parts.length > 1) {
            let prop = this.ResolveObject(parts[0]);

            // assemble as string path
            if (type.isString(prop)) {
                for (let i = 1; i < parts.length; ++i) {
                    prop = path.join(prop, this.ResolveString(parts[i]));
                }
                return path.normalize(prop);
            }

            if (!prop) {
                console.error(`could not resolve '${parts[0]}'`);
                return val;
            }

            // load from object
            for (let i = 1; i < parts.length; ++i) {
                prop = prop[this.ResolveString(parts[i])];
            }

            return prop;
        }

        return this.ResolveObject(val);
    }


    private ResolveString(val: string) {
        try {
            return val.replace(/\$\(([\w\d\-\_]+)\)/g, (match, propName: string) => {
                let pices = propName.split('/');

                let prop: any = this.props;
                while (pices.length) {
                    prop = prop[pices.shift()];
                }

                if (type.isString(prop) || type.isNumber(prop)) {
                    return prop as string;
                }

                console.error(`could not resolve '${propName}' property`);
                throw null;
            });
        } catch (e) { }

        return val;
    }

    private ResolveObject(val: string) {
        try {
            let m = val.match(/^\$\(([\w\d\-\_]+)\)$/);

            if (m) {
                return this.Resolve(this.props[m[1]]);
            }

            return this.ResolveString(val);
        } catch (e) { }
        return val;
    }
}

