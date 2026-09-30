// This is a static JS entry point for Vercel.
// NestJS is pre-compiled by 'nest build' during postinstall.
// Vercel bundles this file, which requires the compiled output from dist/.
require('reflect-metadata');
const handler = require('../dist/api/index.js');
module.exports = handler.default || handler;
