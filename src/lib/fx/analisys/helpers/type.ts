import { EInstructionTypes, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { variable } from "./variable";
import { instruction } from "./instruction";
import { assert, isNull } from "@lib/common";

export namespace type {
    // todo: rename it
    /** @deprecated */
    export function isInheritedFromVariableDecl(type: ITypeInstruction): boolean {
        if (isNull(type.parent)) {
            return false;
        }
        const parentType = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_VariableDecl) {
            return true;
        }
        else if (parentType === EInstructionTypes.k_VariableType) {
            return isInheritedFromVariableDecl(<IVariableTypeInstruction>type.parent);
        }
        return false;
    }


    /** @deprecated */
    export function isTypeOfField(type: ITypeInstruction): boolean {
        if (isNull(type.parent)) {
            return false;
        }

        if (type.parent.instructionType === EInstructionTypes.k_VariableDecl) {
            let pParentDecl: IVariableDeclInstruction = <IVariableDeclInstruction>type.parent;
            return pParentDecl.isField();
        }

        return false;
    }


    /** @deprecated */
    export function findParentContainer(type: IVariableTypeInstruction): IVariableDeclInstruction {
        if (!isInheritedFromVariableDecl(type) || !isTypeOfField(type)) {
            return null;
        }

        let containerType: IVariableTypeInstruction = <IVariableTypeInstruction>findParentVariableDecl(type).parent;
        if (!isInheritedFromVariableDecl(containerType)) {
            return null;
        }

        return findParentVariableDecl(containerType);
    }


    /** @deprecated */
    export function findParentVariableDecl(type: ITypeInstruction): IVariableDeclInstruction {
        if (!isInheritedFromVariableDecl(type)) {
            return null;
        }

        let parentType: EInstructionTypes = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_VariableDecl) {
            return <IVariableDeclInstruction>type.parent;
        }

        return findParentVariableDecl(<IVariableTypeInstruction>type.parent);
    }


    /** @deprecated */
    export function findParentVariableDeclName(type: ITypeInstruction): string {
        let varDecl = findParentVariableDecl(type)
        return isNull(varDecl) ? null : varDecl.name;
    }



    /** @deprecated */
    export function finParentTypeDecl(type: ITypeInstruction): ITypeDeclInstruction {
        if (!isInheritedFromVariableDecl(type)) {
            return null;
        }

        let parentType = type.parent.instructionType;
        if (parentType === EInstructionTypes.k_TypeDecl) {
            return <ITypeDeclInstruction>type.parent;
        }
        return finParentTypeDecl(<ITypeInstruction>type.parent);
    }


    /** @deprecated */
    export function finParentTypeDeclName(type: IVariableTypeInstruction): string {
        let typeDecl = finParentTypeDecl(type);
        return isNull(typeDecl) ? null : typeDecl.name;
    }


    /** @deprecated */
    export function resolveVariableDeclFullName(type: ITypeInstruction): string {
        if (!isInheritedFromVariableDecl(type)) {
            console.error("Not from variable decl");
            return null;
        }

        return variable.fullName(findParentVariableDecl(type));
    }


    // todo: add comment
    // todo: review this code
    /** @deprecated */
    export function findMainVariable(type: ITypeInstruction): IVariableDeclInstruction {
        if (!isInheritedFromVariableDecl(type)) {
            return null;
        }

        if (isTypeOfField(type)) {
            return findMainVariable(<IVariableTypeInstruction>type.parent.parent);
        }
        return findParentVariableDecl(type);
    }

    //
    // Signatures
    //

    function signatureVType(vtype: IVariableTypeInstruction, strong: boolean): string {
        let prefix = '';
        if (strong) {
            if (vtype.usages.length > 0) {
                prefix = `${vtype.usages.join('_')}_`;
            }
        }
        let postfix = '';
        if (vtype.isNotBaseArray()) {
            postfix = '[]';
            if (vtype.length !== instruction.UNDEFINE_LENGTH) {
                postfix = `[${vtype.length}]`;
            }
        }

        return `${prefix}${signature(vtype.subType)}${postfix}`;
    }


    // function signatureVTypeRelaxed(vtype: IVariableTypeInstruction)


    export function signature(type: ITypeInstruction, strong: boolean = false): string {
        if (isNull(type)) {
            assert(!strong);
            return '*';
        }
        switch (type.instructionType) {
            case EInstructionTypes.k_VariableType:
                return signatureVType(<IVariableTypeInstruction>type, strong);
            case EInstructionTypes.k_ComplexType:
                return `${type.name}${type.instructionID}`;
            case EInstructionTypes.k_SystemType:
                return type.name;
            default:
                assert(false, 'unsupported type');
                return null;
        }
    }

    //
    // hash
    //

    function hashVType(vtype: IVariableTypeInstruction, strong: boolean): string {
        let postfix = '';
        if (strong ? vtype.isArray() : vtype.isNotBaseArray()) {
            postfix = '[]';
            if (vtype.length !== instruction.UNDEFINE_LENGTH) {
                postfix = `[${vtype.length}]`;
            }
        }

        return `${hash(vtype.subType)}${postfix}`;
    }

    function hashComplex(ctype: ITypeInstruction, strong: boolean): string {
        return `{${ctype.fields.map(field => hash(field.type, strong)).join(';')}}`;
    }

    export function hash(type: ITypeInstruction, strong: boolean = false): string {
        switch (type.instructionType) {
            case EInstructionTypes.k_VariableType:
                return hashVType(<IVariableTypeInstruction>type, strong);
            case EInstructionTypes.k_ComplexType:
                return hashComplex(type, strong);
            case EInstructionTypes.k_SystemType:
                return type.name;
            default:
                assert(false, 'unsupported type');
                return null;
        }
    }

    export function compareRelaxed(a: ITypeInstruction, b: ITypeInstruction, strong: boolean = false): boolean {
        return hash(a, strong) === hash(b, strong);
    }

    export function compare(a: ITypeInstruction, b: ITypeInstruction, strong: boolean = false): boolean {
        if (isNull(a) || isNull(b)) {
            return false;
        }
        if (a.isArray() && b.isArray()) {
            if (a.length === instruction.UNDEFINE_LENGTH ||
                b.length === instruction.UNDEFINE_LENGTH) {
                return false;
            }
        }
        return signature(a, strong) === signature(b, strong);
    }

    export function equals(a: ITypeInstruction, b: ITypeInstruction, strong: boolean = false): boolean {
        return compare(a, b, strong);
    }
}
