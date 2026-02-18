import * as path from "path";
import * as webpack from "webpack";

const config = [
    (env: any, args: any): webpack.Configuration => ({
        mode: args.mode === "production" ? "production" : "development",
        target: "electron-main",
        entry: {
            main: "./main.ts",
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].bundle.js",
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
    }),
    (env: any, args: any): webpack.Configuration => ({
        mode: args.mode === "production" ? "production" : "development",
        target: "electron-preload",
        entry: {
            preload: "./preload.ts",
        },
        output: {
            path: path.resolve(__dirname, "dist"),
            filename: "[name].bundle.js",
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
    }),
];

export default config;