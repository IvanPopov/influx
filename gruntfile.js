const buildPath = './build';
const sandboxPath = './src/sandbox';

module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            debug: { tsconfig: 'tsconfig.json' }
        },
        clean: {
            debug: [ `${buildPath}` ]
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
                { expand: true, cwd: `${sandboxPath}/assets/`, src: [ '**' ], dest: `${buildPath}/assets` },
                { 
                    expand: true, 
                    cwd: './node_modules/codemirror/lib/', 
                    src: [ 'codemirror.css' ], 
                    dest: `${buildPath}/assets/codemirror` 
                },
                { 
                    expand: true, 
                    cwd: './node_modules/codemirror/theme/', 
                    src: [ '**' ], 
                    dest: `${buildPath}/assets/codemirror/theme` 
                }
              ]
            }
        }
    });
    // grunt.loadNpmTasks("grunt-tslint");
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-pug');
    grunt.loadNpmTasks("grunt-ts");
    grunt.registerTask("default", ["copy", "pug", "ts"]);
};