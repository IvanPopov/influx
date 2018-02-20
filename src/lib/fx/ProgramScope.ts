import { IScopeMap, IScope, EScopeType } from "../idl/IScope";
import { isNull, isDef } from "../common";
import { IAFXVariableDeclInstruction, IAFXTypedInstruction, IAFXFunctionDeclInstruction, IAFXFunctionDeclListMap, IAFXTypeDeclInstruction, EAFXBlendMode, IAFXTypeInstruction } from "../idl/IAFXInstruction";
import { IMap } from "../idl/IMap";

export class ProgramScope {

    private _pScopeMap: IScopeMap;
    private _iCurrentScope: number;
    private _nScope: number;

    constructor() {
        this._pScopeMap = <IScopeMap>{};
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


    pushScope(eType: EScopeType): void {
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

    getVariable(sVariableName: string, iScope: number = this._iCurrentScope): IAFXVariableDeclInstruction {
        console.assert(iScope != -1);
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pVariableMap: IMap<IAFXVariableDeclInstruction> = pScope.variableMap;

            if (!isNull(pVariableMap)) {
                var pVariable: IAFXVariableDeclInstruction = pVariableMap[sVariableName];

                if (isDef(pVariable)) {
                    return pVariable;
                }
            }

            pScope = pScope.parent;
        }

        return null;
    }


    getType(sTypeName: string, iScope: number = this._iCurrentScope): IAFXTypeInstruction {
        var pTypeDecl: IAFXTypeDeclInstruction = this.getTypeDecl(sTypeName, iScope);

        if (!isNull(pTypeDecl)) {
            return pTypeDecl._getType();
        }
        else {
            return null;
        }
    }


    getTypeDecl(sTypeName: string, iScope: number = this._iCurrentScope): IAFXTypeDeclInstruction {
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pTypeMap: IMap<IAFXTypeDeclInstruction> = pScope.typeMap;

            if (!isNull(pTypeMap)) {
                var pType: IAFXTypeDeclInstruction = pTypeMap[sTypeName];

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
    getFunction(sFuncName: string, pArgumentTypes: IAFXTypedInstruction[], iScope: number = ProgramScope.GLOBAL_SCOPE): IAFXFunctionDeclInstruction {
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunction: IAFXFunctionDeclInstruction = null;

        while (!isNull(pScope)) {
            var pFunctionListMap: IAFXFunctionDeclListMap = pScope.functionMap;

            if (!isNull(pFunctionListMap)) {
                var pFunctionList: IAFXFunctionDeclInstruction[] = pFunctionListMap[sFuncName];

                if (isDef(pFunctionList)) {

                    for (var i: number = 0; i < pFunctionList.length; i++) {
                        var pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
                        var pTestedArguments: IAFXTypedInstruction[] = pTestedFunction._getArguments();

                        if (isNull(pArgumentTypes)) {
                            if (pTestedFunction._getNumNeededArguments() === 0) {
                                if (!isNull(pFunction)) {
                                    return undefined;
                                }

                                pFunction = pTestedFunction;
                            }

                            continue;
                        }

                        if (pArgumentTypes.length > pTestedArguments.length ||
                            pArgumentTypes.length < pTestedFunction._getNumNeededArguments()) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;

                        for (var j: number = 0; j < pArgumentTypes.length; j++) {
                            isParamsEqual = false;

                            if (!pArgumentTypes[j]._getType()._isEqual(pTestedArguments[j]._getType())) {
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
    getShaderFunction(sFuncName: string, pArgumentTypes: IAFXTypedInstruction[], iScope: number = ProgramScope.GLOBAL_SCOPE): IAFXFunctionDeclInstruction {
        if (iScope == -1) {
            return null;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunction: IAFXFunctionDeclInstruction = null;

        while (!isNull(pScope)) {
            var pFunctionListMap: IAFXFunctionDeclListMap = pScope.functionMap;

            if (!isNull(pFunctionListMap)) {
                var pFunctionList: IAFXFunctionDeclInstruction[] = pFunctionListMap[sFuncName];

                if (isDef(pFunctionList)) {

                    for (var i: number = 0; i < pFunctionList.length; i++) {
                        var pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
                        var pTestedArguments: IAFXVariableDeclInstruction[] = <IAFXVariableDeclInstruction[]>pTestedFunction._getArguments();

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
                                if (pTestedArguments[j]._isUniform()) {
                                    break;
                                }
                                else {
                                    isParamsEqual = true;
                                }
                            }
                            else if (pTestedArguments[j]._isUniform()) {
                                if (!pArgumentTypes[iArg]._getType()._isEqual(pTestedArguments[j]._getType())) {
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


    addVariable(pVariable: IAFXVariableDeclInstruction, iScope: number = this._iCurrentScope): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pVariableMap: IMap<IAFXVariableDeclInstruction> = pScope.variableMap;

        if (isNull(pVariableMap)) {
            pVariableMap = pScope.variableMap = <IMap<IAFXVariableDeclInstruction>>{};
        }

        var sVariableName: string = pVariable._getName();

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


    addType(pType: IAFXTypeDeclInstruction, iScope: number = this._iCurrentScope): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pTypeMap: IMap<IAFXTypeDeclInstruction> = pScope.typeMap;

        if (isNull(pTypeMap)) {
            pTypeMap = pScope.typeMap = <IMap<IAFXTypeDeclInstruction>>{};
        }

        var sTypeName: string = pType._getName();

        if (this.hasTypeInScope(sTypeName, iScope)) {
            return false;
        }

        pTypeMap[sTypeName] = pType;
        pType.scope = (iScope);

        return true;
    }


    addFunction(pFunction: IAFXFunctionDeclInstruction, iScope: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunctionMap: IAFXFunctionDeclListMap = pScope.functionMap;

        if (isNull(pFunctionMap)) {
            pFunctionMap = pScope.functionMap = <IAFXFunctionDeclListMap>{};
        }

        var sFuncName: string = pFunction._getName();

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
            var pVariableMap: IMap<IAFXVariableDeclInstruction> = pScope.variableMap;

            if (!isNull(pVariableMap)) {
                var pVariable: IAFXVariableDeclInstruction = pVariableMap[sVariableName];

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
            var pTypeMap: IMap<IAFXTypeDeclInstruction> = pScope.typeMap;

            if (!isNull(pTypeMap)) {
                var pType: IAFXTypeDeclInstruction = pTypeMap[sTypeName];

                if (isDef(pType)) {
                    return true;
                }
            }

            pScope = pScope.parent;
        }

        return false;
    }


    hasFunction(sFuncName: string, pArgumentTypes: IAFXTypedInstruction[], iScope: number = ProgramScope.GLOBAL_SCOPE): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];

        while (!isNull(pScope)) {
            var pFunctionListMap: IAFXFunctionDeclListMap = pScope.functionMap;

            if (!isNull(pFunctionListMap)) {
                var pFunctionList: IAFXFunctionDeclInstruction[] = pFunctionListMap[sFuncName];

                if (isDef(pFunctionList)) {
                    // var pFunction: IAFXFunctionDeclInstruction = null;

                    for (var i: number = 0; i < pFunctionList.length; i++) {
                        var pTestedFunction: IAFXFunctionDeclInstruction = pFunctionList[i];
                        var pTestedArguments: IAFXTypedInstruction[] = pTestedFunction._getArguments();

                        if (pArgumentTypes.length > pTestedArguments.length ||
                            pArgumentTypes.length < pTestedFunction._getNumNeededArguments()) {
                            continue;
                        }

                        var isParamsEqual: boolean = true;

                        for (var j: number = 0; j < pArgumentTypes.length; j++) {
                            isParamsEqual = false;

                            if (!pArgumentTypes[j]._getType()._isEqual(pTestedArguments[j]._getType())) {
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


    hasFunctionInScope(pFunction: IAFXFunctionDeclInstruction, iScope: number): boolean {
        if (iScope == -1) {
            return false;
        }

        var pScope: IScope = this._pScopeMap[iScope];
        var pFunctionListMap: IAFXFunctionDeclListMap = pScope.functionMap;
        var pFunctionList: IAFXFunctionDeclInstruction[] = pFunctionListMap[pFunction._getName()];

        if (!isDef(pFunctionList)) {
            return false;
        }

        var pFunctionArguments: IAFXTypedInstruction[] = <IAFXTypedInstruction[]>pFunction._getArguments();
        var hasFunction: boolean = false;

        for (var i: number = 0; i < pFunctionList.length; i++) {
            var pTestedArguments: IAFXTypedInstruction[] = <IAFXTypedInstruction[]>pFunctionList[i]._getArguments();

            if (pTestedArguments.length !== pFunctionArguments.length) {
                continue;
            }

            var isParamsEqual: boolean = true;

            for (var j: number = 0; j < pFunctionArguments.length; j++) {
                isParamsEqual = false;

                if (!pTestedArguments[j]._getType()._isEqual(pFunctionArguments[j]._getType())) {
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
