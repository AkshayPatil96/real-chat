/**
 * MongoDB Transaction Helper Utility
 * 
 * Provides reusable transaction wrapper for atomic multi-collection operations
 * Ensures ACID compliance and automatic rollback on errors
 * 
 * Requirements:
 * - MongoDB replica set (required for transactions)
 * - Mongoose connection with replica set configured
 */

import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Execute a function within a MongoDB transaction
 * Automatically commits on success and rolls back on error
 * Falls back to non-transactional execution if transactions are not supported
 * 
 * @param callback - Function to execute within transaction (receives session)
 * @returns Result of the callback function
 * @throws Error if transaction fails
 * 
 * @example
 * const result = await withTransaction(async (session) => {
 *   const message = await Message.create([{ content: 'Hello' }], { session });
 *   await Conversation.updateOne({ _id: convId }, { lastMessage: {...} }, { session });
 *   return message[0];
 * });
 */
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  // Skip transactions in test environment or if connection is not ready
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  
  if (isTestEnv) {
    logger.warn('Test environment detected, executing without transaction');
    return callback(null);
  }
  
  if (mongoose.connection.readyState !== 1) {
    logger.warn('MongoDB connection not ready, executing without transaction');
    return callback(null);
  }

  let session: mongoose.ClientSession | null = null;

  try {
    // Try to start session with a short timeout
    session = await Promise.race([
      mongoose.startSession(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Session creation timeout')), 1000)
      )
    ]);
  } catch (error) {
    // If session creation fails (e.g., no replica set), execute without transaction
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Failed to start session, executing without transaction: ${errorMsg}`);
    return callback(null);
  }
  
  try {
    // Start transaction with default options
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      readPreference: 'primary',
    });

    // Execute callback with session
    const result = await callback(session);

    // Commit transaction if successful
    await session.commitTransaction();
    
    logger.info('Transaction committed successfully');
    return result;
    
  } catch (error) {
    // Rollback transaction on error
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    logger.error('Transaction aborted due to error');
    logger.error(error);
    throw error;
    
  } finally {
    // Always end session
    if (session) {
      session.endSession();
    }
  }
}

/**
 * Check if MongoDB is configured with replica set (required for transactions)
 * Logs warning if transactions are not supported
 * 
 * @returns true if transactions are supported, false otherwise
 */
export async function isTransactionSupported(): Promise<boolean> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      logger.warn('MongoDB admin access not available');
      return false;
    }

    const serverInfo = await admin.serverStatus();
    const isReplicaSet = serverInfo.repl && serverInfo.repl.setName;

    if (!isReplicaSet) {
      logger.warn(
        'MongoDB transactions require replica set configuration. ' +
        'Current setup does not support transactions. ' +
        'Operations will run without transaction safety.'
      );
      return false;
    }

    logger.info(`MongoDB replica set detected: ${serverInfo.repl.setName}`);
    return true;
    
  } catch (error) {
    logger.error('Error checking transaction support');
    logger.error(error);
    return false;
  }
}

/**
 * Retry a transaction if it fails due to transient errors
 * Useful for handling temporary network issues or write conflicts
 * 
 * @param callback - Function to execute within transaction
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of the callback function
 * @throws Error if all retries fail
 */
export async function withRetryableTransaction<T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is transient (retryable)
      const isTransientError = 
        lastError.message.includes('TransientTransactionError') ||
        lastError.message.includes('WriteConflict');

      if (!isTransientError || attempt === maxRetries) {
        throw lastError;
      }

      logger.warn(
        `Transaction attempt ${attempt} failed, retrying... ` +
        `Error: ${lastError.message}, Attempt: ${attempt}/${maxRetries}`
      );

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
}
