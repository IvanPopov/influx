import { AnyAction, combineReducers } from 'redux';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import IStoreState from '../store/IStoreState';
import parserParams, * as fromParserParams from './parserParams';
import sourceFile from './sourceFile';

export default combineReducers<IStoreState>({ sourceFile, parserParams });

export const getSourceCode = (state: IStoreState) => state.sourceFile.content;
export const getSourceFilename = (state: IStoreState) => state.sourceFile.filename;
export const getGrammar = (state: IStoreState) => fromParserParams.getGrammar(state.parserParams);
export const getParseMode = (state: IStoreState): EParseMode => state.parserParams.mode;
export const getParserType = (state: IStoreState): EParserType => state.parserParams.type;

