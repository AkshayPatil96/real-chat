import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB with production-ready connection pool settings
 * 
 * Connection Pool Configuration:
 * - maxPoolSize: Maximum number of connections in the pool (10)
 * - minPoolSize: Minimum number of connections kept alive (2)
 * - maxIdleTimeMS: Close idle connections after 10 seconds
 * - serverSelectionTimeoutMS: Timeout for initial connection (5 seconds)
 * - socketTimeoutMS: Timeout for socket operations (45 seconds)
 */
export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(config.db.uri, {
      // Production Hardening: Connection pool configuration
      maxPoolSize: 10, // Max connections (default: 100, reduced for efficiency)
      minPoolSize: 2, // Keep minimum connections alive
      maxIdleTimeMS: 10000, // Close idle connections after 10s
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Socket timeout (45s)
    });
    
    logger.info('Connected to MongoDB with connection pool (maxPoolSize: 10, minPoolSize: 2)');

    // Production Hardening: Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(err, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Log connection pool stats periodically (every 5 minutes)
    if (config.env !== 'test') {
      setInterval(() => {
        logger.debug(`MongoDB connection stats - readyState: ${mongoose.connection.readyState}, host: ${mongoose.connection.host}, db: ${mongoose.connection.name}`);
      }, 300000); // 5 minutes
    }
  } catch (error: any) {
    logger.error(error, 'MongoDB Connection Failed');
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  try {
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed.');
  } catch (error: any) {
    logger.error(error, 'Error closing MongoDB connection');
    throw error;
  }
}
