import { EParseMode, EParserCode } from "../idl/parser/IParser";
import { EffectParser } from "./EffectParser";
import { isNull } from "../common"
import { logger } from "../logger";
import * as fs from "fs";
import { IMap } from "../idl/IMap";
import { IAFXTechniqueInstruction } from "../idl/IAFXInstruction";
import { IAFXEffect } from "../idl/IAFXEffect";
import { Effect } from "./Effect";

/** For addComponent/delComponent/hasComponent */
export const ALL_PASSES = 0xffffff;
/** Only for hasComponent */
export const ANY_PASS = 0xfffffa;
/** For addComponent/delComponent/hasComponent */
export const ANY_SHIFT = 0xfffffb;
/** For addComponent/delComponent/hasComponent  */
export const DEFAULT_SHIFT = 0xfffffc;

export let parser: EffectParser = null;
export let techniques: IMap<IAFXTechniqueInstruction> = {};

export function initParser(gramma: string, debugMode: boolean = false): boolean {
	let mode: number =
		EParseMode.k_Add |
		EParseMode.k_Negate |
		EParseMode.k_Optimize;

	if (debugMode) {
		mode |= EParseMode.k_DebugMode;
	}

	const effectParser: EffectParser = new EffectParser();

	if (effectParser.init(gramma, mode)) {
		parser = effectParser;
		return true;
	}

	return false;
}


function initFromParsedEffect(eCode: EParserCode, sFileName: string): boolean {
	if (eCode === EParserCode.k_Error) {
		logger.error(`Cannot parse effect: ${sFileName}`);
		return false;
	}

	let pSyntaxTree = parser.getSyntaxTree();
	var pEffect: IAFXEffect = new Effect;
	
	pEffect.setAnalyzedFileName(sFileName);
	if (!pEffect.analyze(pSyntaxTree)) {
		logger.warn("Error are occured during analyze of effect file '" + sFileName + "'.");
		return false;
	}

	return true;
}

export function loadSourceAsync(sFileName?: string): void {
	fs.readFile(sFileName, (pErr, data: Buffer) => {
		if (!isNull(pErr)) {
			logger.error("Can not load .afx file: '" + sFileName + "'");
		}
		else {
			let sData = data.toString();
			parser.setParseFileName(sFileName);
			parser.parse(sData, initFromParsedEffect);
		}
	});
}


