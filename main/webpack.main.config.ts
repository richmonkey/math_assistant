import * as path from "path";
import * as webpack from "webpack";
// in case you run into any typescript error when configuring `devServer`


const config: webpack.Configuration = {
    mode: "production",
    target: "electron-main",
    entry: "./main.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "main.bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts"],
    },
};

export default config;