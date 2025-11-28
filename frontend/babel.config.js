module.exports = {
  presets: [
    ['module:metro-react-native-babel-preset'],
    'react-native',
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          'react-native$': 'react-native-web',
        },
      },
    ],
  ],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
    development: {
      plugins: ['react-native-paper/babel'],
    },
  },
};