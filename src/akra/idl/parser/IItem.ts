/// <reference path="../IMap.ts" />
/// <reference path="IState.ts" />
/// <reference path="IParser.ts" />

module akra.parser {
	export interface IItem {
		isEqual(pItem: IItem, eType?: EParserType): boolean;
		isParentItem(pItem: IItem): boolean;
		isChildItem(pItem: IItem): boolean;

		mark(): string;
		end(): string;
		nextMarked(): string;

		toString(): string;

		isExpected(sSymbol: string): boolean;
		addExpected(sSymbol: string): boolean;

		getRule(): IRule;
		setRule(pRule: IRule): void;

		getPosition(): number;
		setPosition(iPosition: number): void;

		getIndex(): number;
		setIndex(iIndex: number): void;

		getState(): IState | null;
		setState(pState: IState | null): void;

		getIsNewExpected(): boolean;
		setIsNewExpected(isNewExpected: boolean): void;

		getExpectedSymbols(): IMap<boolean>;		
		getLength(): number;
	}
}