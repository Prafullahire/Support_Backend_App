// Vercel Serverless Entry Point for NestJS
// This file is used by Vercel when rewrites target /api/index
// It bootstraps NestJS lazily and handles all requests.

require('reflect-metadata');

const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');

const expressApp = express();
let app;

async function bootstrap() {
  const { AppModule } = require('../src/app.module');

  app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  );

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://support-frontend-app.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
}

const ALLOWED_ORIGIN = 'https://support-frontend-app.vercel.app';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

module.exports = async function handler(req, res) {
  // Handle CORS preflight BEFORE NestJS boots (avoids cold-start 500s)
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return;
  }

  // Set CORS headers on every real request
  setCorsHeaders(res);

  try {
    if (!app) {
      await bootstrap();
    }

    expressApp(req, res);
  } catch (err) {
    console.error('Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Backend Serverless Error',
        message: err && err.message ? err.message : String(err),
      });
    }
  }
};
