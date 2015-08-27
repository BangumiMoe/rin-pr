var path = require("path");
var webpack = require("webpack");
var LessPluginAutoPrefix = require("less-plugin-autoprefix");
var LessPluginCleanCSS = require("less-plugin-clean-css");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var HTMLWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  context: path.resolve("./src"),
  entry: {
    vendor: [
      "babel/polyfill",
      "whatwg-fetch",
      "uritemplate",
      "immutable",
      "redux",
      "redux-thunk",
      "react",
      "react-redux",
      "react-router",
      "react-router/lib/BrowserHistory",
      "react-intl"
    ],
    app: "./target/web"
  },
  output: {
    path: path.resolve("./dist/web"),
    publicPath: "/",
    filename: "[name].js"
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
        loader: "babel?stage=0&optional[]=runtime"
      },
      {
        test: /\.(png|jpg|gif|eot|svg|ttf|woff|woff2)$/,
        loader: "file?name=assets/[path][name].[ext]?[hash]"
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
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
      filename: "[name].js",
      minChunks: Infinity
    }),
    new ExtractTextPlugin("[name].css", {
      allChunks: true
    }),
    new HTMLWebpackPlugin({
      filename: "index.html",
      title: "BiliDown",
      hash: true,
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
