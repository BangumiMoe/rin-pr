var path = require("path");
var webpack = require("webpack");
var LessPluginAutoPrefix = require("less-plugin-autoprefix");
var LessPluginCleanCSS = require("less-plugin-clean-css");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var HTMLWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  context: path.resolve("./src"),
  entry: {
    app: "./target/web"
  },
  output: {
    path: path.resolve("./dist/web"),
    publicPath: "/",
    filename: "[name].js?[chunkhash:8]",
    chunkFilename: "[name].js?[chunkhash:8]"
  },
  module: {
    loaders: [
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract("style", "css!less?strictMath&strictUnits")
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract("style", "css")
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel?stage=0"
      },
      {
        test: /\.(png|jpg|gif|eot|svg|ttf|woff|woff2)$/,
        loader: "file?name=assets/[name].[ext]?[hash:8]"
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production")
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new ExtractTextPlugin("[name].css?[contenthash:8]", {
      allChunks: true
    }),
    new HTMLWebpackPlugin({
      filename: "index.html",
      title: "Bangumi.moe",
      minify: {
        collapseWhitespace: true
      },
      template: path.resolve("./src/assets/web/template.html")
    })
  ],
  lessLoader: {
    lessPlugins: [
      new LessPluginAutoPrefix({
        browsers: ["last 2 version", "> 1%", "IE >= 9"]
      }),
      new LessPluginCleanCSS({
        advanced: true
      })
    ]
  },
  devServer: {
    contentBase: path.resolve("./dist/web"),
    historyApiFallback: true
  }
};
