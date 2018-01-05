module.exports = function (grunt) {
    grunt.initConfig({
        ts: {
            debug: { tsconfig: 'tsconfig.json' }
        },
        clean: {
            debug: [ './build' ]
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
                    './build/index.html': './src/sandbox/index.pug'
                }
            }
        },
        copy: {
            debug: {
              files: [
                { expand: true, cwd: './src/sandbox/assets/', src: [ '**' ], dest: './build/assets' }
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