const build         = './build';
const sandbox       = './src/sandbox';
const semanticLess  = './node_modules/semantic-ui-less';
// const codemirror    = './node_modules/codemirror';

module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            debug: { 
                tsconfig: 'tsconfig.json'
            },
            live: {
                watch: `${sandbox}`,
                tsconfig: 'tsconfig.json'
            }
        },
        clean: {
            debug: [`${build}`]
        },
        pug: {
            debug: {
                options: {
                    pretty: true,
                    data: {
                        debug: true,
                        timestamp: '<%= grunt.template.today() %>'
                    }
                },
                files: {
                    [`${build}/sandbox.html`]: `${sandbox}/index.pug`
                }
            }
        },
        copy: {
            debug: {
                files: [
                    { 
                        expand: true, 
                        cwd: `${sandbox}/assets/`, 
                        src: ['**'], 
                        dest: `${build}/assets` 
                    },
                    { 
                        expand: true, 
                        cwd: `${sandbox}/deps/`, 
                        src: ['react-ace/lib/*', 'react-ace/package.json', 'brace/index.js', 'brace/ext/*', 'brace/theme/*', 'brace/mode/*', 'brace/package.json'], 
                        dest: `${build}/sandbox/deps` 
                    },
                    // {
                    //     expand: true,
                    //     cwd: `${codemirror}/lib/`,
                    //     src: ['codemirror.css'],
                    //     dest: `${build}/assets/codemirror`
                    // },
                    // {
                    //     expand: true,
                    //     cwd: `${codemirror}/theme/`,
                    //     src: ['**'],
                    //     dest: `${build}/assets/codemirror/theme`
                    // },
                    {
                        expand: true,
                        cwd: `${semanticLess}/themes/default/assets`,
                        src: ['**'],
                        dest: `${build}/assets/themes/default/assets`
                    },
                    {
                        expand: true,
                        cwd: `${semanticLess}/themes/github/assets`,
                        src: ['**'],
                        dest: `${build}/assets/themes/github/assets`
                    }
                ]
            }
        },
        less: {
            debug: {
                options: {
                    sourceMap: true,
                },
                files: {
                    [`${build}/assets/themes/default/semantic.css`]: `${semanticLess}/semantic.less`
                }
            }
        }
    });
    // grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-pug');
    grunt.loadNpmTasks("grunt-ts");
    grunt.registerTask("default", ["copy", "pug", "less", "ts:debug"]);
};