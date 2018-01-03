export enum ELogLevel {
	NONE = 0x0000,
	LOG = 0x0001,
	INFORMATION = 0x0002,
	WARNING = 0x0004,
	ERROR = 0x0008,
	CRITICAL = 0x0010,
	ALL = 0x001F
}

export interface ILogRoutineFunc {
	(pEntity: ILoggerEntity): void;
}

export interface ISourceLocation {
	file: string;
	line: number;
}

export interface ILoggerEntity {
	code: number;
	location: ISourceLocation;
	message: string | null;
	info: any;
}

export interface ILogger {
	///**
	//* For plugin api:
	//* Load file with custom user codes and three messages
	//*/
	//loadManifestFile(): boolean;

	init(): boolean;

	setLogLevel(eLevel: ELogLevel): void;
	getLogLevel(): ELogLevel;

	registerCode(eCode: number, sMessage?: string): boolean;
	setUnknownCode(eCode: number, sMessage: string): void;

	registerCodeFamily(eCodeMin: number, eCodeMax: number, sFamilyName?: string): boolean;

	getFamilyName(eCode: number): string;

	setCodeFamilyRoutine(eCodeFromFamily: number, fnLogRoutine: ILogRoutineFunc, eLevel: number): boolean;
	setCodeFamilyRoutine(sFamilyName: string, fnLogRoutine: ILogRoutineFunc, eLevel: number): boolean;

	setLogRoutine(fnLogRoutine: ILogRoutineFunc, eLevel: number): void;

	setSourceLocation(sFile: string, iLine: number): void;
	setSourceLocation(pLocation: ISourceLocation): void;

	// Print messages methods

	time(sLabel: string): void;
	timeEnd(sLabel: string): void;

	group(...pArgs: any[]): void;
	groupEnd(): void;

	log(...pArgs: any[]): void;

	info(pEntity: ILoggerEntity): void;
	info(eCode: number, ...pArgs: any[]): void;
	info(...pArgs: any[]): void;

	warn(pEntity: ILoggerEntity): void;
	warn(eCode: number, ...pArgs: any[]): void;
	warn(...pArgs: any[]): void;

	error(pEntity: ILoggerEntity): void;
	error(eCode: number, ...pArgs: any[]): void;
	error(...pArgs: any[]): void;

	critical(pEntity: ILoggerEntity): void;
	critical(eCode: number, ...pArgs: any[]): void;
	critical(...pArgs: any[]): void;

	assert(bCondition: boolean, pEntity: ILoggerEntity): void;
	assert(bCondition: boolean, eCode: number, ...pArgs: any[]): void;
	assert(bCondition: boolean, ...pArgs: any[]): void;
}

