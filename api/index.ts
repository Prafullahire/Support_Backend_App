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

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      await bootstrap();
    }

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
