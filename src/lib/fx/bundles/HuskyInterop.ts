import { assert, isArray, isBoolean, isDef, isDefAndNotNull, isNull, isNumber, isObject, isString } from "@lib/common";
import { IFxBundle, ISerializable } from "@lib/idl/bundles/IFxBundle";
import { IMap } from "@lib/idl/IMap";

const STRING_T = 'dsSTRING';
const VECTOR_T = 'dsVECTOR';
const JSON_T = 'dsJSON';
const ERROR_T = 'apERROR';

export function reader(data: ISerializable<string> | ISerializable<string>[]): string {
    const knownTypeNames = new Set<string>();
    const knownTypes = new Set<string>();

    ////

    const types: IMap<IMap<string>> = {};
    const arrays = new Set<string>();
    const unions = new Set<string>();
    const structs = new Set<string>();

    const declChunks = [];
    const funcChunks = [
        `${ERROR_T} parseJson(const ${JSON_T}& json, ${STRING_T}& value)
{
\tvalue = json.Str();
\treturn apEMPTY_ERROR;
}

${ERROR_T} parseJson(const ${JSON_T}& json, unsigned int& value)
{
\tvalue = (unsigned int)json.Int();
\treturn apEMPTY_ERROR;
}

${ERROR_T} parseJson(const ${JSON_T}& json, uint8_t& value)
{
\tvalue = (uint8_t)json.Int();
\treturn apEMPTY_ERROR;
}

${ERROR_T} parseJson(const ${JSON_T}& json, bool& value)
{
\tvalue = json.Bool();
\treturn apEMPTY_ERROR;
}`
        ,
        array('unsigned int'),
        array('uint8_t'),
        array('bool'),
        array(STRING_T)
    ];

    function typeRename(type: string) {
        if ([STRING_T, 'bool', 'unsigned int'].indexOf(type) != -1) return type;
        return 'ifx' + type.split('-').map(part => part.toUpperCase()).join('_');
    }

    function typeFields(type: string) {
        return Object.keys(types[type]);
    }

    function array(type: string): string {
        return (
            `${ERROR_T} parseJson(const ${JSON_T}& json, ${VECTOR_T}<${type}>& value)
{
\tvalue.Clear();
\tfor (int i = 0; i < json.Length(); ++ i)
\t{
\t\tauto& el = value.PushBack();
\t\tparseJson(json.At(i), el);
\t}
\treturn apEMPTY_ERROR;
}`
        );
    }

    function arrayName(type: string): string {
        return (`${ERROR_T} parseJson(const ${JSON_T}& json, ${VECTOR_T}<${type}>& value);`);
    }

    function union(type: string): string {
        const fields = typeFields(type);
        return (
            `${ERROR_T} parseJson(const ${JSON_T}& json, ${type}& value)
{
\tconst ${JSON_T}& data = json.Get("union");
\t${STRING_T} type = json.Get("type").Str();
\tvalue.type = type;
${fields.map(field => `\tif (type == "${field}") parseJson(data.Get("${field}"), value.${field}); `).join('\n')}
\treturn apEMPTY_ERROR;
}`
        );
    }

    function unionName(type: string): string {
        return (`${ERROR_T} parseJson(const ${JSON_T}& json, ${type}& value);`);
    }

    function struct(type: string): string {
        const fields = typeFields(type);
        return (
            `${ERROR_T} parseJson(const ${JSON_T}& json, ${type}& value)
{
${fields.map(field => `\tparseJson(json.Get("${field}"), value.${field}); `).join('\n')}
\treturn apEMPTY_ERROR;
}`
        );
    }

    function structName(type: string): string {
        return (`${ERROR_T} parseJson(const ${JSON_T}& json, ${type}& value);`);
    }

    function emitFunc(chunk: string) {
        if (chunk)
            funcChunks.push(chunk);
    }

    function emitDecl(chunk: string) {
        if (chunk)
            declChunks.push(chunk);
    }

    function addType(type: string, fields: { name: string, type: string }[]) {
        let info = types[type] = types[type] || {};
        fields.forEach(field => { info[field.name] = field.type; });
    }

    function addArray(type: string) {
        arrays.add(type);
    }

    function addUnion(type: string) {
        unions.add(type);
    }

    function addStruct(type: string) {
        structs.add(type);
    }

    function decl(type: string, fields: { name: string, type: string }[]): string {
        if (knownTypes.has(type)) return null;
        knownTypes.add(type);
        return (
            `struct ${type}
{
${fields.map(field => `\t${field.type} ${field.name} ${ field.type.indexOf(VECTOR_T) != -1 ? '{ AP_CL }' : '' };`).join('\n')}
};`
        );
    }

    function declu(type: string, fields: { name: string, type: string }[]): string {
        if (knownTypes.has(type)) return null;
        knownTypes.add(type);
        return (
            `struct ${type}
{
\t${STRING_T} type;
${fields.map(field => `\t${field.type} ${field.name} ${ field.type.indexOf(VECTOR_T) != -1 ? '{ AP_CL }' : '' };`).join('\n')}
};`
        );
    }

    function declName(type: string, fields: { name: string, type: string }[]): string {
        if (knownTypeNames.has(type)) return null;
        knownTypeNames.add(type);
        return ( `struct ${type};` );
    }


    function isSerialiazable(data: any) {
        return isObject(data) && isString(data['struct']);
    }

    function isBasic(data: any) {
        return isString(data) || isNumber(data) || isBoolean(data) || isNull(data);
    }


    function isSerializableArray(data: any) {
        return isArray(data) && data.length > 0 && isSerialiazable(data[0]);
    }

    function asType(data) {
        if (isString(data)) return STRING_T;
        if (isNumber(data)) return 'unsigned int';
        if (isBoolean(data)) return 'bool';

        assert(!isNull(data), 'invalid data');

        if (isSerializableArray(data)) return `${VECTOR_T}<${typeRename(data[0].struct)}>`;
        if (isArray(data)) return `${VECTOR_T}<${asType(data[0])}>`;
        if (data instanceof Uint8Array) return `${VECTOR_T}<uint8_t>`;
        return `${typeRename(data.struct)}`;
    }

    function addReader(data: any): void {
        if (isBasic(data)) {
            return;
        }

        if (isSerializableArray(data)) {
            data.forEach(value => value && addReader(value));
            addArray(asType(data[0]));
            return;
        }

        if (isArray(data) || (data instanceof Uint8Array)) {
            return;
        }

        let type = data['struct'] as string;
        assert(isDef(type), 'unserializable object is found');

        let isUnion = !!data['union'];
        let content = isUnion ? data['union'] : data;
        let fieldNames = Object.keys(content).filter(key => key != 'struct' && isDefAndNotNull(content[key]));
        let fields = fieldNames.map(name => ({ name, type: asType(content[name]) }));

        fieldNames.forEach(field => addReader(content[field]));

        addType(asType(data), fields);

        if (isUnion) {
            addUnion(asType(data));
            return;
        }

        addStruct(asType(data));
    }

    function emitTypeName(type: string) {
        if (!isDef(types[type])) return;

        let fields = Object.keys(types[type]).map(name => ({ name, type: types[type][name] }));
        fields.forEach(field => emitTypeName(field.type));
        emitDecl(declName(type, fields));
    }

    function emitType(type: string) {
        if (!isDef(types[type])) return;

        let fields = Object.keys(types[type]).map(name => ({ name, type: types[type][name] }));
        fields.forEach(field => emitType(field.type));
        emitDecl(unions.has(type) ? declu(type, fields) : decl(type, fields));
    }

    addReader(data);

    Object.keys(types).forEach(type => emitTypeName(type));
    Object.keys(types).forEach(type => emitType(type));

    Array.from(structs).forEach(type => emitFunc(structName(type)));
    Array.from(unions).forEach(type => emitFunc(unionName(type)));
    Array.from(arrays).forEach(type => emitFunc(arrayName(type)));
    Array.from(structs).forEach(type => emitFunc(struct(type)));
    Array.from(unions).forEach(type => emitFunc(union(type)));
    Array.from(arrays).forEach(type => emitFunc(array(type)));

    return ([...declChunks, ...funcChunks].join("\n\n"));
}