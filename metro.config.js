/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 *
 * @format
 */

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  // Allow metro to resolve files from src directory
  resolver: {
    alias: {
      '@': './src',
    },
    extensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  },
  // Add source map support for debugging
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  // Configure file extensions
  sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
  // Configure asset extensions
  assetExts: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ttf', 'otf'],
  // Maximum worker count
  maxWorkers: 4,
  // Enable source maps in development
  devServer: {
    https: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);