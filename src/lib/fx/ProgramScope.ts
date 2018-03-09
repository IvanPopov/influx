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
        var scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            if (scope.isStrictMode) {
                return true;
            }

            scope = scope.parent;
        }

        return false;
    }

    useStrictMode(scopeId: number = this._currentScope): void {
        this._scopeMap[scopeId].isStrictMode = true;
    }


    pushScope(eType: EScopeType = EScopeType.k_Default): void {
        var pParentScope: IScope;

        if (this._currentScope == -1) {
            pParentScope = null;
        }
        else {
            pParentScope = this._scopeMap[this._currentScope];
        }

        this._currentScope = this._scopeCount++;

        var pNewScope: IScope = <IScope>{
            parent: pParentScope,
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
    restoreScope(): void {
        if (this._scopeCount === 0) {
            return;
        }

        this._currentScope = this._scopeCount - 1;
    }

    // setScope
    set current(scopeId: number) {
        this._currentScope = scopeId;
    }

    // getScope
    get current(): number {
        return this._currentScope;
    }

    popScope(): void {
        console.assert(this._currentScope != -1);
        if (this._currentScope == -1) {
            return;
        }

        var pOldScope: IScope = this._scopeMap[this._currentScope];
        var pNewScope: IScope = pOldScope.parent;

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

    getVariable(variableName: string, scopeId: number = this._currentScope): IVariableDeclInstruction {
        console.assert(scopeId != -1);
        if (scopeId == -1) {
            return null;
        }

        var scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            var pVariableMap: IMap<IVariableDeclInstruction> = scope.variableMap;

            if (!isNull(pVariableMap)) {
                var pVariable: IVariableDeclInstruction = pVariableMap[variableName];

                if (isDef(pVariable)) {
                    return pVariable;
                }
            }

            scope = scope.parent;
        }

        return null;
    }


    getType(typeName: string, scopeId: number = this._currentScope): ITypeInstruction {
        var pTypeDecl: ITypeDeclInstruction = this.getTypeDecl(typeName, scopeId);

        if (!isNull(pTypeDecl)) {
            return pTypeDecl.type;
        }
        else {
            return null;
        }
    }


    getTypeDecl(sTypeName: string, scopeId: number = this._currentScope): ITypeDeclInstruction {
        if (scopeId == -1) {
            return null;
        }

        var scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            var typeMap: IMap<ITypeDeclInstruction> = scope.typeMap;

            if (!isNull(typeMap)) {
                var pType: ITypeDeclInstruction = typeMap[sTypeName];

                if (isDef(pType)) {
                    return pType;
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
    getFunction(funcName: string, argTypes: ITypedInstruction[], scopeId: number = ProgramScope.GLOBAL_SCOPE): IFunctionDeclInstruction {
        if (scopeId == -1) {
            return null;
        }

        var scope: IScope = this._scopeMap[scopeId];
        var func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            var funcListMap: IFunctionDeclListMap = scope.functionMap;

            if (!isNull(funcListMap)) {
                var funcList: IFunctionDeclInstruction[] = funcListMap[funcName];

                if (isDef(funcList)) {

                    for (var i: number = 0; i < funcList.length; i++) {
                        var pTestedFunction: IFunctionDeclInstruction = funcList[i];
                        var pTestedArguments: ITypedInstruction[] = pTestedFunction.arguments;

                        if (isNull(argTypes)) {
                            if (pTestedFunction.numArgsRequired === 0) {
                                if (!isNull(func)) {
                                    return undefined;
                                }

                                func = pTestedFunction;
                            }

                            continue;
                        }

                        if (argTypes.length > pTestedArguments.length ||
                            argTypes.length < pTestedFunction.numArgsRequired) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;

                        for (var j: number = 0; j < argTypes.length; j++) {
                            isParamsEqual = false;

                            if (!argTypes[j].type.isEqual(pTestedArguments[j].type)) {
                                break;
                            }

                            isParamsEqual = true;
                        }

                        if (isParamsEqual) {
                            if (!isNull(func)) {
                                return undefined;
                            }
                            func = pTestedFunction;
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

        var scope: IScope = this._scopeMap[scopeId];
        var func: IFunctionDeclInstruction = null;

        while (!isNull(scope)) {
            var funcListMap: IFunctionDeclListMap = scope.functionMap;

            if (!isNull(funcListMap)) {
                var funcList: IFunctionDeclInstruction[] = funcListMap[funcName];

                if (isDef(funcList)) {

                    for (var i: number = 0; i < funcList.length; i++) {
                        var pTestedFunction: IFunctionDeclInstruction = funcList[i];
                        var pTestedArguments: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>pTestedFunction.arguments;

                        if (argTypes.length > pTestedArguments.length) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;
                        let iArg: number = 0;

                        if (argTypes.length === 0) {
                            if (!isNull(func)) {
                                return undefined;
                            }

                            func = pTestedFunction;
                            continue;
                        }

                        for (var j: number = 0; j < pTestedArguments.length; j++) {
                            isParamsEqual = false;

                            if (iArg >= argTypes.length) {
                                if (pTestedArguments[j].isUniform()) {
                                    break;
                                }
                                else {
                                    isParamsEqual = true;
                                }
                            }
                            else if (pTestedArguments[j].isUniform()) {
                                if (!argTypes[iArg].type.isEqual(pTestedArguments[j].type)) {
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
                            func = pTestedFunction;
                        }
                    }
                }

            }

            scope = scope.parent;
        }

        return func;
    }


    addVariable(pVariable: IVariableDeclInstruction, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        var scope: IScope = this._scopeMap[scopeId];
        var pVariableMap: IMap<IVariableDeclInstruction> = scope.variableMap;

        if (isNull(pVariableMap)) {
            pVariableMap = scope.variableMap = <IMap<IVariableDeclInstruction>>{};
        }

        var variableName: string = pVariable.name;

        {
            if (!this.hasVariableInScope(variableName, scopeId)) {
                pVariableMap[variableName] = pVariable;
                pVariable.scope = (scopeId);
            }
            else {
                console.error(`variable '${variableName}' already exists in scope ${scopeId}`);
            }
        }

        return true;
    }


    addType(pType: ITypeDeclInstruction, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        var scope: IScope = this._scopeMap[scopeId];
        var pTypeMap: IMap<ITypeDeclInstruction> = scope.typeMap;

        if (isNull(pTypeMap)) {
            pTypeMap = scope.typeMap = <IMap<ITypeDeclInstruction>>{};
        }

        var sTypeName: string = pType.name;

        if (this.hasTypeInScope(sTypeName, scopeId)) {
            return false;
        }

        pTypeMap[sTypeName] = pType;
        pType.scope = (scopeId);

        return true;
    }


    addFunction(func: IFunctionDeclInstruction, scopeId: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (scopeId == -1) {
            return false;
        }

        var scope: IScope = this._scopeMap[scopeId];
        var pFunctionMap: IFunctionDeclListMap = scope.functionMap;

        if (isNull(pFunctionMap)) {
            pFunctionMap = scope.functionMap = <IFunctionDeclListMap>{};
        }

        var funcName: string = func.name;

        if (this.hasFunctionInScope(func, scopeId)) {
            return false;
        }

        if (!isDef(pFunctionMap[funcName])) {
            pFunctionMap[funcName] = [];
        }

        pFunctionMap[funcName].push(func);
        func.scope = (scopeId);

        return true;
    }


    hasVariable(variableName: string, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        var scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            var pVariableMap: IMap<IVariableDeclInstruction> = scope.variableMap;

            if (!isNull(pVariableMap)) {
                var pVariable: IVariableDeclInstruction = pVariableMap[variableName];

                if (isDef(pVariable)) {
                    return true;
                }
            }

            scope = scope.parent;
        }

        return false;
    }


    hasType(sTypeName: string, scopeId: number = this._currentScope): boolean {
        if (scopeId == -1) {
            return false;
        }

        var scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            var pTypeMap: IMap<ITypeDeclInstruction> = scope.typeMap;

            if (!isNull(pTypeMap)) {
                var pType: ITypeDeclInstruction = pTypeMap[sTypeName];

                if (isDef(pType)) {
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

        var scope: IScope = this._scopeMap[scopeId];

        while (!isNull(scope)) {
            var funcListMap: IFunctionDeclListMap = scope.functionMap;

            if (!isNull(funcListMap)) {
                var funcList: IFunctionDeclInstruction[] = funcListMap[funcName];

                if (isDef(funcList)) {
                    // var func: IFunctionDeclInstruction = null;

                    for (var i: number = 0; i < funcList.length; i++) {
                        var pTestedFunction: IFunctionDeclInstruction = funcList[i];
                        var pTestedArguments: ITypedInstruction[] = pTestedFunction.arguments;

                        if (argTypes.length > pTestedArguments.length ||
                            argTypes.length < pTestedFunction.numArgsRequired) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;

                        for (var j: number = 0; j < argTypes.length; j++) {
                            isParamsEqual = false;

                            if (!argTypes[j].type.isEqual(pTestedArguments[j].type)) {
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


    hasTypeInScope(sTypeName: string, scopeId: number): boolean {
        return isDef(this._scopeMap[scopeId].typeMap[sTypeName]);
    }


    hasFunctionInScope(func: IFunctionDeclInstruction, scopeId: number): boolean {
        if (scopeId == -1) {
            return false;
        }

        var scope: IScope = this._scopeMap[scopeId];
        var funcListMap: IFunctionDeclListMap = scope.functionMap;
        var funcList: IFunctionDeclInstruction[] = funcListMap[func.name];

        if (!isDef(funcList)) {
            return false;
        }

        var pFunctionArguments: ITypedInstruction[] = <ITypedInstruction[]>func.arguments;
        var hasFunction: boolean = false;

        for (var i: number = 0; i < funcList.length; i++) {
            var pTestedArguments: ITypedInstruction[] = <ITypedInstruction[]>funcList[i].arguments;

            if (pTestedArguments.length !== pFunctionArguments.length) {
                continue;
            }

            var isParamsEqual: boolean = true;

            for (var j: number = 0; j < pFunctionArguments.length; j++) {
                isParamsEqual = false;

                if (!pTestedArguments[j].type.isEqual(pFunctionArguments[j].type)) {
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
