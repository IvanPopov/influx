'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsConfigPathsPlugin = require('awesome-typescript-loader').TsConfigPathsPlugin;
const { CheckerPlugin } = require('awesome-typescript-loader')

const [, , command, value] = process.argv;
const isWeb = (process.env.APP_TARGET && process.env.APP_TARGET === 'WEB');

const srcPath       = `${__dirname}/src`;
const outputPath    = `${__dirname}/dist/${isWeb ? 'web' : 'electron'}`;
const indexPath     = `${outputPath}/${isWeb ? 'index' : 'index-electron'}.html`;
const sandboxPath   = `${srcPath}/sandbox`;

console.log({ outputPath, indexPath, isWeb })

let developersOptions = {
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
    }
};

let options = {
    resolve: {
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
                use: 'pug-loader'
            },
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader?help=true&verbose=true&build=true',
                exclude: [/node_modules/],
                options: {
                    useCache: true,
                    forceIsolatedModules: true
                }
            },
            { 
                enforce: "pre", 
                test: /\.js$/, 
                loader: "source-map-loader" 
            }
        ]
    },
    devServer: {
        contentBase: outputPath,
    },
    output: {
        path: outputPath,
        filename: '[name].[contenthash].js'
    },
    entry: './src/sandbox/index.tsx',
    plugins: [
        new HtmlWebpackPlugin({
            template: `${sandboxPath}/index-webpack.pug`,
            filename: indexPath,
            title: `Influx ${isWeb ? 'Web' : 'Electron'} App`
        }),
        new webpack.HashedModuleIdsPlugin(),
        new CheckerPlugin()
    ],
    node: {
        fs: 'empty'
    }
};

options.target = isWeb ? 'web' : 'electron-renderer'

module.exports = { ...options, ...developersOptions };
