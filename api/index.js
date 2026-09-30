// // This is a static JS entry point for Vercel.
// // NestJS is pre-compiled by 'nest build' during postinstall.
// // Vercel bundles this file, which requires the compiled output from dist/.
// require('reflect-metadata');
// const handler = require('../dist/api/index.js');
// module.exports = handler.default || handler;
// Vercel serverless entry point.
// NestJS is compiled by 'nest build' → dist/
// This file is what Vercel actually invokes.
require('reflect-metadata');

const ALLOWED_ORIGIN = 'https://support-frontend-app.vercel.app';

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
}

const handlerModule = require('../dist/api/index.js');
const nestHandler = handlerModule.default || handlerModule;

module.exports = async function handler(req, res) {
    // Handle OPTIONS preflight immediately — before NestJS does anything
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(200).end();
        return;
    }

    // Set CORS headers on all other requests too
    setCorsHeaders(res);

    return nestHandler(req, res);
};
