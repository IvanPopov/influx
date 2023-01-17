const path = require('path');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    target: 'electron-renderer',
    mode: "development",
    devtool: "inline-source-map",
    entry: {
        main: {
            import: `./src/shell/shell.ts`,
            filename: `shell.js`
        }
    },
    output: {
        path: path.resolve(__dirname, './')
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        plugins: [
            new TsConfigPathsPlugin(),
        ]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            }
        ]
    }
};
