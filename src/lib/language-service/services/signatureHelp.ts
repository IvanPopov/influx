import { Visitor } from "@lib/fx/Visitors";
import { EInstructionTypes, IFunctionCallInstruction, IFunctionDeclInstruction, IInstruction } from "@lib/idl/IInstruction";
import { ISLDocument } from "@lib/idl/ISLDocument";
import { checkRange } from "@lib/parser/util";
import { ParameterInformation, Position, SignatureHelp, SignatureInformation, TextDocument } from "vscode-languageserver-types";

const asRange = (instr: IInstruction) => instr.sourceNode.loc;

export class SLSignatureHelp {
    doSignatureHelp(textDocument: TextDocument, position: Position, slDocument: ISLDocument): SignatureHelp {
        if (!slDocument) {
            return null;
        }
        
        const offset = textDocument.offsetAt(position);
        const decl = slDocument.root.instructions.find(instr => checkRange(asRange(instr), offset));
        
        if (decl) {
            // console.log(decl);
            if (decl.instructionType === EInstructionTypes.k_FunctionDecl) {

                let fcall: IFunctionCallInstruction = null;
                Visitor.each(decl, instr => {
                    if (instr.instructionType === EInstructionTypes.k_FunctionCallExpr) {
                        if (checkRange(asRange(instr), offset)) {
                            fcall = <IFunctionCallInstruction>instr;
                        }
                    }
                });

                if (!fcall) {
                    return null;
                }

                const fdecl = <IFunctionDeclInstruction>fcall.decl;
                const fnList = fdecl.scope.functions[fdecl.name];
                const signatures = fnList.map(fn =>
                    SignatureInformation.create(
                        fn.def.toCode(),
                        null, // no documentation provided
                        ...fn.def.params.map(param => ParameterInformation.create(param.name))
                    ));

                let activeSignature = fnList.indexOf(fdecl);
                let activeParameter = 0;

                if (activeSignature !== -1) {
                    activeParameter = fcall.args.findIndex(arg =>
                        checkRange(asRange(arg), offset));
                } else {
                    activeSignature = 0;
                    console.error(`could not find active signature for: '${fdecl.def.toCode()}'`);
                }

                return { signatures, activeParameter, activeSignature };
            }
        }
        return null;
    }
}