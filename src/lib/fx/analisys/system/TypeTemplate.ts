import { IScope, ITypeInstruction, ITypeTemplate } from "@lib/idl/IInstruction";

class TypeTemplate implements ITypeTemplate {
    readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    produceType(scope: IScope, args?: ITypeInstruction[]): ITypeInstruction {
        return null;
    }

    typeName(args?: ITypeInstruction[]): string {
        if (args && args.length > 0) {
            return `${this.name}<${args.map(arg => arg.name).join(', ')}>`;
        }
        return this.name;
    }
}

export default TypeTemplate;
