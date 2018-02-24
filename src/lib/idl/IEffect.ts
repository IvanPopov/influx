export interface IEffect {
    getTotalComponents(): number;
    getTotalPasses(): number;

    isEqual(pEffect: IEffect): boolean;
    isReplicated(): boolean;
    isMixid(): boolean;
    isParameterUsed(pParam: any, iPass?: number): boolean;

    replicable(bValue: boolean): void;
    miscible(bValue: boolean): void;

    activate(iShift?: number): boolean;
    deactivate(): boolean;

    findParameter(pParam: any, iPass?: number): any;
}

