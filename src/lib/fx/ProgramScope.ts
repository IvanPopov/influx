﻿import { isNull, isDef, assert } from "../common";
import { isDefAndNotNull } from "./../common";
import { IDispatch } from "./../../sandbox/actions/index";
import { IVariableDeclInstruction, ITypedInstruction, IFunctionDeclInstruction, IFunctionDeclListMap, ITypeDeclInstruction, ITypeInstruction, ITechniqueInstruction, EScopeType, IScope, IVariableTypeInstruction } from "../idl/IInstruction";
import { IMap } from "../idl/IMap";




export interface IScopeSettings {
    index: number;
    type?: EScopeType;
    parent?: IScope;
    strictMode?: boolean;
}

export class Scope implements IScope {
    strictMode: boolean;

    readonly index: number;
    readonly parent: IScope;
    readonly type: EScopeType;

    readonly variableMap: IMap<IVariableDeclInstruction>;
    readonly typeMap: IMap<ITypeDeclInstruction>;
    readonly functionMap: IMap<IFunctionDeclInstruction[]>;
    readonly techniqueMap: IMap<ITechniqueInstruction>;

    constructor({ index, type = EScopeType.k_Default, parent = null, strictMode = false }: IScopeSettings) {
        this.index = index;
        this.type = type;
        this.parent = parent;
        this.strictMode = strictMode;

        this.variableMap = {};
        this.typeMap = {};
        this.functionMap = {};
        this.techniqueMap = {};
    }

    isStrict(): boolean {
        let scope: Scope = this;
        while (!isNull(scope)) {
            if (scope.strictMode) {
                return true;
            }
            scope = scope.parent;
        }
        return false;
    }


    isGlobal(): boolean  {
        return this.index === ProgramScope.GLOBAL_SCOPE;
    }


    findVariable(varName: string): IVariableDeclInstruction {
        let scope: Scope = this;
        while (!isNull(scope)) {
            let variable = scope.variableMap[varName];
            if (isDef(variable)) {
                return variable;
            }
            scope = scope.parent;
        }

        return null;
    }


    findTypeDecl(typeName: string): ITypeDeclInstruction {
        let scope: Scope = this;
        while (!isNull(scope)) {
            let type: ITypeDeclInstruction = scope.typeMap[typeName];
            if (isDef(type)) {
                return type;
            }
            scope = scope.parent;
        }
        return null;
    }


    findType(typeName: string): ITypeInstruction {
        let typeDecl = this.findTypeDecl(typeName);
        if (!isNull(typeDecl)) {
            return typeDecl.type;
        }
        return null;
    }



