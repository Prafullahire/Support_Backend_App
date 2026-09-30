import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

import { AppModule } from '../app.module';

const expressApp = express();

let app: any = null;
let bootstrapPromise: Promise<any> | null = null;

async function bootstrap() {
  const logger = new Logger('Vercel');

  logger.log('======================================');
  logger.log('STARTING NESTJS VERCEL FUNCTION');
  logger.log('======================================');

  logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'not-set'}`);
  logger.log(
    `DATABASE_URL exists: ${Boolean(process.env.DATABASE_URL)}`,
  );
  logger.log(
    `DIRECT_URL exists: ${Boolean(process.env.DIRECT_URL)}`,
  );
  logger.log(
    `JWT_SECRET exists: ${Boolean(process.env.JWT_SECRET)}`,
  );
  logger.log(
    `FRONTEND_URL: ${process.env.FRONTEND_URL || 'not-set'}`,
  );

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
    process.env.FRONTEND_URL ||
    'http://localhost:3000';

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
  logger.log('NESTJS INITIALIZED SUCCESSFULLY');
  logger.log('======================================');

  return app;
}

export default async function handler(
  req: any,
  res: any,
) {
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

          console.error(
            '❌ NESTJS BOOTSTRAP ERROR:',
            error,
          );

          throw error;
        });
      }

      await bootstrapPromise;
    }

    console.log('NestJS app is ready.');

    console.log('Normalized URL:', req.url);
    console.log('Sending request to NestJS...');

    return expressApp(req, res);
  } catch (error: any) {
    console.error('======================================');
    console.error('❌ SERVERLESS FUNCTION ERROR');
    console.error('======================================');

    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', error);

    console.error('======================================');

    if (!res.headersSent) {
      return res.status(500).json({
        statusCode: 500,
        message:
          error?.message ||
          'Backend Serverless Error',
      });
    }

    return;
  }
}