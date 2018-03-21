import { isNull, isDef, assert } from "../common";
import { isDefAndNotNull } from "./../common";
import { IDispatch } from "./../../sandbox/actions/index";
import { IVariableDeclInstruction, ITypedInstruction, IFunctionDeclInstruction, IFunctionDeclListMap, ITypeDeclInstruction, ITypeInstruction, ITechniqueInstruction, EScopeType, IScope, IVariableTypeInstruction } from "../idl/IInstruction";
import { IMap } from "../idl/IMap";




export interface IScopeSettings {
    type?: EScopeType;
    parent?: IScope;
    strictMode?: boolean;
}

export class Scope implements IScope {
    strictMode: boolean;

    readonly parent: IScope;
    readonly type: EScopeType;

    readonly variableMap: IMap<IVariableDeclInstruction>;
    readonly typeMap: IMap<ITypeDeclInstruction>;
    readonly functionMap: IMap<IFunctionDeclInstruction[]>;
    readonly techniqueMap: IMap<ITechniqueInstruction>;

    constructor({ type = EScopeType.k_Default, parent = null, strictMode = false }: IScopeSettings) {
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
    findFunction(funcName: string, args: ITypedInstruction[] = null): IFunctionDeclInstruction | null | undefined {
        let scope: Scope = this;
        let func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            let funcList = scope.functionMap[funcName];

            if (isDef(funcList)) {
                for (let i = 0; i < funcList.length; i++) {
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
                for (let i = 0; i < funcList.length; i++) {
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


    findTechnique(techName: string): ITechniqueInstruction | null | undefined {
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


    hasFunction(funcName: string, argTypes: ITypedInstruction[] = []): boolean {
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
        return !isNull(this.findTechnique(techName));
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
            console.error(`letiable '${varName}' already exists in scope:`, this);
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
        assert(this.type <= EScopeType.k_Global);

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
        assert(this.type <= EScopeType.k_Global);

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
    globalScope: IScope;
    currentScope: IScope;


    constructor() {
        this.globalScope = null;
        this.currentScope = null;
    }


    begin(systemScope: IScope): void {
        assert(systemScope !== null);
        assert(this.currentScope === null);

        let type = EScopeType.k_Global;
        let parent = systemScope;
        this.globalScope = new Scope({ parent, type });
        this.currentScope = this.globalScope;
    }


    end(): void {
        assert(this.currentScope === this.globalScope);
        this.currentScope = null;
        this.globalScope = null;
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


    findTechnique(techName: string): ITechniqueInstruction {
        return this.globalScope.findTechnique(techName);
    }


    findFunction(funcName: string, args: IVariableDeclInstruction[]): IFunctionDeclInstruction {
        return this.globalScope.findFunction(funcName, args);
    }


    findShaderFunction(funcName: string, args: ITypedInstruction[]): IFunctionDeclInstruction {
        return this.globalScope.findShaderFunction(funcName, args);
    }


    findVariable(varName: string): IVariableDeclInstruction {
        return this.currentScope.findVariable(varName);
    }
    

    findType(typeName: string): ITypeInstruction {
        return this.currentScope.findType(typeName);
    }
}
