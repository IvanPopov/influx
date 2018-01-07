import { isString } from 'util';
import * as bf from '../bf/bf';
import { isDef, isInt, isNull, isObject } from '../common';
import { ELogLevel, ILogger, ILoggerEntity, ILogRoutineFunc, ISourceLocation } from '../idl/ILogger';
import { IMap } from '../idl/IMap';

interface ICodeFamily {
    familyName: string;
    codeMin: number;
    codeMax: number;
}

interface ICodeFamilyMap {
    [familyName: string]: ICodeFamily;
}

interface ICodeInfo {
    code: number;
    message: string;
    familyName: string;
}

interface ICodeFamilyRoutineDMap {
    [familyName: string]: IMap<ILogRoutineFunc>;
}

export class Logger implements ILogger {
    private _eLogLevel: ELogLevel;
    private _pGeneralRoutineMap: IMap<ILogRoutineFunc>;

    private _pCurrentSourceLocation: ISourceLocation;
    private _pLastLogEntity: ILoggerEntity;

    private _pCodeFamilyList: ICodeFamily[];
    private _pCodeFamilyMap: ICodeFamilyMap;
    private _pCodeInfoMap: IMap<ICodeInfo>;

    private _pCodeFamilyRoutineDMap: ICodeFamilyRoutineDMap;

    private _nFamilyGenerator: number;

    private static _sDefaultFamilyName: string = 'CodeFamily';

    private _eUnknownCode: number;
    private _sUnknownMessage: string;

    constructor() {
        this._eUnknownCode = 0;
        this._sUnknownMessage = 'Unknown code';

        this._eLogLevel = ELogLevel.ALL;
        this._pGeneralRoutineMap = <IMap<ILogRoutineFunc>>{};

        this._pCurrentSourceLocation = <ISourceLocation>{
            file: '',
            line: 0
        };

        this._pLastLogEntity = <ILoggerEntity>{
            code: this._eUnknownCode,
            location: this._pCurrentSourceLocation,
            message: this._sUnknownMessage,
            info: null
        };

        this._pCodeFamilyMap = <ICodeFamilyMap>{};
        this._pCodeFamilyList = <ICodeFamily[]>[];
        this._pCodeInfoMap = <IMap<ICodeInfo>>{};

        this._pCodeFamilyRoutineDMap = <ICodeFamilyRoutineDMap>{};

        this._nFamilyGenerator = 0;
    }

    public init(): boolean {
        //TODO: Load file
        return true;
    }

    public setLogLevel(eLevel: ELogLevel): void {
        this._eLogLevel = eLevel;
    }

    public getLogLevel(): ELogLevel {
        return this._eLogLevel;
    }

    public registerCode(eCode: number, sMessage: string = this._sUnknownMessage): boolean {
        if (this.isUsedCode(eCode)) {
            //debug.error("Error code " + String(eCode) + " already in use.");
            return false;
        }

        const sFamilyName: string = this.getFamilyName(eCode);
        if (isNull(sFamilyName)) {
            return false;
        }

        const pCodeInfo: ICodeInfo = <ICodeInfo>{
            code: eCode,
            message: sMessage,
            familyName: sFamilyName
        };

        this._pCodeInfoMap[eCode] = pCodeInfo;

        return true;
    }

    public setUnknownCode(eCode: number, sMessage: string): void {
        this._eUnknownCode = eCode;
        this._sUnknownMessage = sMessage;
    }

    public registerCodeFamily(eCodeMin: number, eCodeMax: number, sFamilyName: string = this.generateFamilyName()): boolean {
        if (this.isUsedFamilyName(sFamilyName)) {
            return false;
        }

        if (!this.isValidCodeInterval(eCodeMin, eCodeMax)) {
            return false;
        }

        const pCodeFamily: ICodeFamily = <ICodeFamily>{
            familyName: sFamilyName,
            codeMin: eCodeMin,
            codeMax: eCodeMax
        };

        this._pCodeFamilyMap[sFamilyName] = pCodeFamily;
        this._pCodeFamilyList.push(pCodeFamily);

        return true;
    }

    public getFamilyName(eCode: number): string {
        let i: number = 0;
        const pCodeFamilyList: ICodeFamily[] = this._pCodeFamilyList;
        let pCodeFamily: ICodeFamily;

        for (i = 0; i < pCodeFamilyList.length; i++) {
            pCodeFamily = pCodeFamilyList[i];

            if (pCodeFamily.codeMin <= eCode && pCodeFamily.codeMax >= eCode) {
                return pCodeFamily.familyName;
            }
        }

        return '';
    }

