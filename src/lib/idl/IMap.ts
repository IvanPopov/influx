export interface IMap<T> {
    [index: string]: T;
    [index: number]: T;
}

export interface IDMap<T> {
    [index: string]: IMap<T>;
    [index: number]: IMap<T>;
}

