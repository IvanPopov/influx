export { default as ParserParameters } from './ParserParameters';
export { default as ASTView } from './ASTView';

// temp definition for react-jss compatibility
export interface IWithStyles<T> {
    classes?: {
        [P in keyof T]: string;
    }
};

