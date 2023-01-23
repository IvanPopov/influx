const path = require('path');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
    target: 'node',
    mode: "development",
    devtool: "inline-source-map",
    entry: {
        details: {
            import: `./src/utils/details.ts`,
            filename: `./dist/details.js`
        },
        deploy: {
            import: `./src/utils/deploy.ts`,
            filename: `./dist/deploy.js`
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
    },
    experiments: {
        topLevelAwait: true
    },
};
