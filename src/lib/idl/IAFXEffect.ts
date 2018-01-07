import { IAFXIdInstruction, IAFXTechniqueInstruction, IAFXTypeDeclInstruction, IAFXVariableDeclInstruction, IAFXVariableTypeInstruction } from "./IAFXInstruction";
import { IParseTree } from "./parser/IParser";

export interface IAFXObject {
    getName(): string;
    getId(): IAFXIdInstruction;
}

export interface IAFXVariable extends IAFXObject {
    setName(sName: string): void;
    setType(pType: IAFXVariableTypeInstruction): void;
    getType(): IAFXVariableTypeInstruction;

    initializeFromInstruction(pInstruction: IAFXVariableDeclInstruction): void;

}

export interface IAFXType extends IAFXObject {
    isBase(): boolean;
    initializeFromInstruction(pInstruction: IAFXTypeDeclInstruction): boolean;
}

export interface IAFXFunction extends IAFXObject {
    getHash(): string;
}

export interface IAFXPass extends IAFXObject {

}

export interface IAFXTechnique extends IAFXObject {

}

export interface IAFXEffectStats {
    time: number;
}

export interface IAFXEffect {
    analyze(pTree: IParseTree): boolean;
    setAnalyzedFileName(sFileName: string): void;
    getStats(): IAFXEffectStats;

    clear(): void;

    getTechniqueList(): IAFXTechniqueInstruction[];
}
