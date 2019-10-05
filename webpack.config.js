'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsConfigPathsPlugin = require('awesome-typescript-loader').TsConfigPathsPlugin;
const { CheckerPlugin } = require('awesome-typescript-loader');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const GitRevisionPlugin = require('git-revision-webpack-plugin');
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

const DEVELOPMENT = mode == 'development';
const PRODUCTION = mode == 'production';
const ENABLE_PROFILING = false;             // turn it on to compile minified version with source map support enabled

console.log({ outputPath, isWeb, mode });

let optimization = {
    minimize: PRODUCTION,
    runtimeChunk: 'single',
    namedModules: !PRODUCTION,
    namedChunks: !PRODUCTION,
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
                cache: true,
                parallel: true,
                terserOptions: {
                    arguments: true,
                    booleans_as_integers: true
                }
            })
        ]
    };

    devtool = false;
}

let options = {
    mode,
    optimization,
    target,
    resolve: {
        alias: {
            '../../theme.config$': path.join(__dirname, 'theme.config')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        plugins: [
            new TsConfigPathsPlugin(),
        ]
    },
    devtool,
    module: {
        rules: [
            {
                test: /\.pug$/,
                loader: "pug-loader?pretty=true",
                query: { pretty: true },
                exclude: /(node_modules)/,
            },
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                exclude: [/node_modules/],
                options: {
                    useCache: true,
                    forceIsolatedModules: true,
                    include: [/node_modules[\/\\]semantic-ui-react/]
                }
            },
            {
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader"
            },
            {
                test: /[.]less$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader', options: { sourceMap: true } },
                    { loader: 'less-loader', options: { sourceMap: true } },
                ],
                include: [/[\/\\]node_modules[\/\\]semantic-ui-less[\/\\]/]
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 10240,
                        absolute: true,
                        name: 'images/[name]-[hash:7].[ext]'
                    }
                },
                include: [/[\/\\]node_modules[\/\\]semantic-ui-less[\/\\]/]
            }, {
                test: /\.(woff|woff2|ttf|svg|eot)$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 10240,
                        name: 'fonts/[name]-[hash:7].[ext]'
                    }
                },
                include: [/[\/\\]node_modules[\/\\]semantic-ui-less[\/\\]/]
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    devServer: {
        contentBase: outputPath,
    },
    output,
    entry: [`${sandboxPath}/index.tsx`, `${sandboxPath}/index-webpack.pug`],
    plugins: [
        new CopyPlugin([
            {
                context: `${sandboxPath}/assets/`,
                from: `**/*`,
                to: `${outputPath}/assets`
            }
        ]),
        new HtmlWebpackPlugin({
            template: `!!pug-loader!${sandboxPath}/index-webpack.pug`,
            filename: `${outputPath}/${isWeb ? 'index' : 'index-electron'}.html`,
            title: `Influx ${isWeb ? 'Web' : 'Electron'} App | ver-${version}.${branch}`,
            minify: false
        }),
        new webpack.HashedModuleIdsPlugin(),
        new CheckerPlugin(),
        new MiniCssExtractPlugin(),
        new GitRevisionPlugin(),
        gitRevisionPlugin,
        new webpack.DefinePlugin({
            'VERSION': JSON.stringify(version),
            'COMMITHASH': JSON.stringify(commithash),
            'BRANCH': JSON.stringify(branch),
            'MODE': JSON.stringify(mode),
            'PRODUCTION': PRODUCTION,
            'global': {}
        }),
        new MonacoWebpackPlugin({
            languages: ['cpp', 'powershell']
        })
    ],
    node: {
        fs: 'empty'
    }
};

module.exports = options;
