
import { IInstructionCollector, IScope } from "./../idl/IInstruction";
import { isNull } from "util";
import { isDefAndNotNull } from "../common";


class Report {
    protected _errors: Array<{ code: number, desc: Object }> = [];

    protected emitException(): void {
        throw new Error("critical occured");
    }

    error(code, desc) { this._errors.push({ code, desc }) }
    warning(code, desc) { }
    note(code, desc) { }

    // add error and emit an exception in order to interrupt processing
    critical(code, desc) {
        this.error(code, desc);

    }

    prettyPrint(): string {
        return JSON.stringify(this._errors, null, '\t');
    }

    hasErrors(): boolean {
        return this._errors.length > 0;
    }
}

enum EErrors {
    k_EntryPointNotFound, // main not found
}

export function translate(entryPoint: string, program: IInstructionCollector): string {

    let report: Report = new Report;
    let scope: IScope = program.scope;

    try {
        let mainFunc = scope.findFunction(entryPoint, []);

        if (!isDefAndNotNull(mainFunc)) {
            report.critical(EErrors.k_EntryPointNotFound, { entryPoint });
        }

        

    } catch (e) {
        console.error(report.prettyPrint());
    }

    return null;
}