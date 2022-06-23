'use strict';
const webpack = require('webpack');
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

const isWeb = (process.env.APP_TARGET && process.env.APP_TARGET.toUpperCase() === 'WEB');
const srcPath = `${__dirname}/src`;
const outputPath = `${__dirname}/dist/${isWeb ? 'web' : 'electron'}`;
const sandboxPath = `${srcPath}/sandbox`;
const version = `${require("./package.json").version}.${gitRevisionPlugin.version()}`;
const commithash = gitRevisionPlugin.commithash();
const branch = gitRevisionPlugin.branch();
const mode = process.env.NODE_ENV || 'development';
const timestamp = String(new Date());

const DEVELOPMENT = mode == 'development';
const PRODUCTION = mode == 'production';
const ENABLE_PROFILING = false;             // turn it on to compile minified version with source map support enabled

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
                        debug: !PRODUCTION,
                        additionalFlags: [ 
                            `-I${__dirname}\\src\\`,
                            `-I${__dirname}\\src\\lib\\idl\\bundles\\` // << flatbuffers root
                         ].map(f => f.replace(/\\/g, '/'))
                    }
                }
            }
            // { 
            //     test: /\.json$/, 
            //     type: 'json' 
            // }
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
    entry: [
        `${sandboxPath}/index.tsx`
    ],
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
                }
            ]
        }),
        new HtmlWebpackPlugin({
            template: `!!pug3-loader!${sandboxPath}/index-webpack.pug`,
            filename: `${outputPath}/${isWeb ? 'index' : 'index-electron'}.html`,
            title: `Influx ${isWeb ? 'Web' : 'Electron'} App | ver-${version}.${branch}`,
            minify: false
        }),
        new HtmlWebpackPlugin({
            template: `!!pug3-loader!${sandboxPath}/../site/code-view.pug`,
            filename: `${outputPath}/code-view.html`,
            minify: false
        }),
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
            'global': {}
        }),
        new MonacoWebpackPlugin({
            languages: ['cpp', 'powershell']
        })
    ],
    resolve: {
        fallback: {
            fs: false
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
