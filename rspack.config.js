const path = require("path");
const rspack = require("@rspack/core");

module.exports = {
  entry: {
    popup: "./src/popup/popup.ts",
    content: "./src/content.ts",
    background: "./src/background.ts",
    sidepanel: "./src/sidepanel/sidepanel.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  mode: "production",
  experiments: {
    css: false,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "builtin:swc-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [rspack.CssExtractRspackPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new rspack.CssExtractRspackPlugin({}),
    new rspack.HtmlRspackPlugin({
      template: "./src/popup/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
    }),
    new rspack.HtmlRspackPlugin({
      template: "./src/sidepanel/sidepanel.html",
      filename: "sidepanel.html",
      chunks: ["sidepanel"],
    }),
    new rspack.CopyRspackPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
  ],
};
