const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    library: 'Fit',
    libraryTarget: 'umd',
    filename: 'build.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/Fit/demo/js/'
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'inline-source-map',
  devServer: {
    open: true,
    openPage: "demo/index.html",
    contentBase: path.join(__dirname, '.'),
    watchContentBase: true,
    port: 4567,
  }
}