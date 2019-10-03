'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsConfigPathsPlugin = require('awesome-typescript-loader').TsConfigPathsPlugin;
const { CheckerPlugin } = require('awesome-typescript-loader');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
var GitRevisionPlugin = require('git-revision-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const gitRevisionPlugin = new GitRevisionPlugin()

const [, , command, value] = process.argv;
const isWeb = (process.env.APP_TARGET && process.env.APP_TARGET.toUpperCase() === 'WEB');

const srcPath = `${__dirname}/src`;
const outputPath = `${__dirname}/dist/${isWeb ? 'web' : 'electron'}`;
const sandboxPath = `${srcPath}/sandbox`;

console.log({ outputPath, isWeb });

let options = {
    mode: 'development',
    optimization: {
        minimize: false,
        runtimeChunk: 'single',
        namedModules: true,
        namedChunks: true,
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
    },
    resolve: {
        alias: {
            '../../theme.config$': path.join(__dirname, 'theme.config')
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        plugins: [
            new TsConfigPathsPlugin(),
        ]
    },
    devtool: 'source-map',
    mode: process.env.NODE_ENV,
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
    output: {
        path: outputPath,
        filename: '[name].[contenthash].js',
        chunkFilename: '[name].[contenthash].bundle.js',
    },
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
            title: `Influx ${isWeb ? 'Web' : 'Electron'} App`,
            minify: false
        }),
        new webpack.HashedModuleIdsPlugin(),
        new CheckerPlugin(),
        new MiniCssExtractPlugin(),
        new GitRevisionPlugin(),
        gitRevisionPlugin,
        new webpack.DefinePlugin({
            'VERSION': JSON.stringify(`${require("./package.json").version}.${gitRevisionPlugin.version()}`),
            'COMMITHASH': JSON.stringify(gitRevisionPlugin.commithash()),
            'BRANCH': JSON.stringify(gitRevisionPlugin.branch()),
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

options.target = isWeb ? 'web' : 'electron-renderer'

module.exports = options;
