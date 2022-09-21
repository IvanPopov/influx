'use strict';
import * as monaco from 'monaco-editor';

import IRichLanguageConfiguration = monaco.languages.LanguageConfiguration;
import ILanguage = monaco.languages.IMonarchLanguage;

export const conf: IRichLanguageConfiguration = {
    comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
    },
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
    ],
    autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '(', close: ')' },
        { open: '\'', close: '\'', notIn: ['string', 'comment'] },
        { open: '"', close: '"', notIn: ['string'] }
    ],
    surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: '\'', close: '\'' }
    ],
    folding: {
        markers: {
            start: new RegExp("^\\s*#pragma\\s+region\\b"),
            end: new RegExp("^\\s*#pragma\\s+endregion\\b")
        }
    }
};

// tslint:disable-next-line:no-object-literal-type-assertion
export const language = <ILanguage>{
    defaultToken: '',
    tokenPostfix: '.hlsl',

    brackets: [
        { token: 'delimiter.curly', open: '{', close: '}' },
        { token: 'delimiter.parenthesis', open: '(', close: ')' },
        { token: 'delimiter.square', open: '[', close: ']' },
        { token: 'delimiter.angle', open: '<', close: '>' }
    ],

    keywords: [
        'AppendStructuredBuffer',
        'auto',
        'bool',
        'break',
        'case',
        'const',
        'continue',
        'compile',
        'column_major',
        'decltype',
        'default',
        'do',
        'discard',
        'decl',
        'else',
        'enum',
        'extern',
        'false',
        'float',
        'float2',
        'float3',
        'float4',
        'float2x2',
        'float2x3',
        'float2x4',
        'float3x2',
        'float3x3',
        'float3x4',
        'float4x2',
        'float4x3',
        'float4x4',
        'for',
        'half',
        'if',
        'in',
        'inout',
        'inline',
        'int',
        'int2',
        'int3',
        'int4',
        'int64',
        'matrix',
        'new',
        'out',
        'pass',
        'provide',
        'row_major',
        'register',
        'restrict',
        'return',
        'RWBuffer',
        'RWStructuredBuffer',
        'sampler',
        'sampler1D',
        'sampler2D',
        'sampler3D',
        'static',
        'string',
        'struct',
        'switch',
        'technique',
        'true',
        'texture',
        'texture1D',
        'texture2D',
        'texture3D',
        'textureCube',
        'typedef',
        'union',
        'unsigned',
        'uint',
        'uint2',
        'uint3',
        'uint4',
        'uint64',
        'uniform',
        'vector',
        'void',
        'while',

        'asm',


        // partFX
        'partFx',
        'spawn',
        'draw',
        'preset'
    ],

    operators: [
        '=', '>', '<', '!', '~', '?', ':',
        '==', '<=', '>=', '!=', '&&', '||', '++', '--',
        '+', '-', '*', '/', '&', '|', '^', '%', '<<',
        '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
        '^=', '%=', '<<=', '>>=', '>>>='
    ],

    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/,
    floatsuffix: /[fFlL]?/,
    encoding: /u|u8|U|L/,

    // The main tokenizer for our languages
    tokenizer: {
        root: [
            // C++ 11 Raw String
            [/@encoding?R\"(?:([^ ()\\\t]*))\(/, { token: 'string.raw.begin', next: '@raw.$1' }],

            // identifiers and keywords
            [/[a-zA-Z_]\w*/, {
                cases: {
                    '@keywords': { token: 'keyword.$0' },
                    '@default': 'identifier'
                }
            }],

            // whitespace
            { include: '@whitespace' },

            // [[ attributes ]].
            [/\[\[.*\]\]/, 'annotation'],

            [/\s*#include/, { token: 'keyword.directive.include', next: '@include' }],

            // Preprocessor directive
            [/\s*#\s*\w+/, 'keyword'],

            // delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, {
                cases: {
                    '@operators': 'delimiter',
                    '@default': ''
                }
            }],

            // numbers
            [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, 'number.float'],
            [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, 'number.float'],
            [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, 'number.hex'],
            [/0[0-7']*[0-7](@integersuffix)/, 'number.octal'],
            [/0[bB][0-1']*[0-1](@integersuffix)/, 'number.binary'],
            [/\d[\d']*\d(@integersuffix)/, 'number'],
            [/\d(@integersuffix)/, 'number'],

            // delimiter: after number because of .\d floats
            [/[;,.]/, 'delimiter'],

            // strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
            [/"/, 'string', '@string'],

            // characters
            [/'[^\\']'/, 'string'],
            [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
            [/'/, 'string.invalid']
        ],

        whitespace: [
            [/[ \t\r\n]+/, ''],
            [/\/\*\*(?!\/)/, 'comment.doc', '@doccomment'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment']
        ],

        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],
        //Identical copy of comment above, except for the addition of .doc
        doccomment: [
            [/[^\/*]+/, 'comment.doc'],
            [/\*\//, 'comment.doc', '@pop'],
            [/[\/*]/, 'comment.doc']
        ],

        string: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
        ],

        raw: [
            [/(.*)(\))(?:([^ ()\\\t]*))(\")/, {
                cases: {
                    '$3==$S2': ['string.raw', 'string.raw.end', 'string.raw.end', { token: 'string.raw.end', next: '@pop' }],
                    '@default': ['string.raw', 'string.raw', 'string.raw', 'string.raw']
                }
            }
            ],
            [/.*/, 'string.raw']
        ],

        include: [
            [/(\s*)(<)([^<>]*)(>)/, ['', 'keyword.directive.include.begin', 'string.include.identifier', { token: 'keyword.directive.include.end', next: '@pop' }]],
            [/(\s*)(")([^"]*)(")/, ['', 'keyword.directive.include.begin', 'string.include.identifier', { token: 'keyword.directive.include.end', next: '@pop' }]]
        ]
    }
};
