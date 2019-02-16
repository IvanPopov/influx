export { default as ParserParameters } from '../containers/ParserParameters';
export { default as ASTView } from './ASTView';
export { default as SourceEditor } from '../containers/SourceEditor';
export { default as ProgramView } from './ProgramView';
export { default as FileListView } from './FileListView';
export { default as MemoryView } from './MemoryView';
export { default as BytecodeView } from '../containers/BytecodeView';

// temp definition for react-jss compatibility
export interface IWithStyles<T> {
    classes?: {
        [P in keyof T]: string;
    }
};

