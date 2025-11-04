import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as IOServer } from 'socket.io';

import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import tokenRoutes from './routes/tokenRoutes.js';
import translationRoutes from './routes/translationRoutes.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';
import logger from './utils/logger.js';

class App {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new IOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (config.server.nodeEnv === 'development') {
      this.app.use(requestLogger);
    }
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // API routes
    this.app.use('/api', tokenRoutes);
    this.app.use('/api/translation', translationRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Token Server API',
        version: '1.0.0',
        endpoints: {
          token: '/api/token',
          health: '/api/health',
          translation: {
            start: '/api/translation/sessions/start',
            stop: '/api/translation/sessions/:channel',
            status: '/api/translation/sessions/:channel/status',
            all: '/api/translation/sessions',
            oauth: '/api/translation/oauth/status'
          }
        }
      });
    });

    // 404 handler for undefined routes
    this.app.use(notFoundHandler);
  }

  /**
   * Setup Socket.IO handlers
   */
  setupSocketHandlers() {
    setupSocketHandlers(this.io);
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  start() {
    this.server.listen(config.server.port, config.server.host, () => {
      logger.info('Server started successfully', {
        port: config.server.port,
        host: config.server.host,
        environment: config.server.nodeEnv,
        endpoints: {
          api: `http://${config.server.host}:${config.server.port}/api`,
          health: `http://${config.server.host}:${config.server.port}/api/health`
        }
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    logger.info('Shutting down server...');
    
    this.server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

export default App;
