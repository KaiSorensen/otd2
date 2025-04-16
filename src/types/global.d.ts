declare module 'stream-http';
declare module 'https-browserify';
declare module 'react-native-crypto-js';
declare module 'stream-browserify';
declare module 'url';
declare module 'querystring-es3';
declare module 'path-browserify';
declare module 'os-browserify';
declare module 'timers-browserify';
declare module 'console-browserify';
declare module 'constants-browserify';
declare module 'domain-browser';
declare module 'react-native-fs';
declare module 'react-native-tcp';
declare module 'dns.js';

declare global {
  interface Window {
    process: any;
    Buffer: any;
    stream: any;
    http: any;
    https: any;
    crypto: any;
    EventEmitter: any;
    url: any;
    querystring: any;
    path: any;
    os: any;
    timers: any;
    console: any;
    constants: any;
    domain: any;
  }
} 