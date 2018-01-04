import { EParseMode, EParserCode } from "../idl/parser/IParser";
import { EffectParser } from "./EffectParser";
import { INullable, isNull } from "../common"
import * as uri from "../uri/uri"
import * as path from "../path/path"
import { logger } from "../logger";
import * as fs from "fs";

/** For addComponent/delComponent/hasComponent */
export const ALL_PASSES = 0xffffff;
/** Only for hasComponent */
export const ANY_PASS = 0xfffffa;
/** For addComponent/delComponent/hasComponent */
export const ANY_SHIFT = 0xfffffb;
/** For addComponent/delComponent/hasComponent  */
export const DEFAULT_SHIFT = 0xfffffc;

let parser: EffectParser = null;
let composer: IAFXComposer = null;

export function getParser(): EffectParser {
	return parser;
}

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


function _initFromParsedEffect(eCode: EParserCode, sFileName: string): void {
	if (eCode === EParserCode.k_Error) {
		logger.error(`Cannot parse effect: ${sFileName}`);
		return;
	}

	let pSyntaxTree = parser.getSyntaxTree();

	if (composer._loadEffectFromSyntaxTree(pSyntaxTree, sFileName)) {
		// todo: do something
	}
}

export function loadSource(sFileName?: string): boolean {
	// var sExt: string = path.parse(sFileName).getExt()
	fs.readFile(sFileName, (pErr, data: Buffer) => {
		if (!isNull(pErr)) {
			logger.error("Can not load .afx file: '" + sFileName + "'");
		}
		else {
			let sData = data.toString();
			parser.setParseFileName(sFileName);
			parser.parse(sData, _initFromParsedEffect);
		}
	});

	return true;
}


