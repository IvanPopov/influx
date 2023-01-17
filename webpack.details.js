const path = require('path');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    target: 'node',
    mode: "development",
    devtool: "inline-source-map",
    entry: {
        main: {
            import: `./src/utils/details/entry.ts`,
            filename: `./dist/details.js`
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
