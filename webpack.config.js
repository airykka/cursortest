const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/client/app.ts',
    output: {
      filename: 'app.js',
      path: path.resolve(__dirname, 'public/dist'),
      clean: true,
      publicPath: '/dist/',
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      port: 3001,
      hot: true,
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
      },
      historyApiFallback: true,
      proxy: [
        {
          context: ['/api', '/config', '/health', '/test-auth', '/data'],
          target: 'http://localhost:3000',
        },
      ],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.client.json',
                transpileOnly: !isProduction,
                compilerOptions: {
                  module: 'esnext',
                },
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            'postcss-loader',
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src/client'),
      },
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
            compress: {
              drop_console: isProduction,
            },
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'styles.css',
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      }),
    ],
  };
};
