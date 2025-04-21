const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      crypto: require.resolve('react-native-crypto-js'),
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),
      zlib: require.resolve('browserify-zlib'),
      util: require.resolve('util/'),
      buffer: require.resolve('buffer/'),
      asset: require.resolve('assert/'),
      url: require.resolve('url/'),
      querystring: require.resolve('querystring-es3'),
      path: require.resolve('path-browserify'),
      fs: require.resolve('react-native-fs'),
      net: require.resolve('react-native-tcp'),
      tls: require.resolve('react-native-tcp'),
      dns: require.resolve('dns.js'),
      os: require.resolve('os-browserify/browser.js'),
      timers: require.resolve('timers-browserify'),
      console: require.resolve('console-browserify'),
      constants: require.resolve('constants-browserify'),
      domain: require.resolve('domain-browser'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

