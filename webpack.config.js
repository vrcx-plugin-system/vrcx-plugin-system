const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/index.ts",
    output: {
      filename: "custom.js",
      path: path.resolve(__dirname, "dist"),
      // No library export needed - we're injecting into global scope
    },
    resolve: {
      extensions: [".ts", ".js"],
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
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Keep console statements
            },
            format: {
              comments: false, // Remove comments
            },
          },
          extractComments: false, // Don't extract comments to separate file
        }),
      ],
    },
    devtool: false, // No source maps
    target: "web",
  };
};
