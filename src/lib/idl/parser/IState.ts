import { IItem } from "./IItem"
import { EParserType, IRule } from "./IParser";
import { IMap } from "../IMap";

export interface IState {
	hasItem(pItem: IItem, eType: EParserType): IItem | null;
	hasParentItem(pItem: IItem): IItem | null;
	hasChildItem(pItem: IItem): IItem | null;

	hasRule(pRule: IRule, iPos: number): boolean;

	isEmpty(): boolean;
	isEqual(pState: IState, eType: EParserType): boolean;

	push(pItem: IItem): void;

	tryPush_LR0(pRule: IRule, iPos: number): boolean;
	tryPush_LR(pRule: IRule, iPos: number, sExpectedSymbol: string): boolean;

	deleteNotBase(): void;

	getNextStateBySymbol(sSymbol: string): IState | null;
	addNextState(sSymbol: string, pState: IState): boolean;

	toString(isBase?: boolean): string;

	getIndex(): number;
	setIndex(iIndex: number): void;

	getItems(): IItem[];
	getNumBaseItems(): number;
	getNextStates(): IMap<IState>;
}
