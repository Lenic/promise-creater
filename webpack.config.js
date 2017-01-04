module.exports = {
  entry: {
    'promise.min': './index'
  },
  output: {
    path: 'dist',
    libraryTarget: 'umd',
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.(es6|js)$/,
        exclude: /node_modules/,
        loader: 'babel'
      }
    ]
  }
}
