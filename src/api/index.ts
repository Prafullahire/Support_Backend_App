import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();

let app: any = null;
let bootstrapPromise: Promise<any> | null = null;

async function bootstrap() {
  const logger = new Logger('Vercel');

  logger.log('======================================');
  logger.log('Starting NestJS serverless function');
  logger.log('======================================');

  logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'not-set'}`);
  logger.log(`DATABASE_URL exists: ${Boolean(process.env.DATABASE_URL)}`);
  logger.log(`DIRECT_URL exists: ${Boolean(process.env.DIRECT_URL)}`);
  logger.log(`JWT_SECRET exists: ${Boolean(process.env.JWT_SECRET)}`);
  logger.log(`FRONTEND_URL exists: ${Boolean(process.env.FRONTEND_URL)}`);

  logger.log('Loading AppModule...');

  const { AppModule } = await import('../app.module');

  logger.log('AppModule loaded successfully.');

  logger.log('Creating NestJS application...');

  app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  logger.log('NestJS application created.');

  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:3000';

  app.enableCors({
    origin: frontendUrl,
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

  logger.log('Initializing NestJS...');

  await app.init();

  logger.log('======================================');
  logger.log('NestJS initialized successfully');
  logger.log('======================================');

  return app;
}

export default async function handler(req: any, res: any) {
  try {
    console.log('======================================');
    console.log('SERVERLESS REQUEST START');
    console.log('======================================');

    console.log('Method:', req.method);
    console.log('Original URL:', req.url);

    if (!app) {
      if (!bootstrapPromise) {
        bootstrapPromise = bootstrap().catch((error) => {
          bootstrapPromise = null;
          throw error;
        });
      }

      await bootstrapPromise;
    }

    if (req.url) {
      if (req.url.startsWith('/api/backend')) {
        req.url = req.url.replace('/api/backend', '');
      } else if (req.url.startsWith('/backend/api')) {
        req.url = req.url.replace('/backend/api', '');
      }
    }

    console.log('Normalized URL:', req.url);
    console.log('Sending request to NestJS...');

    return expressApp(req, res);
  } catch (error: any) {
    console.error('======================================');
    console.error('SERVERLESS FUNCTION ERROR');
    console.error('======================================');

    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', error);

    console.error('======================================');

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Backend Serverless Error',
        message: error?.message || 'Unknown serverless error',
      });
    }

    return;
  }
}