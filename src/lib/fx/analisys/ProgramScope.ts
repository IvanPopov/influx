import { assert, isDef, isDefAndNotNull, isNull } from "@lib/common";
import { EScopeType, IFunctionDeclInstruction, IScope, ITechniqueInstruction, ITypeInstruction, ITypeTemplate, IVariableDeclInstruction } from "@lib/idl/IInstruction";
import { IMap } from "@lib/idl/IMap";
import { isString } from "@lib/util/s3d/type";

import { fn, type } from "./helpers";

export interface IScopeSettings {
    type?: EScopeType;
    parent?: IScope;
    strictMode?: boolean;
}



export class Scope implements IScope {
    strictMode: boolean;

    readonly parent: IScope;
    readonly type: EScopeType;

    readonly variables: IMap<IVariableDeclInstruction>;
    readonly types: IMap<ITypeInstruction>;
    readonly functions: IMap<IFunctionDeclInstruction[]>;
    readonly techniques: IMap<ITechniqueInstruction>;
    readonly typeTemplates: IMap<ITypeTemplate>;

    constructor(scope: Scope);
    constructor(settings: IScopeSettings);
    constructor(params) {
        let type: EScopeType;
        let strictMode: boolean;
        let parent: IScope;

        if (params instanceof Scope)
        {
            let scope = params as Scope;
            ({ type = EScopeType.k_Default, parent = null, strictMode = false } = scope);

            this.variables = { ...(scope.variables) };
            this.types = { ...scope.types };
            this.functions = { ...scope.functions };
            this.techniques = { ...scope.techniques };
            this.typeTemplates = { ...scope.typeTemplates };
        } 
        else 
        {
            let settings = params as IScopeSettings;
            ({ type = EScopeType.k_Default, parent = null, strictMode = false } = settings);

            this.variables = {};
            this.types = {};
            this.functions = {};
            this.techniques = {};
            this.typeTemplates = {};
        }

        this.type = type;
        this.parent = parent;
        this.strictMode = strictMode;
    }


    isStrict(): boolean {
        return this.filter(scope => scope.strictMode);
    }


    findVariable(varName: string): IVariableDeclInstruction {
        return this.filter(scope => scope.variables[varName] || null);
    }


    findTypeTemplate(typeName: string): ITypeTemplate {
        return this.filter(scope => scope.typeTemplates[typeName] || null);
    }


    findType(typeName: string): ITypeInstruction {
        return this.filter(scope => scope.types[typeName] || null);
    }


    /**
     * Find function by name and list of types.
     * returns:
     *   'null' if there is no requested function; 
     *   'undefined' if there more then one function; 
     *    function if all is ok;
     */
    // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    findFunction(funcName: string, args: Array<ITypeInstruction | RegExp> = null): IFunctionDeclInstruction | null | undefined {
        return this.filter(scope => fn.matchList(scope.functions[funcName], args))
    }


    findTechnique(techName: string): ITechniqueInstruction {
        return this.filter(scope => scope.techniques[techName] || null);
    }


    findFunctionInScope(func: IFunctionDeclInstruction): IFunctionDeclInstruction {
        let res = fn.matchList(this.functions[func.name], func.def.params.map(param => param? param.type : null));
        assert(res !== undefined);
        return res;
    }

    
    addVariable(variable: IVariableDeclInstruction): boolean {
        let variableMap = this.variables;
        let varName = variable.name;

        if (!this.variables[varName]) {
            variableMap[varName] = variable;
            assert(variable.scope === this);
        }
        else {
            // console.error(`letiable '${varName}' already exists in scope:`, this);
            return false;
        }
    
        return true;
    }


    addTypeTemplate(template: ITypeTemplate): boolean {
        if (isDefAndNotNull(this.typeTemplates[template.name])) {
            return false;
        }

        this.typeTemplates[template.name] = template;
        return true;
    }

    // todo: remove scopeId from argumts, use type.scope instead.
    addType(type: ITypeInstruction): boolean {
        if (this.types[type.name]) {
            return false;
        }

        this.types[type.name] = type;
        console.assert(type.scope === this);
        return true;
    }


    addTypeAlias(t: string | ITypeInstruction, aliasName: string): boolean {
        let typeName = null;
        let type = null;

        if (isString(t)) {
            typeName = t;
            type = this.findType(typeName);
        } else {
            type = t;
            typeName = type.name;
        }
        
        const alias = this.findType(aliasName);

        if (alias) {
            return false;
        }

        if (!type) {
            return false;
        }

        // original type must be part of this scope?
        if (!this.findType(typeName)) {
            return false;
        }

        this.types[aliasName] = type;
        return true;
    }


    addFunction(func: IFunctionDeclInstruction): boolean {
        assert(this.type <= EScopeType.k_Global);
        assert(func.scope === this);

        let funcMap = this.functions;
        let funcName = func.name;

        funcMap[funcName] = funcMap[funcName] || [];
        const funcOverloads = funcMap[funcName];

        let targetFunc = this.findFunctionInScope(func);

        if (!targetFunc) {
            funcOverloads.push(func);
        } else {
            assert(!isNull(func.impl));
            assert(isNull(targetFunc.impl));
            let i = funcOverloads.indexOf(targetFunc);
            funcOverloads[i] = func;
        }

        return true;
    }


    addTechnique(technique: ITechniqueInstruction): boolean {
        assert(this.type <= EScopeType.k_Global);

        if (this.techniques[technique.name]) {
            return false;
        }

        this.techniques[technique.name] = technique;
        assert(technique.scope === this);
        return false;
    }

    private filter<T>(cb: (scope: IScope) => T | null): T 
    {
        let scope: IScope = this;
        while (!isNull(scope)) {
            let res = cb(scope);
            if (!isNull(res)) {
                return res;
            }
            scope = scope.parent;
        }
        return null;
    }
}



export class ProgramScope {
    globalScope: IScope;
    currentScope: IScope;


    constructor(parent: IScope) {
        if (!isNull(parent))
        {
            let type = EScopeType.k_Global;
            this.globalScope = new Scope({ parent, type });
            this.currentScope = this.globalScope;
        }
    }


    validate(): void {
        assert(this.currentScope === this.globalScope);
    }


    push(type: EScopeType = EScopeType.k_Default): void {
        assert(this.currentScope !== null);
        assert(type >= EScopeType.k_Default);

        let parent = this.currentScope;
        let scope = new Scope({ parent, type });

        this.currentScope = scope;
    }


    pop(): void {
        assert(this.currentScope !== null);
        this.currentScope = this.currentScope.parent;
        assert(this.currentScope !== null);
    }
}


export class ProgramScopeEx extends ProgramScope {
    constructor(parent: IScope) {
        super(null);
        this.globalScope = new Scope(parent); // clone scope
        this.currentScope = this.globalScope;
    }
}
