'use strict';
const webpack = require('webpack');
const fs = require('fs');;
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { GitRevisionPlugin } = require('git-revision-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const gitRevisionPlugin = new GitRevisionPlugin()

const [, , command, value] = process.argv;

const locate = (filename) => process.env.PATH.split(/[:;]/).find(dir => fs.existsSync(path.join(dir, filename)));

const isWeb = (process.env.APP_TARGET && process.env.APP_TARGET.toUpperCase() === 'WEB');
const srcPath = `${__dirname}/src`;
const outputPath = `${__dirname}/dist/${isWeb ? 'web' : 'electron'}`;
const sandboxPath = `${srcPath}/sandbox`;
const version = `${require("./package.json").version}.${gitRevisionPlugin.version()}`;
const commithash = gitRevisionPlugin.commithash();
const branch = gitRevisionPlugin.branch();
const mode = process.env.NODE_ENV || 'development';
const timestamp = String(new Date());
const compilerBin = process.platform == 'win32' ? 'em++.bat' : 'em++';
const emcc = locate(compilerBin); // path to emcc compiler

const DEVELOPMENT = mode == 'development';
const PRODUCTION = mode == 'production';
const ENABLE_PROFILING = false;             // turn it on to compile minified version with source map support enabled

function emitFolderManifest(dir, root = dir) {
    const cont = fs.readdirSync(dir);
    const res = {};
    cont.forEach(name => {
        const sub = path.join(dir, name);
        if (fs.statSync(sub).isDirectory()) 
            res[name] = emitFolderManifest(sub, root);
        else    
            res[name] = path.relative(root, sub).replace(new RegExp('\\' + path.sep, 'g'), '/');
    });
    return res;
}

let optimization = {
    nodeEnv: mode,
    mangleExports: PRODUCTION,
    minimize: PRODUCTION,
    runtimeChunk: 'single',
    // namedModules: !PRODUCTION,
    // namedChunks: !PRODUCTION,
    moduleIds: 'named',
    chunkIds: 'named',
    splitChunks: {
        cacheGroups: {
            vendors: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all'
            }
        }
    }
};

let output = {
    path: outputPath,
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].bundle.js',
};

let devtool = 'source-map';
let target = isWeb ? 'web' : 'electron-renderer';

if (PRODUCTION && !ENABLE_PROFILING) {
    optimization = {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    compress: true
                }
            }),
            // new OptimizeCSSAssetsPlugin({
            //     assetNameRegExp: /\.css$/g,
            //     cssProcessor: require('cssnano'),
            //     cssProcessorOptions: { discardComments: { removeAll: true } },
            //     canPrint: true
            // })
        ]
    };

    devtool = false;
}

