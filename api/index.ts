import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();
let app: any;

async function bootstrap() {
  const logger = new Logger('Serverless');
  logger.log('Bootstrapping NestJS...');
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
  logger.log('NestJS initialized successfully.');
}

const ALLOWED_ORIGIN = 'https://support-frontend-app.vercel.app';

function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req: any, res: any) {
  // ── Handle CORS preflight immediately — before NestJS boots ─────────────
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return;
  }

  // Set CORS headers on every real request too
  setCorsHeaders(res);

  try {
    if (!app) {
      await bootstrap();
    }

    // NestJS global prefix is 'api/v1', and Vercel routes already
    // forward the full /api/v1/... path. We must NOT strip it here
    // because expressApp (NestJS) expects the full path including the prefix.
    // Only strip legacy rewrites if present.
    if (req.url) {
      if (req.url.startsWith('/api/backend')) {
        req.url = req.url.replace('/api/backend', '');
      } else if (req.url.startsWith('/backend/api')) {
        req.url = req.url.replace('/backend/api', '');
      }
    }

    expressApp(req, res);
  } catch (err: any) {
    console.error('Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Backend Serverless Error',
        message: err?.message || String(err),
        stack: err?.stack,
      });
    }
  }
}
