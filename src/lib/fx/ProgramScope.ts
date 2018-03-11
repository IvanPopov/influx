import { isNull, isDef, assert } from "../common";
import { isDefAndNotNull } from "./../common";
import { IDispatch } from "./../../sandbox/actions/index";
import { IVariableDeclInstruction, ITypedInstruction, IFunctionDeclInstruction, IFunctionDeclListMap, ITypeDeclInstruction, ITypeInstruction, ITechniqueInstruction, EScopeType, IScope } from "../idl/IInstruction";
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
    readonly techniqueMap: IMap<ITechniqueInstruction[]>;

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


    findVariable(variableName: string): IVariableDeclInstruction {
        let scope: Scope = this;
        while (!isNull(scope)) {
            let variable: IVariableDeclInstruction = scope.variableMap[variableName];
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
                    let testedArguments = testedFunction.definition.arguments;

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
                        <IVariableDeclInstruction[]>testedFunction.definition.arguments;

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
        console.error("@not_implemented");
        return null;
    }


    hasVariable(variableName: string): boolean {
        let scope: Scope = this;

        while (!isNull(scope)) {
            let variable: IVariableDeclInstruction = scope.variableMap[variableName];
            if (isDef(variable)) {
                return true;
            }
            scope = scope.parent;
        }

        return false;
    }


    hasType(typeName: string): boolean {
        let scope: Scope = this;

        while (!isNull(scope)) {
            let type: ITypeDeclInstruction = scope.typeMap[typeName];
            if (isDefAndNotNull(type)) {
                return true;
            }

            scope = scope.parent;
        }

        return false;
    }


    hasFunction(funcName: string, argTypes: ITypedInstruction[]): boolean {
        let scope: Scope = this;

        while (!isNull(scope)) {
            let funcListMap = scope.functionMap;


            let funcList = funcListMap[funcName];

            if (isDef(funcList)) {
                for (let i: number = 0; i < funcList.length; i++) {
                    let testedFunction = funcList[i];
                    let testedArguments = testedFunction.definition.arguments;

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
        console.error("@not_implemented");
        return false;
    }


    hasVariableInScope(variableName: string): boolean {
        return isDefAndNotNull(this.variableMap[variableName]);
    }


    hasTypeInScope(typeName: string): boolean {
        return isDefAndNotNull(this.typeMap[typeName]);
    }

    hasTechniqueInScope(technique: ITechniqueInstruction): boolean {
        console.error("@not_implemented");
        return false;
    }


    hasFunctionInScope(func: IFunctionDeclInstruction): boolean {
        let scope: Scope = this;
        let funcListMap = scope.functionMap;
        let funcList = funcListMap[func.name];

        if (!isDef(funcList)) {
            return false;
        }

        let funcArgs = <IVariableDeclInstruction[]>func.definition.arguments;
        let hasFunction = false;

        for (let i: number = 0; i < funcList.length; i++) {
            let testedArguments =
                <IVariableDeclInstruction[]>funcList[i].definition.arguments;

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
        let variableName = variable.name;

        if (!this.hasVariableInScope(variableName)) {
            variableMap[variableName] = variable;
            assert(variable.scope === this);
        }
        else {
            console.error(`letiable '${variableName}' already exists in scope ${scopeId}`);
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
        let funcName: string = func.name;

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
        console.error("@not_implemented");
        return false;
    }
}

export class ProgramScope {

    private _scopeList: Scope[];
    private _currentScope: number;

    constructor() {
        this._scopeList = [];
        this._currentScope = -1;
    }

    get current(): Scope {
        if (this._currentScope == -1) {
            return null;
        }
        return this._scopeList[this._currentScope];
    }

    get globalScope(): Scope {
        return this._scopeList[ProgramScope.GLOBAL_SCOPE] || null;
    }


    push(type: EScopeType = EScopeType.k_Default): void {
        let parent = this.current;
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


    public static GLOBAL_SCOPE = 0;
}