let options = {
    mode,
    optimization,
    target,
    devtool,
    module: {
        rules: [
            {
                test: /\.pug$/,
                exclude: /(node_modules)/,
                use: [{
                    loader: "pug3-loader?pretty=true",
                    options: {
                        pretty: true
                    }
                }]
            },
            // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
                options: {
                    // useCache: true,
                    // forceIsolatedModules: true,
                    // include: [/node_modules[\/\\]semantic-ui-react/]
                }
            },

            {
                enforce: "pre",
                test: /\.js$/,
                use: [{
                    loader: "source-map-loader"
                }],
            },
            {
                test: /[.]less$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader', options: { sourceMap: !PRODUCTION } },
                    {
                        loader: 'less-loader',
                        options: {
                            sourceMap: !PRODUCTION,
                            lessOptions: {
                                math: "always"
                            },
                        }
                    }
                ],
                include: [/[\/\\]node_modules[\/\\]semantic-ui-less[\/\\]/]
            },
            {
                test: /\.css$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.gr/,
                type: 'asset/source'
            },
            {
                test: /\.hlsl/,
                type: 'asset/source'
            },
            {
                test: /\.glsl$/i,
                use: 'raw-loader',
            },
            {
                test: /\.(jpe?g|svg|png|gif|ico|eot|ttf|woff2?)(\?v=\d+\.\d+\.\d+)?$/i,
                type: 'asset/resource',
            },
            {
                test: /\.cpp$/,
                use: {
                    loader: path.resolve(__dirname, 'webpack-addons/cpp-loader.js'),
                    options: {
                        sourceMaps: !PRODUCTION,
                        // debug: !PRODUCTION, // uncomment to build with -O0 instead of -O3
                        additionalFlags: [
                            `-I${__dirname}\\src\\lib\\idl\\bundles\\` // << flatbuffers root
                        ].map(f => f.replace(/\\/g, '/')),
                        defines: { EMCC_ENV: 1 } // to indicate that we are inside of emcc enviroment
                    }
                }
            },
            {
                test: /\.json$/,
                type: 'json'
            }
        ]
    },
    ignoreWarnings: [/Failed to parse source map/],
    devServer: {
        static: {
            directory: outputPath
        },
        compress: PRODUCTION,
        port: 8080,
        client: {
            progress: true,
            reconnect: true
        }
    },
    output,
    entry: {
        ['sandbox']: `${sandboxPath}/sandbox.tsx`,
        ['preview']: `${sandboxPath}/preview.tsx`,
        ['part-view']: `${sandboxPath}/part-view.tsx`,
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new CopyPlugin({
            patterns: [
                {
                    context: `${sandboxPath}/assets/`,
                    from: `**/*`,
                    to: `${outputPath}/assets`
                },
                // copy empty file in order to fill it with list of
                // files presented 
                {
                    from: `${sandboxPath}/assets/manifest.json`,
                    to:   `${outputPath}/assets/manifest.json`,
                    transform (content, path) {
                        return JSON.stringify(emitFolderManifest(`${sandboxPath}/assets/`, sandboxPath), null, '   ');
                    }
                 }
            ]
        }),
        new HtmlWebpackPlugin({
            template: `!!pug3-loader!${sandboxPath}/index-webpack.pug`,
            filename: `${outputPath}/${isWeb ? 'index' : 'sandbox-electron'}.html`,
            title: `Influx ${isWeb ? 'Web' : 'Electron'} App | ver-${version}.${branch}`,
            minify: false,
            chunks: ['sandbox'],
        }),
        new HtmlWebpackPlugin({
            template: `!!pug3-loader!${sandboxPath}/index-webpack.pug`,
            filename: `${outputPath}/${isWeb ? 'preview' : 'preview-electron'}.html`,
            title: `Influx ${isWeb ? 'Web' : 'Electron'} App | ver-${version}.${branch}`,
            minify: false,
            chunks: ['preview'],
        }),
        new HtmlWebpackPlugin({
            template: `!!pug3-loader!${sandboxPath}/../site/part-view.pug`,
            filename: `${outputPath}/part-view.html`,
            minify: false,
            chunks: ['part-view']
        }),
        // new HtmlWebpackPlugin({
        //     template: `!!pug3-loader!${sandboxPath}/../site/code-view.pug`,
        //     filename: `${outputPath}/code-view.html`,
        //     minify: false
        // }),
        new webpack.ids.HashedModuleIdsPlugin(),
        // new CheckerPlugin(),
        new MiniCssExtractPlugin(),
        new GitRevisionPlugin(),
        gitRevisionPlugin,
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
            'VERSION': JSON.stringify(version),
            'COMMITHASH': JSON.stringify(commithash),
            'BRANCH': JSON.stringify(branch),
            'MODE': JSON.stringify(mode),
            'TIMESTAMP': JSON.stringify(timestamp),
            'PRODUCTION': PRODUCTION,
            'WASM': !!emcc,
            'global': {}
        }),
        new MonacoWebpackPlugin({
            languages: ['cpp', 'powershell']
        })
    ],
    resolve: {
        fallback: {
            fs: false,
            os: false,
            child_process: false,
            buffer: false
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
            '../../theme.config$': path.join(__dirname, 'theme.config'),
        },
        symlinks: false,
        plugins: [
            new TsConfigPathsPlugin(),
        ]
    },
    // stats: 'verbose'

    experiments: {
        topLevelAwait: true
    },
};

module.exports = options;
