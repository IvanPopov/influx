const build         = `./build`;
const source        = `./src`
const sandbox       = `${source}/sandbox`;
const lib           = `${source}/lib`;
const semanticLess  = `./node_modules/semantic-ui-less`;

module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            debug: { 
                tsconfig: {
                    passThrough: true
                },
                // options: {
                //     verbose: true
                // }
            },
            live: {
                watch: [ lib, sandbox ],
                tsconfig: {
                    passThrough: true,
                },
                options: {
                    additionalFlags: `--build --verbose`
                }
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
                    // strictImports: true
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