require('reflect-metadata');
const serverless = require('serverless-http');
const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ExpressAdapter } = require('@nestjs/platform-express');

// Compiled by `nest build` (see build command in netlify.toml)
const { AppModule } = require('../../dist/app.module');

const FUNCTION_PREFIX = '/.netlify/functions/api';

let handlerPromise = null;

async function bootstrap() {
  const expressApp = express();

  // Normalize incoming paths so NestJS always sees /api/v1/...
  expressApp.use((req, _res, next) => {
    if (req.url.startsWith(FUNCTION_PREFIX)) {
      req.url = req.url.slice(FUNCTION_PREFIX.length) || '/';
    }
    if (req.url === '/health' || req.url.startsWith('/health?')) {
      req.url = '/api/v1' + req.url;
    }
    next();
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn', 'log'],
  });

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

  return serverless(expressApp, { binary: ['multipart/form-data', 'application/octet-stream', 'image/*', 'application/pdf'] });
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!handlerPromise) {
    handlerPromise = bootstrap().catch((err) => {
      handlerPromise = null;
      throw err;
    });
  }

  try {
    const handler = await handlerPromise;
    return await handler(event, context);
  } catch (err) {
    console.error('NestJS bootstrap/request error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusCode: 500, message: 'Backend Serverless Error' }),
    };
  }
};
