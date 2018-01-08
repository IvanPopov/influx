import * as fs from 'fs';
import { Dispatch } from 'redux';
import { EParseMode, EParserType } from '../../lib/idl/parser/IParser';
import { PARSER_PARAMS_CHANGED, SOURCE_FILE_LOADED, SOURCE_FILE_LOADING_FAILED, SOURCE_FILE_REQUEST } from '../actions/ActionTypeKeys';
import IStoreState from '../store/IStoreState';
import { GRAMMAR_FILE_SPECIFIED } from './ActionTypeKeys';

export function openSource(filename: string): (dispatch: Dispatch<IStoreState>) => Promise<void> {
    return async (dispatch: Dispatch<IStoreState>) => {

        dispatch({ type: SOURCE_FILE_REQUEST, payload: { filename } });

        fs.readFile(filename, 'utf8', (error: Error, content: string) => {
            if (error) {
                dispatch({ type: SOURCE_FILE_LOADING_FAILED, payload: { error } });
            } else {
                dispatch({ type: SOURCE_FILE_LOADED, payload: { content } });
            }
        });
    };
}

export function openGrammar(filename: string): (dispatch: Dispatch<IStoreState>) => Promise<void> {
    return async (dispatch: Dispatch<IStoreState>) => {
        dispatch({ type: GRAMMAR_FILE_SPECIFIED, payload: { filename } });
    };
}

export function setParserParams(type: EParserType, mode: number): (dispatch: Dispatch<IStoreState>) => Promise<void> {
    return async (dispatch: Dispatch<IStoreState>) => {
        dispatch({ type: PARSER_PARAMS_CHANGED, payload: { type, mode } });
    };
}