    /**
     * Find function by name and list of types.
     * returns:
     *   'null' if there is not function; 
     *   'undefined'if there more then one function; 
     *    function if all is ok;
     */
    findFunction(funcName: string, args: IVariableDeclInstruction[]): IFunctionDeclInstruction | null | undefined {
        let scope: Scope = this;
        let func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            let funcList = scope.functionMap[funcName];

            if (isDef(funcList)) {
                for (let i: number = 0; i < funcList.length; i++) {
                    let testedFunction = funcList[i];
                    let testedArguments = testedFunction.definition.paramList;

                    if (isNull(args)) {
                        if (testedFunction.definition.numArgsRequired === 0) {
                            if (!isNull(func)) {
                                return undefined;
                            }

                            func = testedFunction;
                        }
                        continue;
                    }

                    if (args.length > testedArguments.length ||
                        args.length < testedFunction.definition.numArgsRequired) {
                        continue;
                    }

                    let isParamsEqual: boolean = true;

                    for (let j: number = 0; j < args.length; j++) {
                        isParamsEqual = false;

                        if (!args[j].type.isEqual(testedArguments[j].type)) {
                            break;
                        }

                        isParamsEqual = true;
                    }

                    if (isParamsEqual) {
                        if (!isNull(func)) {
                            return undefined;
                        }
                        func = testedFunction;
                    }
                }
            }

            scope = scope.parent;
        }
        return func;
    }



    /**
     * Find shader function by name and list of types.
     * returns:
     *   'null' if threre are not function; 
     *   'undefined' if there more then one function; 
     *   function if all ok;
     */
    findShaderFunction(funcName: string, argTypes: ITypedInstruction[]): IFunctionDeclInstruction {
        let scope: Scope = this;
        let func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            let funcList = scope.functionMap[funcName];

            if (isDef(funcList)) {
                for (let i: number = 0; i < funcList.length; i++) {
                    let testedFunction: IFunctionDeclInstruction = funcList[i];
                    let testedArguments: IVariableDeclInstruction[] =
                        <IVariableDeclInstruction[]>testedFunction.definition.paramList;

                    if (argTypes.length > testedArguments.length) {
                        continue;
                    }

                    let isParamsEqual: boolean = true;
                    let iArg: number = 0;

                    if (argTypes.length === 0) {
                        if (!isNull(func)) {
                            return undefined;
                        }

                        func = testedFunction;
                        continue;
                    }

                    for (let j: number = 0; j < testedArguments.length; j++) {
                        isParamsEqual = false;

                        if (iArg >= argTypes.length) {
                            if (testedArguments[j].isUniform()) {
                                break;
                            }
                            else {
                                isParamsEqual = true;
                            }
                        }
                        else if (testedArguments[j].isUniform()) {
                            if (!argTypes[iArg].type.isEqual(testedArguments[j].type)) {
                                break;
                            }
                            else {
                                iArg++;
                                isParamsEqual = true;
                            }
                        }
                    }

                    if (isParamsEqual) {
                        if (!isNull(func)) {
                            return undefined;
                        }
                        func = testedFunction;
                    }
                }
            }
            scope = scope.parent;
        }
        return func;
    }


    findTechique(techName: string): ITechniqueInstruction | null | undefined {
        let scope: Scope = this;
        while (!isNull(scope)) {
            let technique = scope.techniqueMap[techName];
            if (isDef(technique)) {
                return technique;
            }
            scope = scope.parent;
        }
        return null;
    }


    hasVariable(varName: string): boolean {
        return !isNull(this.findVariable(varName));
    }


    hasType(typeName: string): boolean {
        return !isNull(this.findType(typeName));
    }


    hasFunction(funcName: string, argTypes: ITypedInstruction[]): boolean {
        let scope: Scope = this;

        while (!isNull(scope)) {
            let funcListMap = scope.functionMap;


            let funcList = funcListMap[funcName];

            if (isDef(funcList)) {
                for (let i: number = 0; i < funcList.length; i++) {
                    let testedFunction = funcList[i];
                    let testedArguments = testedFunction.definition.paramList;

                    if (argTypes.length > testedArguments.length ||
                        argTypes.length < testedFunction.definition.numArgsRequired) {
                        continue;
                    }

                    let isParamsEqual: boolean = true;

                    for (let j: number = 0; j < argTypes.length; j++) {
                        isParamsEqual = false;

                        if (!argTypes[j].type.isEqual(testedArguments[j].type)) {
                            break;
                        }

                        isParamsEqual = true;
                    }

                    if (isParamsEqual) {
                        return true;
                    }
                }
            }

            scope = scope.parent;
        }

        return false;
    }


    hasTechnique(techName: string): boolean {
        return !isNull(this.findTechique(techName));
    }


    hasVariableInScope(varName: string): boolean {
        return isDefAndNotNull(this.variableMap[varName]);
    }


    hasTypeInScope(typeName: string): boolean {
        return isDefAndNotNull(this.typeMap[typeName]);
    }

    hasTechniqueInScope(technique: ITechniqueInstruction): boolean {
        return isDefAndNotNull(this.techniqueMap[technique.name]);
    }


    hasFunctionInScope(func: IFunctionDeclInstruction): boolean {
        let scope: Scope = this;
        let funcListMap = scope.functionMap;
        let funcList = funcListMap[func.name];

        if (!isDef(funcList)) {
            return false;
        }

        let funcArgs = <IVariableDeclInstruction[]>func.definition.paramList;
        let hasFunction = false;

        for (let i: number = 0; i < funcList.length; i++) {
            let testedArguments =
                <IVariableDeclInstruction[]>funcList[i].definition.paramList;

            if (testedArguments.length !== funcArgs.length) {
                continue;
            }

            let isParamsEqual = true;
            for (let j: number = 0; j < funcArgs.length; j++) {
                isParamsEqual = false;

                if (!testedArguments[j].type.isEqual(funcArgs[j].type)) {
                    break;
                }

                isParamsEqual = true;
            }

            if (isParamsEqual) {
                hasFunction = true;
                break;
            }
        }

        return hasFunction;
    }


    addVariable(variable: IVariableDeclInstruction): boolean {
        let scope: Scope = this;
        let variableMap = scope.variableMap;
        let varName = variable.name;

        if (!this.hasVariableInScope(varName)) {
            variableMap[varName] = variable;
            assert(variable.scope === this);
        }
        else {
            console.error(`letiable '${varName}' already exists in scope ${this.index}`);
        }
    
        return true;
    }


    // todo: remove scopeId from argumts, use type.scope instead.
    addType(type: ITypeDeclInstruction): boolean {
        let scope: Scope = this;
        let typeMap = scope.typeMap;
        let typeName = type.name;

        if (this.hasTypeInScope(typeName)) {
            return false;
        }

        typeMap[typeName] = type;
        console.assert(type.scope === this);

        return true;
    }


    addFunction(func: IFunctionDeclInstruction): boolean {
        assert(this.index === ProgramScope.GLOBAL_SCOPE);

        let scope: Scope = this;
        let funcMap = scope.functionMap;
        let funcName = func.name;

        if (this.hasFunctionInScope(func)) {
            return false;
        }

        if (!isDef(funcMap[funcName])) {
            funcMap[funcName] = [];
        }

        funcMap[funcName].push(func);
        assert(func.scope === this);

        return true;
    }


    addTechnique(technique: ITechniqueInstruction): boolean {
        assert(this.index === ProgramScope.GLOBAL_SCOPE);

        let scope: Scope = this;
        let techMap = scope.techniqueMap;
        let techName = technique.name;

        if (this.hasTechniqueInScope(technique)) {
            return false;
        }

        techMap[techName] = technique;
        assert(technique.scope === this);

        return false;
    }
}

