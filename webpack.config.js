const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ChunkManifestPlugin = require('chunk-manifest-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const WebpackCleanupPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
  entry: ['webpack-hot-middleware/client', './src/sandbox/app.ts'],
  output: {
    filename: '[name].js',
    chunkFilename: "[id].js",
    path: path.resolve(__dirname, 'build'),
    // publicPath: 'build'
  },

  devtool: "source-map",
  // devtool: "inline-source-map",

  node: {
    fs: "empty"
  }, 
  devServer: {
    contentBase: 'build',
    // hot: true,
    compress: true,
    // open: true,
    // inline: true
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  },

  module: {
    rules: [
      { test: /\.tsx?$/, loader: "awesome-typescript-loader" },
      { test: /\.css$/, loader: ExtractTextPlugin.extract({ fallback:"style-loader", use: "css-loader" }) },
      { test: /\.less$/, loader: ExtractTextPlugin.extract({ fallback:"style-loader", use: ['css-loader?sourceMap=true', 'less-loader?sourceMap=true'] })},  
      { test: /\.png$/, loader: 'file-loader' },
      { test: /\.pug$/, loader: 'pug-loader', options: { pretty: true } },
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
    ]
  },

  plugins: [
    new CopyWebpackPlugin([ { from: './src/sandbox/CodeMirror-2.23', to: './CodeMirror-2.23/' }]),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      // favicon: './src/assets/images/favicon.ico',
      template: './src/sandbox/index.pug',
      title: 'Influx'
    }),
    // new ChunkManifestPlugin({
    //   filename: 'manifest.json',
    //   manifestVariable: 'webpackManifest',
    //   inlineManifest: false 
    // }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'vendor',
    //   minChunks: function (module) {
    //     return module.context && module.context.indexOf('node_modules') !== -1;
    //   }
    // }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'manifest'
    // }),
    new ExtractTextPlugin("[name].css"),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new WebpackCleanupPlugin([ './build' ])
  ],
};