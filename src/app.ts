/**
 * Express application setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createRoutes } from './routes';
import { ApiController } from './controllers';
import { performanceMonitoring, errorHandler, notFoundHandler } from './middleware';
import { config } from './config';

export function createApp(): { app: express.Application; apiController: ApiController } {
  const app = express();
  const apiController = new ApiController();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Compression middleware (set threshold to 1kb for test compatibility)
  app.use(compression({ threshold: '1kb' }));

  // Body parsing middleware
  app.use(express.json({ limit: config.maxRequestSize }));
  app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

  // Performance monitoring middleware
  app.use(performanceMonitoring);

  // API routes
  app.use('/api', createRoutes(apiController));

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Mallorca Travel Backend',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return { app, apiController };
}