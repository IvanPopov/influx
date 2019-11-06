import { isNull, isDef, assert } from "../common";
import { isDefAndNotNull } from "../common";
import { IDispatch } from "../../sandbox/actions";
import { IVariableDeclInstruction, ITypedInstruction, IFunctionDeclInstruction, 
         IFunctionDeclListMap, ITypeDeclInstruction, ITypeInstruction, ITechniqueInstruction, 
         EScopeType, IScope, IVariableTypeInstruction } from "../idl/IInstruction";
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
    readonly typeMap: IMap<ITypeInstruction>;
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


    findType(typeName: string): ITypeInstruction {
        let scope: Scope = this;
        while (!isNull(scope)) {
            let type = scope.typeMap[typeName];
            if (isDef(type)) {
                return type;
            }
            scope = scope.parent;
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
    findFunction(funcName: string, args: ITypeInstruction[] = null): IFunctionDeclInstruction | null | undefined {
        let scope: Scope = this;
        let func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            let funcList = scope.functionMap[funcName];

            if (isDef(funcList)) {
                for (let i = 0; i < funcList.length; i++) {
                    let testedFunction = funcList[i];
                    let testedArguments = testedFunction.def.paramList;

                    if (isNull(args)) {
                        // if (testedFunction.definition.numArgsRequired === 0) 
                        // return any function with given name in case of (args === null)
                        {
                            if (!isNull(func)) {
                                return undefined;
                            }

                            func = testedFunction;
                        }
                        continue;
                    }

                    if (args.length > testedArguments.length ||
                        args.length < testedFunction.def.numArgsRequired) {
                        continue;
                    }

                    let isParamsEqual: boolean = true;

                    for (let j: number = 0; j < args.length; j++) {
                        isParamsEqual = false;

                        if (args[j] && !args[j].isEqual(testedArguments[j].type)) {
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
                    let testedArguments = testedFunction.def.paramList;

                    if (argTypes.length > testedArguments.length ||
                        argTypes.length < testedFunction.def.numArgsRequired) {
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



    findFunctionInScope(func: IFunctionDeclInstruction): IFunctionDeclInstruction {
        const scope: Scope = this;
        const funcListMap = scope.functionMap;
        const funcOverloads = funcListMap[func.name];

        if (!isDef(funcOverloads)) {
            return null;
        }

        const funcArgs = func.def.paramList;
        let targetFunc = null;

        for (let i = 0; i < funcOverloads.length; i++) {
            let testedArguments = funcOverloads[i].def.paramList;

            if (testedArguments.length !== funcArgs.length) {
                continue;
            }

            let isParamsEqual = true;
            for (let j = 0; j < funcArgs.length; j++) {
                isParamsEqual = false;

                if (!testedArguments[j].type.isEqual(funcArgs[j].type)) {
                    break;
                }

                isParamsEqual = true;
            }

            if (isParamsEqual) {
                targetFunc = funcOverloads[i];
                break;
            }
        }

        return targetFunc;
    }

    hasFunctionInScope(func: IFunctionDeclInstruction): boolean {
        return !isNull(this.findFunctionInScope(func));
    }


    addVariable(variable: IVariableDeclInstruction): boolean {
        let variableMap = this.variableMap;
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
    addType(type: ITypeInstruction): boolean {
        let typeMap = this.typeMap;
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
        assert(func.scope === this);

        let funcMap = this.functionMap;
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

        let techMap = this.techniqueMap;
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


    constructor(systemScope: IScope) {
        assert(systemScope !== null);

        let type = EScopeType.k_Global;
        let parent = systemScope;
        this.globalScope = new Scope({ parent, type });
        this.currentScope = this.globalScope;
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
