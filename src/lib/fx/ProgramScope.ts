import { IScope, EScopeType } from "../idl/IScope";
import { isNull, isDef } from "../common";
import { IVariableDeclInstruction, ITypedInstruction, IFunctionDeclInstruction, IFunctionDeclListMap, ITypeDeclInstruction, ITypeInstruction } from "../idl/IInstruction";
import { IMap } from "../idl/IMap";

export class ProgramScope {

    private _scopeMap: IMap<IScope>;
    private _currentScope: number;
    private _scopeCount: number;

    constructor() {
        this._scopeMap = <IMap<IScope>>{};
        this._currentScope = -1;
        this._scopeCount = 0;
    }

    isStrictMode(scopeId: number = this._currentScope): boolean {
        let scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            if (scope.isStrictMode) {
                return true;
            }

            scope = scope.parent;
        }

        return false;
    }

    useStrictMode(scopeId: number = this._currentScope): void {
        console.log(`Strict mode for scope ${scopeId} enabled.`);
        this._scopeMap[scopeId].isStrictMode = true;
    }


    push(eType: EScopeType = EScopeType.k_Default): void {
        let parentScope: IScope;

        if (this._currentScope == -1) {
            parentScope = null;
        }
        else {
            parentScope = this._scopeMap[this._currentScope];
        }

        this._currentScope = this._scopeCount++;

        let pNewScope: IScope = <IScope>{
            parent: parentScope,
            index: this._currentScope,
            type: eType,
            isStrictMode: false,
            variableMap: null,
            typeMap: null,
            functionMap: null
        };

        this._scopeMap[this._currentScope] = pNewScope;
    }

    // _resumeScope
    restore(): void {
        if (this._scopeCount === 0) {
            return;
        }

        this._currentScope = this._scopeCount - 1;
    }

    
    set current(scopeId: number) {
        console.warn("Scope overriting detected!");
        this._currentScope = scopeId;
    }

    get current(): number {
        return this._currentScope;
    }

    pop(): void {
        console.assert(this._currentScope != -1);
        if (this._currentScope == -1) {
            return;
        }

        let pOldScope: IScope = this._scopeMap[this._currentScope];
        let pNewScope: IScope = pOldScope.parent;

        if (isNull(pNewScope)) {
            this._currentScope = -1;
        }
        else {
            this._currentScope = pNewScope.index;
        }
    }

    get type(): EScopeType {
        return this._scopeMap[this._currentScope].type;
    }

    findVariable(variableName: string, scopeId: number = this._currentScope): IVariableDeclInstruction {
        console.assert(scopeId != -1);
        if (scopeId == -1) {
            return null;
        }

        let scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            let variableMap: IMap<IVariableDeclInstruction> = scope.variableMap;

            if (!isNull(variableMap)) {
                let variable: IVariableDeclInstruction = variableMap[variableName];

                if (isDef(variable)) {
                    return variable;
                }
            }

            scope = scope.parent;
        }

        return null;
    }


    findType(typeName: string, scopeId: number = this._currentScope): ITypeInstruction {
        let typeDecl: ITypeDeclInstruction = this.findTypeDecl(typeName, scopeId);

        if (!isNull(typeDecl)) {
            return typeDecl.type;
        }
        else {
            return null;
        }
    }


    findTypeDecl(typeName: string, scopeId: number = this._currentScope): ITypeDeclInstruction {
        if (scopeId == -1) {
            return null;
        }

        let scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            let typeMap: IMap<ITypeDeclInstruction> = scope.typeMap;

            if (!isNull(typeMap)) {
                let type: ITypeDeclInstruction = typeMap[typeName];

                if (isDef(type)) {
                    return type;
                }
            }

            scope = scope.parent;
        }

        return null;
    }

    /**
     * get function by name and list of types
     * return null - if threre are not function; undefined - if there more then one function; function - if all ok
     */
    findFunction(funcName: string, args: IVariableDeclInstruction[], scopeId: number = ProgramScope.GLOBAL_SCOPE): IFunctionDeclInstruction {
        if (scopeId == -1) {
            return null;
        }

        let scope: IScope = this._scopeMap[scopeId];
        let func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            let funcListMap: IFunctionDeclListMap = scope.functionMap;

            if (!isNull(funcListMap)) {
                let funcList: IFunctionDeclInstruction[] = funcListMap[funcName];

                if (isDef(funcList)) {
                    for (let i: number = 0; i < funcList.length; i++) {
                        let testedFunction: IFunctionDeclInstruction = funcList[i];
                        let testedArguments: IVariableDeclInstruction[] = testedFunction.definition.arguments;

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

            }

            scope = scope.parent;
        }

        return func;
    }

    /**
     * get shader function by name and list of types
     * return null - if threre are not function; undefined - if there more then one function; function - if all ok
     */
    getShaderFunction(funcName: string, argTypes: ITypedInstruction[], scopeId: number = ProgramScope.GLOBAL_SCOPE): IFunctionDeclInstruction {
        if (scopeId == -1) {
            return null;
        }

        let scope: IScope = this._scopeMap[scopeId];
        let func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            let funcListMap: IFunctionDeclListMap = scope.functionMap;

            if (!isNull(funcListMap)) {
                let funcList: IFunctionDeclInstruction[] = funcListMap[funcName];

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

            }

            scope = scope.parent;
        }

        return func;
    }


    addVariable(variable: IVariableDeclInstruction, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];
        let variableMap: IMap<IVariableDeclInstruction> = scope.variableMap;

        if (isNull(variableMap)) {
            variableMap = scope.variableMap = <IMap<IVariableDeclInstruction>>{};
        }

        let variableName: string = variable.name;

        {
            if (!this.hasVariableInScope(variableName, scopeId)) {
                variableMap[variableName] = variable;
                // variable.scope = (scopeId);
            }
            else {
                console.error(`letiable '${variableName}' already exists in scope ${scopeId}`);
            }
        }

        return true;
    }


    // todo: remove scopeId from argumts, use type.scope instead.
    addType(type: ITypeDeclInstruction, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];
        let typeMap: IMap<ITypeDeclInstruction> = scope.typeMap;

        if (isNull(typeMap)) {
            typeMap = scope.typeMap = <IMap<ITypeDeclInstruction>>{};
        }

        let typeName: string = type.name;

        if (this.hasTypeInScope(typeName, scopeId)) {
            return false;
        }

        typeMap[typeName] = type;
        // type.scope = (scopeId);
        console.assert(type.scope === scopeId);

        return true;
    }


    addFunction(func: IFunctionDeclInstruction, scopeId: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];
        let funcMap: IFunctionDeclListMap = scope.functionMap;

        if (isNull(funcMap)) {
            funcMap = scope.functionMap = <IFunctionDeclListMap>{};
        }

        let funcName: string = func.name;

        if (this.hasFunctionInScope(func, scopeId)) {
            return false;
        }

        if (!isDef(funcMap[funcName])) {
            funcMap[funcName] = [];
        }

        funcMap[funcName].push(func);
        // func.scope = (scopeId);
        console.assert(func.scope === scopeId);

        return true;
    }


    hasVariable(variableName: string, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            let variableMap: IMap<IVariableDeclInstruction> = scope.variableMap;

            if (!isNull(variableMap)) {
                let variable: IVariableDeclInstruction = variableMap[variableName];

                if (isDef(variable)) {
                    return true;
                }
            }

            scope = scope.parent;
        }

        return false;
    }


    hasType(typeName: string, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            let typeMap: IMap<ITypeDeclInstruction> = scope.typeMap;

            if (!isNull(typeMap)) {
                let type: ITypeDeclInstruction = typeMap[typeName];

                if (isDef(type)) {
                    return true;
                }
            }

            scope = scope.parent;
        }

        return false;
    }


    hasFunction(funcName: string, argTypes: ITypedInstruction[], scopeId: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            let funcListMap: IFunctionDeclListMap = scope.functionMap;

            if (!isNull(funcListMap)) {
                let funcList: IFunctionDeclInstruction[] = funcListMap[funcName];

                if (isDef(funcList)) {
                    // let func: IFunctionDeclInstruction = null;

                    for (let i: number = 0; i < funcList.length; i++) {
                        let testedFunction: IFunctionDeclInstruction = funcList[i];
                        let testedArguments: IVariableDeclInstruction[] = testedFunction.definition.arguments;

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

            }

            scope = scope.parent;
        }

        return false;
    }


    hasVariableInScope(variableName: string, scopeId: number): boolean {
        return isDef(this._scopeMap[scopeId].variableMap[variableName]);
    }


    hasTypeInScope(typeName: string, scopeId: number): boolean {
        return isDef(this._scopeMap[scopeId].typeMap[typeName]);
    }


    hasFunctionInScope(func: IFunctionDeclInstruction, scopeId: number): boolean {
        if (scopeId == -1) {
            return false;
        }

        let scope: IScope = this._scopeMap[scopeId];
        let funcListMap: IFunctionDeclListMap = scope.functionMap;
        let funcList: IFunctionDeclInstruction[] = funcListMap[func.name];

        if (!isDef(funcList)) {
            return false;
        }

        let funcArgs: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>func.definition.arguments;
        let hasFunction: boolean = false;

        for (let i: number = 0; i < funcList.length; i++) {
            let testedArguments: IVariableDeclInstruction[] = 
                <IVariableDeclInstruction[]>funcList[i].definition.arguments;

            if (testedArguments.length !== funcArgs.length) {
                continue;
            }

            let isParamsEqual: boolean = true;

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

    public static GLOBAL_SCOPE = 0;
}