export class ProgramScope {

    private _namespace: string;
    private _scopeList: Scope[];
    private _currentScope: number;

    constructor() {
        this._namespace = null;
        this._scopeList = [];
        this._currentScope = -1;
    }


    get currentScope(): Scope {
        if (this._currentScope == -1) {
            return null;
        }
        return this._scopeList[this._currentScope];
    }


    get globalScope(): Scope {
        return this._scopeList[ProgramScope.GLOBAL_SCOPE] || null;
    }

    get namespace(): string {
        return this._namespace;
    }

    specifyNamespace(name: string) {
        this._namespace = name;
    }

    push(type: EScopeType = EScopeType.k_Default): void {
        let parent = this.currentScope;
        let index = this._scopeList.length;

        let newScope = new Scope({ parent, index, type });

        this._scopeList.push(newScope);
        this._currentScope = index;
    }


    restore(): void {
        if (this._scopeList.length === 0) {
            return;
        }

        this._currentScope = this._scopeList.length - 1;
    }


    pop(): void {
        console.assert(this._currentScope != -1);
        if (this._currentScope == -1) {
            return;
        }

        let pOldScope = this._scopeList[this._currentScope];
        let pNewScope = pOldScope.parent;

        if (isNull(pNewScope)) {
            this._currentScope = -1;
        }
        else {
            this._currentScope = pNewScope.index;
        }
    }


    findTechnique(techName: string): ITechniqueInstruction {
        return this.globalScope.findTechique(techName);
    }


    findFunction(funcName: string, args: IVariableDeclInstruction[]): IFunctionDeclInstruction {
        return this.globalScope.findFunction(funcName, args);
    }


    findVariable(varName: string): IVariableDeclInstruction {
        return this.currentScope.findVariable(varName);
    }

    public static GLOBAL_SCOPE = 0;
}
