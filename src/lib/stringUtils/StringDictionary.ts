import { IMap } from "../idl/IMap";
import { isDef } from "../common";
import { IStringDictionary } from "../idl/IStringDictionary"

export class StringDictionary implements IStringDictionary {
    private _pDictionary: IMap<number> = null;
    private _pIndexToEntryMap: IMap<string> = null;

    private _nEntryCount: number = 1;

    constructor() {
        this._pDictionary = <IMap<number>>{};
        this._pIndexToEntryMap = <IMap<string>>{};
    }

    add(sEntry: string): number {
        if (!isDef(this._pDictionary[sEntry])) {
            this._pDictionary[sEntry] = this._nEntryCount++;
            this._pIndexToEntryMap[this._nEntryCount - 1] = sEntry;
        }

        return this._pDictionary[sEntry];
    }

    index(sEntry: string): number {
        return this._pDictionary[sEntry] || 0;
    }

    findEntry(iIndex: string): string {
        return this._pIndexToEntryMap[iIndex];
    }
}
