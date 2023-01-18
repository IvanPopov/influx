import { isDefAndNotNull } from "@lib/common";
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { EAnalyzerWarnings as EWarnings } from '@lib/idl/EAnalyzerWarnings';
import { EDiagnosticCategory } from "@lib/idl/IDiagnostics";
import { IFile, IRange } from "@lib/idl/parser/IParser";
import { Diagnostics } from "@lib/util/Diagnostics";

interface IAnalyzerDiagDesc {
    file: IFile;
    loc: IRange;
    info: any; // TODO: fixme
}


export class AnalyzerDiagnostics extends Diagnostics<IAnalyzerDiagDesc> {
    constructor() {
        super("Analyzer Diagnostics", 'A');
    }

    protected resolveFilename(category: EDiagnosticCategory, code: number, desc: IAnalyzerDiagDesc): string {
        return desc.file.toString();
    }

    protected resolveRange(category: EDiagnosticCategory, code: number, desc: IAnalyzerDiagDesc): IRange {
        return desc.loc;
    }

    protected diagnosticMessages() {
        // TODO: fill all errors.
        // TODO: add support for warnings
        return {
            [EErrors.InvalidReturnStmtEmpty]: 'Invalid return statement. Expression with \'*type*\' type expected.', // TODO: specify type
            [EErrors.InvalidReturnStmtVoid]: 'Invalid return statement. Expression with \'void\' type expected.',
            [EErrors.FunctionRedefinition]: 'Function redefinition. Function with name \'{info.funcName}\' already declared.', // TODO: add location where function declared before
            [EErrors.InvalidFuncDefenitionReturnType]: 'Invalid function defenition return type. Function with the same name \'{info.funcName}\' but another type already declared.', // TODO: specify prev type and location
            [EErrors.InvalidFunctionReturnStmtNotFound]: 'Return statement expected.', // TODO: specify func name and return type details.
            [EErrors.InvalidVariableInitializing]: 'Invalid variable initializing.',
            [EErrors.InvalidComplexNotFunction]: ({ info }: IAnalyzerDiagDesc) => 
                `Function definition for "${info.funcName}(${info.args.join(', ')})" has not been found.`
        };
    }

    protected resolveDescription(code: number, category: EDiagnosticCategory, desc: IAnalyzerDiagDesc): string {
        let descList = this.diagnosticMessages();
        if (isDefAndNotNull(descList[code])) {
            return super.resolveDescription(code, category, desc);
        }

        let { file, loc, ...data } = desc;
        if (category == EDiagnosticCategory.k_Warning) {
            return `${EWarnings[code]}: ${JSON.stringify(data)}`;
        }
        return `${EErrors[code]}: ${JSON.stringify(data)}`;
    }
}