    public setCodeFamilyRoutine(eCodeFromFamily: number | string, fnLogRoutine: ILogRoutineFunc, eLevel: number): boolean;
    public setCodeFamilyRoutine(): boolean {
        let sFamilyName: string = '';
        let fnLogRoutine: ILogRoutineFunc | null = null;
        let eLevel: ELogLevel = ELogLevel.LOG;

        if (isInt(arguments[0])) {
            sFamilyName = this.getFamilyName(arguments[0]);
            fnLogRoutine = arguments[1];
            eLevel = arguments[2];

            if (sFamilyName === '') {
                return false;
            }
        } else if (isString(arguments[0])) {
            sFamilyName = arguments[0];
            fnLogRoutine = arguments[1];
            eLevel = arguments[2];
        }

        if (!this.isUsedFamilyName(sFamilyName)) {
            return false;
        }

        let pCodeFamilyRoutineMap: IMap<ILogRoutineFunc | null> = this._pCodeFamilyRoutineDMap[sFamilyName];

        if (!isDef(pCodeFamilyRoutineMap)) {
            pCodeFamilyRoutineMap = this._pCodeFamilyRoutineDMap[sFamilyName] = <IMap<ILogRoutineFunc>>{};
        }

        if (bf.testAll(eLevel, ELogLevel.LOG)) {
            pCodeFamilyRoutineMap[ELogLevel.LOG] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.INFORMATION)) {
            pCodeFamilyRoutineMap[ELogLevel.INFORMATION] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.WARNING)) {
            pCodeFamilyRoutineMap[ELogLevel.WARNING] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.ERROR)) {
            pCodeFamilyRoutineMap[ELogLevel.ERROR] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.CRITICAL)) {
            pCodeFamilyRoutineMap[ELogLevel.CRITICAL] = fnLogRoutine;
        }

        return true;
    }

    public setLogRoutine(fnLogRoutine: ILogRoutineFunc, eLevel: number): void {
        if (bf.testAll(eLevel, ELogLevel.LOG)) {
            this._pGeneralRoutineMap[ELogLevel.LOG] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.INFORMATION)) {
            this._pGeneralRoutineMap[ELogLevel.INFORMATION] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.WARNING)) {
            this._pGeneralRoutineMap[ELogLevel.WARNING] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.ERROR)) {
            this._pGeneralRoutineMap[ELogLevel.ERROR] = fnLogRoutine;
        }
        if (bf.testAll(eLevel, ELogLevel.CRITICAL)) {
            this._pGeneralRoutineMap[ELogLevel.CRITICAL] = fnLogRoutine;
        }
    }

    public setSourceLocation(sFile: string, iLine: number): void;
    public setSourceLocation(pLocation: ISourceLocation): void;
    public setSourceLocation(): void {
        let sFile: string;
        let iLine: number;

        if (arguments.length === 2) {
            sFile = arguments[0];
            iLine = arguments[1];
        } else {
            if (isDef(arguments[0]) && !(isNull(arguments[0]))) {
                sFile = arguments[0].file;
                iLine = arguments[0].line;
            } else {
                sFile = '';
                iLine = 0;
            }
        }

        this._pCurrentSourceLocation.file = sFile;
        this._pCurrentSourceLocation.line = iLine;
    }

    public time(sLabel: string): void {
        console.time(sLabel);
    }

    public timeEnd(sLabel: string): void {
        console.timeEnd(sLabel);
    }

    public group(...pArgs: {}[]): void {
        console.group.apply(console, arguments);
    }

    public groupEnd(): void {
        console.groupEnd();
    }

    public log(...pArgs: {}[]): void {
        if (!bf.testAll(this._eLogLevel, ELogLevel.LOG)) {
            return;
        }

        const fnLogRoutine: ILogRoutineFunc = this._pGeneralRoutineMap[ELogLevel.LOG];
        if (!isDef(fnLogRoutine)) {
            return;
        }

        const pLogEntity: ILoggerEntity = this._pLastLogEntity;

        pLogEntity.code = this._eUnknownCode;
        pLogEntity.location = this._pCurrentSourceLocation;
        pLogEntity.info = pArgs;
        pLogEntity.message = this._sUnknownMessage;

        fnLogRoutine.call(null, pLogEntity);
    }

    public info(pEntity: ILoggerEntity): void;
    public info(eCode: number, ...pArgs: {}[]): void;
    public info(...pArgs: {}[]): void;
    public info(): void {
        if (!bf.testAll(this._eLogLevel, ELogLevel.INFORMATION)) {
            return;
        }

        let pLogEntity: ILoggerEntity;
        let fnLogRoutine: ILogRoutineFunc | null;

        pLogEntity = this.prepareLogEntity.apply(this, arguments);
        fnLogRoutine = this.getCodeRoutineFunc(pLogEntity.code, ELogLevel.INFORMATION);

        if (isNull(fnLogRoutine)) {
            return;
        }

        (<ILogRoutineFunc>fnLogRoutine).call(null, pLogEntity);
    }

    public warn(pEntity: ILoggerEntity): void;
    public warn(eCode: number, ...pArgs: {}[]): void;
    public warn(...pArgs: {}[]): void;
    public warn(): void {
        if (!bf.testAll(this._eLogLevel, ELogLevel.WARNING)) {
            return;
        }

        let pLogEntity: ILoggerEntity;
        let fnLogRoutine: ILogRoutineFunc | null;

        pLogEntity = this.prepareLogEntity.apply(this, arguments);
        fnLogRoutine = this.getCodeRoutineFunc(pLogEntity.code, ELogLevel.WARNING);

        if (isNull(fnLogRoutine)) {
            return;
        }

        (<ILogRoutineFunc>fnLogRoutine).call(null, pLogEntity);
    }

    public error(pEntity: ILoggerEntity): void;
    public error(eCode: number, ...pArgs: {}[]): void;
    public error(...pArgs: {}[]): void;
    public error(): void {
        if (!bf.testAll(this._eLogLevel, ELogLevel.ERROR)) {
            return;
        }

        let pLogEntity: ILoggerEntity;
        let fnLogRoutine: ILogRoutineFunc | null;

        pLogEntity = this.prepareLogEntity.apply(this, arguments);
        fnLogRoutine = this.getCodeRoutineFunc(pLogEntity.code, ELogLevel.ERROR);

        if (isNull(fnLogRoutine)) {
            return;
        }

        (<ILogRoutineFunc>fnLogRoutine).call(null, pLogEntity);
    }

    public critical(pEntity: ILoggerEntity): void;
    public critical(eCode: number, ...pArgs: {}[]): void;
    public critical(...pArgs: {}[]): void;
    public critical(): void {
        let pLogEntity: ILoggerEntity;
        let fnLogRoutine: ILogRoutineFunc | null;

        pLogEntity = this.prepareLogEntity.apply(this, arguments);
        fnLogRoutine = this.getCodeRoutineFunc(pLogEntity.code, ELogLevel.CRITICAL);

        const sSystemMessage: string = 'A Critical error has occured! Code: ' + pLogEntity.code.toString();

        if (bf.testAll(this._eLogLevel, ELogLevel.CRITICAL) && !isNull(fnLogRoutine)) {
            (<ILogRoutineFunc>fnLogRoutine).call(null, pLogEntity);
        }

        alert(sSystemMessage);
        throw new Error(sSystemMessage);
    }

    public assert(bCondition: boolean, pEntity: ILoggerEntity): void;
    public assert(bCondition: boolean, eCode: number, ...pArgs: {}[]): void;
    public assert(bCondition: boolean, ...pArgs: {}[]): void;
    public assert(): void {
        const bCondition: boolean = <boolean>arguments[0];

        if (!bCondition) {
            let pLogEntity: ILoggerEntity;
            let fnLogRoutine: ILogRoutineFunc | null;

            const pArgs: {}[] = [];

            for (let i = 1; i < arguments.length; i++) {
                pArgs[i - 1] = arguments[i];
            }

            pLogEntity = this.prepareLogEntity.apply(this, pArgs);
            fnLogRoutine = this.getCodeRoutineFunc(pLogEntity.code, ELogLevel.CRITICAL);

            const sSystemMessage: string = `A error has occured! Code: ${pLogEntity.code.toString()}\n Accept to exit, refuse to continue.`;

            if (bf.testAll(this._eLogLevel, ELogLevel.CRITICAL) && !isNull(fnLogRoutine)) {
                (<ILogRoutineFunc>fnLogRoutine).call(null, pLogEntity);
            }

            if (confirm(sSystemMessage)) {
                throw new Error(sSystemMessage);
            }
        }
    }

    private generateFamilyName(): string {
        const sSuffix: string = <string><{}>(this._nFamilyGenerator++);
        const sName: string = Logger._sDefaultFamilyName + sSuffix;

        if (this.isUsedFamilyName(sName)) {
            return this.generateFamilyName();
        } else {
            return sName;
        }
    }

    private isValidCodeInterval(eCodeMin: number, eCodeMax: number): boolean {
        if (eCodeMin > eCodeMax) {
            return false;
        }

        let i: number = 0;
        const pCodeFamilyList: ICodeFamily[] = this._pCodeFamilyList;
        let pCodeFamily: ICodeFamily;

        for (i = 0; i < pCodeFamilyList.length; i++) {
            pCodeFamily = pCodeFamilyList[i];

            if ((pCodeFamily.codeMin <= eCodeMin && pCodeFamily.codeMax >= eCodeMin) ||
                (pCodeFamily.codeMin <= eCodeMax && pCodeFamily.codeMax >= eCodeMax)) {
                return false;
            }
        }

        return true;
    }

    private isUsedFamilyName(sFamilyName: string): boolean {
        return isDef(this._pCodeFamilyMap[sFamilyName]);
    }

    private isUsedCode(eCode: number): boolean {
        return isDef(this._pCodeInfoMap[eCode]);
    }

    private isLogEntity(pObj: any): boolean {
        if (isObject(pObj) && isDef(pObj.code) && isDef(pObj.location)) {
            return true;
        }

        return false;
    }

    private isLogCode(eCode: {}): boolean {
        return isInt(eCode);
    }

    private prepareLogEntity(pEntity: ILoggerEntity): ILoggerEntity;
    private prepareLogEntity(eCode: number, ...pArgs: {}[]): ILoggerEntity;
    private prepareLogEntity(...pArgs: {}[]): ILoggerEntity;
    private prepareLogEntity(): ILoggerEntity {
        let eCode: number = this._eUnknownCode;
        let sMessage: string = this._sUnknownMessage;
        let pInfo: {}[] = null;

        if (arguments.length === 1 && this.isLogEntity(arguments[0])) {
            const pEntity: ILoggerEntity = arguments[0];

            eCode = pEntity.code;
            pInfo = pEntity.info;
            this.setSourceLocation(pEntity.location);

            if (!isDef(pEntity.message)) {
                const pCodeInfo: ICodeInfo = this._pCodeInfoMap[eCode];
                if (isDef(pCodeInfo)) {
                    sMessage = pCodeInfo.message;
                }
            }
        } else {
            if (this.isLogCode(arguments[0])) {
                eCode = <number>arguments[0];
                if (arguments.length > 1) {
                    pInfo = new Array(arguments.length - 1);

                    for (let i = 0; i < pInfo.length; i++) {
                        pInfo[i] = arguments[i + 1];
                    }
                }
            } else {
                eCode = this._eUnknownCode;
                // if(arguments.length > 0){
                pInfo = new Array(arguments.length);

                for (let i = 0; i < pInfo.length; i++) {
                    pInfo[i] = arguments[i];
                }
            }

            const pCodeInfo: ICodeInfo = this._pCodeInfoMap[eCode];
            if (isDef(pCodeInfo)) {
                sMessage = pCodeInfo.message;
            }
        }

        const pLogEntity: ILoggerEntity = this._pLastLogEntity;

        pLogEntity.code = eCode;
        pLogEntity.location = this._pCurrentSourceLocation;
        pLogEntity.message = sMessage;
        pLogEntity.info = pInfo;

        return pLogEntity;
    }

    private getCodeRoutineFunc(eCode: number, eLevel: ELogLevel): ILogRoutineFunc | null {
        const pCodeInfo: ICodeInfo = this._pCodeInfoMap[eCode];
        let fnLogRoutine: ILogRoutineFunc;

        if (!isDef(pCodeInfo)) {
            fnLogRoutine = this._pGeneralRoutineMap[eLevel];

            return isDef(fnLogRoutine) ? fnLogRoutine : null;
        }

        const pCodeFamilyRoutineMap: IMap<ILogRoutineFunc> = this._pCodeFamilyRoutineDMap[pCodeInfo.familyName];

        if (!isDef(pCodeFamilyRoutineMap) || !isDef(pCodeFamilyRoutineMap[eLevel])) {
            fnLogRoutine = this._pGeneralRoutineMap[eLevel];

            return isDef(fnLogRoutine) ? fnLogRoutine : null;
        }

        fnLogRoutine = pCodeFamilyRoutineMap[eLevel];

        return fnLogRoutine;
    }
}
