const buildPath         = './build';
const sandboxPath       = './src/sandbox';
const semanticLessPath  = './node_modules/semantic-ui-less';
const codemirrorPath    = './node_modules/codemirror';

module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            debug: { 
                tsconfig: 'tsconfig.json'
            },
            live: {
                watch: `${sandboxPath}`,
                tsconfig: 'tsconfig.json'
            }
        },
        clean: {
            debug: [`${buildPath}`]
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
                    [`${buildPath}/index.html`]: `${sandboxPath}/index.pug`
                }
            }
        },
        copy: {
            debug: {
                files: [
                    { 
                        expand: true, 
                        cwd: `${sandboxPath}/assets/`, 
                        src: ['**'], 
                        dest: `${buildPath}/assets` 
                    },
                    { 
                        expand: true, 
                        cwd: `${sandboxPath}/deps/`, 
                        src: ['react-ace/lib/*', 'react-ace/package.json', 'brace/index.js', 'brace/ext/*', 'brace/theme/*', 'brace/mode/*', 'brace/package.json'], 
                        dest: `${buildPath}/sandbox/deps` 
                    },
                    {
                        expand: true,
                        cwd: `${codemirrorPath}/lib/`,
                        src: ['codemirror.css'],
                        dest: `${buildPath}/assets/codemirror`
                    },
                    {
                        expand: true,
                        cwd: `${codemirrorPath}/theme/`,
                        src: ['**'],
                        dest: `${buildPath}/assets/codemirror/theme`
                    },
                    {
                        expand: true,
                        cwd: `${semanticLessPath}/themes/default/assets`,
                        src: ['**'],
                        dest: `${buildPath}/assets/themes/default/assets`
                    },
                    {
                        expand: true,
                        cwd: `${semanticLessPath}/themes/github/assets`,
                        src: ['**'],
                        dest: `${buildPath}/assets/themes/github/assets`
                    }
                ]
            }
        },
        less: {
            debug: {
                options: {
                    sourceMap: true,
                    // rootpath: `${sandboxPath}`,
                    // relativeUrls: true,
                    // paths: [`${sandboxPath}/site/globals`, `${semanticLessPath}/`]
                },
                files: {
                    [`${buildPath}/assets/themes/default/semantic.css`]: `${semanticLessPath}/semantic.less`
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