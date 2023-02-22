import { assert, isNull } from "@lib/common";
import { EInstructionTypes, ITypeDeclInstruction, ITypeInstruction, IVariableDeclInstruction, IVariableTypeInstruction } from "@lib/idl/IInstruction";

import { isDefAndNotNull } from "@lib/util/s3d/type";
import { instruction } from "./instruction";
import { variable } from "./variable";

export namespace types {

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
        // skip all variable type wrappers
        // is it safe?
        let subType = vtype.subType;
        while (subType.instructionType == EInstructionTypes.k_VariableType)
            subType = (<IVariableTypeInstruction>subType).subType;
        return `${prefix}${signature(subType)}${postfix}`;
    }


    // function signatureVTypeRelaxed(vtype: IVariableTypeInstruction)


    export function signature(type: ITypeInstruction, strong: boolean = false): string {
        if (!isDefAndNotNull(type)) {
            assert(!strong);
            return '*';
        }
        switch (type.instructionType) {
            case EInstructionTypes.k_VariableType:
                return signatureVType(<IVariableTypeInstruction>type, strong);
            case EInstructionTypes.k_ComplexType:
                return `${type.name}${type.instructionID}`;
            case EInstructionTypes.k_ProxyType:
                return type.baseType ? signature(type.baseType) : type.name;
            case EInstructionTypes.k_SystemType:
                return type.name;
            default:
                assert(false, 'unsupported type');
                return null;
        }
    }

    // export function relaxType(type: ITypeInstruction): ITypeInstruction | RegExp {
    //     if (!type) {
    //         return null;
    //     }


    //     if (types.equals(type, T_INT) || types.equals(type, T_UINT)) {
    //         // temp workaround in order to match int to uint and etc. 
    //         return /^int$|^uint$/g;
    //     }

    //     return type;
    // }


    // // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    // export function asRelaxedType(instr: ITypedInstruction): ITypeInstruction | RegExp {
    //     if (!instr) {
    //         return null;
    //     }

    //     return relaxType(instr.type);
    // };

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
            case EInstructionTypes.k_ProxyType:
                return type.baseType ? hash(type.baseType) : type.name;
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

    // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    export function compare(a: ITypeInstruction | RegExp, b: ITypeInstruction | RegExp, strong: boolean = false): boolean {
        if (isNull(a) || isNull(b)) {
            return false;
        }

        if (a instanceof RegExp && b instanceof RegExp) {
            assert(false);
            return false;
        }

        if (a instanceof RegExp) {
            let ra = <RegExp>a;
            let sb = signature(<ITypeInstruction>b, strong);
            return !!sb.match(ra);
        }

        if (b instanceof RegExp) {
            let sa = signature(<ITypeInstruction>a, strong);
            let rb = <RegExp>b;
            return !!sa.match(rb);
        }

        let ta = <ITypeInstruction>a;
        let tb = <ITypeInstruction>b;
        if (ta.isArray() && tb.isArray()) {
            if (ta.length === instruction.UNDEFINE_LENGTH ||
                tb.length === instruction.UNDEFINE_LENGTH) {
                
                // wnen both types are undefined is valid 
                if (ta.length !== tb.length) {
                    return false;
                }
            }
        }
        return signature(ta, strong) === signature(tb, strong);
    }

    // FIXME: refuse from the regular expressions in favor of a full typecasting graph
    export function equals(a: ITypeInstruction | RegExp, b: ITypeInstruction | RegExp, strong: boolean = false): boolean {
        return compare(a, b, strong);
    }

    //
    // utils
    //

    export function alignSize(size: number, aligment: number): number {
        if (size === instruction.UNDEFINE_SIZE) {
            return size;
        }
        
        const unaligned = size % aligment;
        return unaligned !== 0 ? size + aligment - unaligned : size;
    }
}
