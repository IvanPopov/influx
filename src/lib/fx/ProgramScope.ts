import { IScope, EScopeType } from "../idl/IScope";
import { isNull, isDef } from "../common";
import { IVariableDeclInstruction, ITypedInstruction, IFunctionDeclInstruction, IFunctionDeclListMap, ITypeDeclInstruction, ITypeInstruction } from "../idl/IInstruction";
import { IMap } from "../idl/IMap";

export class ProgramScope {

    private _pScopeMap: IMap<IScope>;
    private _iCurrentScope: number;
    private _nScope: number;

    constructor() {
        this._pScopeMap = <IMap<IScope>>{};
        this._iCurrentScope = -1;
        this._nScope = 0;
    }

    isStrictMode(iScope: number = this._iCurrentScope): boolean {
        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            if (pScope.isStrictMode) {
                return true;
            }

            pScope = pScope.parent;
        }

        return false;
    }

    useStrictMode(iScope: number = this._iCurrentScope): void {
        this._pScopeMap[iScope].isStrictMode = true;
    }


    pushScope(eType: EScopeType = EScopeType.k_Default): void {
        var pParentScope: IScope;

        if (this._iCurrentScope == -1) {
            pParentScope = null;
        }
        else {
            pParentScope = this._pScopeMap[this._iCurrentScope];
        }

        this._iCurrentScope = this._nScope++;

        var pNewScope: IScope = <IScope>{
            parent: pParentScope,
            index: this._iCurrentScope,
            type: eType,
            isStrictMode: false,
            variableMap: null,
            typeMap: null,
            functionMap: null
        };

        this._pScopeMap[this._iCurrentScope] = pNewScope;
    }

    // _resumeScope
    restoreScope(): void {
        if (this._nScope === 0) {
            return;
        }

        this._iCurrentScope = this._nScope - 1;
    }

    // setScope
    set current(iScope: number) {
        this._iCurrentScope = iScope;
    }

    // getScope
    get current(): number {
        return this._iCurrentScope;
    }

    popScope(): void {
        console.assert(this._iCurrentScope != -1);
        if (this._iCurrentScope == -1) {
            return;
        }

        var pOldScope: IScope = this._pScopeMap[this._iCurrentScope];
        var pNewScope: IScope = pOldScope.parent;

        if (isNull(pNewScope)) {
            this._iCurrentScope = -1;
        }
        else {
            this._iCurrentScope = pNewScope.index;
        }
    }

    get type(): EScopeType {
        return this._pScopeMap[this._iCurrentScope].type;
    }

    getVariable(sVariableName: string, iScope: number = this._iCurrentScope): IVariableDeclInstruction {
        console.assert(iScope != -1);
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pVariableMap: IMap<IVariableDeclInstruction> = pScope.variableMap;

            if (!isNull(pVariableMap)) {
                var pVariable: IVariableDeclInstruction = pVariableMap[sVariableName];

                if (isDef(pVariable)) {
                    return pVariable;
                }
            }

            pScope = pScope.parent;
        }

        return null;
    }


    getType(sTypeName: string, iScope: number = this._iCurrentScope): ITypeInstruction {
        var pTypeDecl: ITypeDeclInstruction = this.getTypeDecl(sTypeName, iScope);

        if (!isNull(pTypeDecl)) {
            return pTypeDecl.type;
        }
        else {
            return null;
        }
    }


    getTypeDecl(sTypeName: string, iScope: number = this._iCurrentScope): ITypeDeclInstruction {
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pTypeMap: IMap<ITypeDeclInstruction> = pScope.typeMap;

            if (!isNull(pTypeMap)) {
                var pType: ITypeDeclInstruction = pTypeMap[sTypeName];

                if (isDef(pType)) {
                    return pType;
                }
            }

            pScope = pScope.parent;
        }

        return null;
    }

    /**
     * get function by name and list of types
     * return null - if threre are not function; undefined - if there more then one function; function - if all ok
     */
    getFunction(sFuncName: string, pArgumentTypes: ITypedInstruction[], iScope: number = ProgramScope.GLOBAL_SCOPE): IFunctionDeclInstruction {
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunction: IFunctionDeclInstruction = null;

        while (!isNull(pScope)) {
            var pFunctionListMap: IFunctionDeclListMap = pScope.functionMap;

            if (!isNull(pFunctionListMap)) {
                var pFunctionList: IFunctionDeclInstruction[] = pFunctionListMap[sFuncName];

                if (isDef(pFunctionList)) {

                    for (var i: number = 0; i < pFunctionList.length; i++) {
                        var pTestedFunction: IFunctionDeclInstruction = pFunctionList[i];
                        var pTestedArguments: ITypedInstruction[] = pTestedFunction.arguments;

                        if (isNull(pArgumentTypes)) {
                            if (pTestedFunction.numArgsRequired === 0) {
                                if (!isNull(pFunction)) {
                                    return undefined;
                                }

                                pFunction = pTestedFunction;
                            }

                            continue;
                        }

                        if (pArgumentTypes.length > pTestedArguments.length ||
                            pArgumentTypes.length < pTestedFunction.numArgsRequired) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;

                        for (var j: number = 0; j < pArgumentTypes.length; j++) {
                            isParamsEqual = false;

                            if (!pArgumentTypes[j].type.isEqual(pTestedArguments[j].type)) {
                                break;
                            }

                            isParamsEqual = true;
                        }

                        if (isParamsEqual) {
                            if (!isNull(pFunction)) {
                                return undefined;
                            }
                            pFunction = pTestedFunction;
                        }
                    }
                }

            }

            pScope = pScope.parent;
        }

        return pFunction;
    }

    /**
     * get shader function by name and list of types
     * return null - if threre are not function; undefined - if there more then one function; function - if all ok
     */
    getShaderFunction(sFuncName: string, pArgumentTypes: ITypedInstruction[], iScope: number = ProgramScope.GLOBAL_SCOPE): IFunctionDeclInstruction {
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunction: IFunctionDeclInstruction = null;

        while (!isNull(pScope)) {
            var pFunctionListMap: IFunctionDeclListMap = pScope.functionMap;

            if (!isNull(pFunctionListMap)) {
                var pFunctionList: IFunctionDeclInstruction[] = pFunctionListMap[sFuncName];

                if (isDef(pFunctionList)) {

                    for (var i: number = 0; i < pFunctionList.length; i++) {
                        var pTestedFunction: IFunctionDeclInstruction = pFunctionList[i];
                        var pTestedArguments: IVariableDeclInstruction[] = <IVariableDeclInstruction[]>pTestedFunction.arguments;

                        if (pArgumentTypes.length > pTestedArguments.length) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;
                        let iArg: number = 0;

                        if (pArgumentTypes.length === 0) {
                            if (!isNull(pFunction)) {
                                return undefined;
                            }

                            pFunction = pTestedFunction;
                            continue;
                        }

                        for (var j: number = 0; j < pTestedArguments.length; j++) {
                            isParamsEqual = false;

                            if (iArg >= pArgumentTypes.length) {
                                if (pTestedArguments[j].isUniform()) {
                                    break;
                                }
                                else {
                                    isParamsEqual = true;
                                }
                            }
                            else if (pTestedArguments[j].isUniform()) {
                                if (!pArgumentTypes[iArg].type.isEqual(pTestedArguments[j].type)) {
                                    break;
                                }
                                else {
                                    iArg++;
                                    isParamsEqual = true;
                                }
                            }
                        }

                        if (isParamsEqual) {
                            if (!isNull(pFunction)) {
                                return undefined;
                            }
                            pFunction = pTestedFunction;
                        }
                    }
                }

            }

            pScope = pScope.parent;
        }

        return pFunction;
    }


    addVariable(pVariable: IVariableDeclInstruction, iScope: number = this._iCurrentScope): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pVariableMap: IMap<IVariableDeclInstruction> = pScope.variableMap;

        if (isNull(pVariableMap)) {
            pVariableMap = pScope.variableMap = <IMap<IVariableDeclInstruction>>{};
        }

        var sVariableName: string = pVariable.name;

        {
            if (!this.hasVariableInScope(sVariableName, iScope)) {
                pVariableMap[sVariableName] = pVariable;
                pVariable.scope = (iScope);
            }
            else {
                console.error(`variable '${sVariableName}' already exists in scope ${iScope}`);
            }
        }

        return true;
    }


    addType(pType: ITypeDeclInstruction, iScope: number = this._iCurrentScope): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pTypeMap: IMap<ITypeDeclInstruction> = pScope.typeMap;

        if (isNull(pTypeMap)) {
            pTypeMap = pScope.typeMap = <IMap<ITypeDeclInstruction>>{};
        }

        var sTypeName: string = pType.name;

        if (this.hasTypeInScope(sTypeName, iScope)) {
            return false;
        }

        pTypeMap[sTypeName] = pType;
        pType.scope = (iScope);

        return true;
    }


    addFunction(pFunction: IFunctionDeclInstruction, iScope: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunctionMap: IFunctionDeclListMap = pScope.functionMap;

        if (isNull(pFunctionMap)) {
            pFunctionMap = pScope.functionMap = <IFunctionDeclListMap>{};
        }

        var sFuncName: string = pFunction.name;

        if (this.hasFunctionInScope(pFunction, iScope)) {
            return false;
        }

        if (!isDef(pFunctionMap[sFuncName])) {
            pFunctionMap[sFuncName] = [];
        }

        pFunctionMap[sFuncName].push(pFunction);
        pFunction.scope = (iScope);

        return true;
    }


    hasVariable(sVariableName: string, iScope: number = this._iCurrentScope): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pVariableMap: IMap<IVariableDeclInstruction> = pScope.variableMap;

            if (!isNull(pVariableMap)) {
                var pVariable: IVariableDeclInstruction = pVariableMap[sVariableName];

                if (isDef(pVariable)) {
                    return true;
                }
            }

            pScope = pScope.parent;
        }

        return false;
    }


    hasType(sTypeName: string, iScope: number = this._iCurrentScope): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pTypeMap: IMap<ITypeDeclInstruction> = pScope.typeMap;

            if (!isNull(pTypeMap)) {
                var pType: ITypeDeclInstruction = pTypeMap[sTypeName];

                if (isDef(pType)) {
                    return true;
                }
            }

            pScope = pScope.parent;
        }

        return false;
    }


    hasFunction(sFuncName: string, pArgumentTypes: ITypedInstruction[], iScope: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pFunctionListMap: IFunctionDeclListMap = pScope.functionMap;

            if (!isNull(pFunctionListMap)) {
                var pFunctionList: IFunctionDeclInstruction[] = pFunctionListMap[sFuncName];

                if (isDef(pFunctionList)) {
                    // var pFunction: IFunctionDeclInstruction = null;

                    for (var i: number = 0; i < pFunctionList.length; i++) {
                        var pTestedFunction: IFunctionDeclInstruction = pFunctionList[i];
                        var pTestedArguments: ITypedInstruction[] = pTestedFunction.arguments;

                        if (pArgumentTypes.length > pTestedArguments.length ||
                            pArgumentTypes.length < pTestedFunction.numArgsRequired) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;

                        for (var j: number = 0; j < pArgumentTypes.length; j++) {
                            isParamsEqual = false;

                            if (!pArgumentTypes[j].type.isEqual(pTestedArguments[j].type)) {
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

            pScope = pScope.parent;
        }

        return false;
    }


    hasVariableInScope(sVariableName: string, iScope: number): boolean {
        return isDef(this._pScopeMap[iScope].variableMap[sVariableName]);
    }


    hasTypeInScope(sTypeName: string, iScope: number): boolean {
        return isDef(this._pScopeMap[iScope].typeMap[sTypeName]);
    }


    hasFunctionInScope(pFunction: IFunctionDeclInstruction, iScope: number): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunctionListMap: IFunctionDeclListMap = pScope.functionMap;
        var pFunctionList: IFunctionDeclInstruction[] = pFunctionListMap[pFunction.name];

        if (!isDef(pFunctionList)) {
            return false;
        }

        var pFunctionArguments: ITypedInstruction[] = <ITypedInstruction[]>pFunction.arguments;
        var hasFunction: boolean = false;

        for (var i: number = 0; i < pFunctionList.length; i++) {
            var pTestedArguments: ITypedInstruction[] = <ITypedInstruction[]>pFunctionList[i].arguments;

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
