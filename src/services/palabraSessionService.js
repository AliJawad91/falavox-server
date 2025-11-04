import axios from 'axios';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';
import palabraOAuthService from './palabraOAuthService.js';

class PalabraSessionService {
  constructor() {
    this.apiUrl = config.translation.apiUrl;
    this.cacheTimeout = config.translation.session.cacheTimeout;
    this.maxSessions = config.translation.session.maxSessions;
    this.activeSessions = new Map(); // channel -> session data
    this.sessionCleanupInterval = null;
    
    // Start session cleanup interval
    this.startSessionCleanup();
  }

  /**
   * Check if session service is available
   * @returns {boolean} True if service is configured
   */
  isAvailable() {
    return palabraOAuthService.isAvailable();
  }

  /**
   * Create a new Palabra translation session for a channel
   * @param {string} channel - Agora channel name
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @param {Object} options - Additional session options
   * @returns {Promise<Object>} Session information
   */
  async createSession(channel, sourceLanguage, targetLanguage, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Palabra session service is not configured');
      }

      // Check if session already exists for this channel
      const existingSession = this.getActiveSession(channel);
      if (existingSession) {
        logger.info('Using existing Palabra session', { channel, sessionId: existingSession.sessionId });
        return existingSession;
      }

      // Check session limit
      if (this.activeSessions.size >= this.maxSessions) {
        this.cleanupExpiredSessions();
        if (this.activeSessions.size >= this.maxSessions) {
          throw new Error('Maximum number of active sessions reached');
        }
      }

      logger.info('Creating new Palabra session', {
        channel,
        sourceLanguage,
        targetLanguage,
        options
      });

      // Get OAuth token
      const accessToken = await palabraOAuthService.getValidToken();

      // Create session request
      const sessionRequest = {
        channel_name: channel,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        audio_format: options.audioFormat || 'pcm',
        sample_rate: options.sampleRate || 16000,
        channels: options.channels || 1,
        ...options
      };

      // Request session from Palabra
      const response = await axios.post(`${this.apiUrl}/sessions`, sessionRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: config.translation.timeout
      });

      if (!response.data.session_id) {
        throw new Error('Invalid session response from Palabra');
      }

      // Store session information
      const sessionData = {
        sessionId: response.data.session_id,
        channel: channel,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        streamUrl: response.data.stream_url,
        websocketUrl: response.data.websocket_url,
        status: 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + this.cacheTimeout,
        options: options,
        accessToken: accessToken
      };

      this.activeSessions.set(channel, sessionData);

      logger.info('Palabra session created successfully', {
        channel,
        sessionId: sessionData.sessionId,
        streamUrl: sessionData.streamUrl,
        expiresAt: new Date(sessionData.expiresAt).toISOString()
      });

      return sessionData;

    } catch (error) {
      logger.error('Failed to create Palabra session', {
        channel,
        sourceLanguage,
        targetLanguage,
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  /**
   * Get active session for a channel
   * @param {string} channel - Channel name
   * @returns {Object|null} Session data or null if not found/expired
   */
  getActiveSession(channel) {
    const session = this.activeSessions.get(channel);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() >= session.expiresAt) {
      logger.info('Session expired, removing from cache', { channel, sessionId: session.sessionId });
      this.activeSessions.delete(channel);
      return null;
    }

    return session;
  }

  /**
   * End a translation session
   * @param {string} channel - Channel name
   * @returns {Promise<boolean>} True if session was ended successfully
   */
  async endSession(channel) {
    try {
      console.log("endSession receive a call.", this.activeSessions);
      
      this.activeSessions.forEach((value, key) => {
        console.log(`ACtive Channel: ${key}`, value);
      });
      
      const session = this.activeSessions.get(channel);
      if (!session) {
        logger.warn('Attempted to end non-existent session', { channel });
        return false;
      }

      logger.info('Ending Palabra session', { channel, sessionId: session.sessionId });

      // Call Palabra API to end session
      const response = await axios.delete(`${this.apiUrl}/sessions/${session.sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json'
        },
        timeout: config.translation.timeout
      });

      // Remove from cache
      this.activeSessions.delete(channel);

      logger.info('Palabra session ended successfully', { channel, sessionId: session.sessionId });
      return true;

    } catch (error) {
      logger.error('Failed to end Palabra session', {
        channel,
        error: error.message,
        response: error.response?.data
      });
      
      // Remove from cache even if API call failed
      this.activeSessions.delete(channel);
      return false;
    }
  }

  /**
   * Get session status for a channel
   * @param {string} channel - Channel name
   * @returns {Object} Session status information
   */
  getSessionStatus(channel) {
    const session = this.getActiveSession(channel);
    
    return {
      hasSession: !!session,
      sessionId: session?.sessionId || null,
      status: session?.status || 'inactive',
      sourceLanguage: session?.sourceLanguage || null,
      targetLanguage: session?.targetLanguage || null,
      streamUrl: session?.streamUrl || null,
      websocketUrl: session?.websocketUrl || null,
      createdAt: session?.createdAt || null,
      expiresAt: session?.expiresAt || null,
      isExpired: session ? Date.now() >= session.expiresAt : true
    };
  }

  /**
   * Get all active sessions
   * @returns {Array} List of active sessions
   */
  getAllActiveSessions() {
    const sessions = [];
    for (const [channel, session] of this.activeSessions.entries()) {
      if (Date.now() < session.expiresAt) {
        sessions.push({
          channel,
          sessionId: session.sessionId,
          sourceLanguage: session.sourceLanguage,
          targetLanguage: session.targetLanguage,
          status: session.status,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        });
      }
    }
    return sessions;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [channel, session] of this.activeSessions.entries()) {
      if (now >= session.expiresAt) {
        logger.debug('Cleaning up expired session', { channel, sessionId: session.sessionId });
        this.activeSessions.delete(channel);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', { count: cleanedCount });
    }
  }

  /**
   * Start automatic session cleanup
   */
  startSessionCleanup() {
    // Clean up every 5 minutes
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);

    logger.info('Started automatic session cleanup');
  }

  /**
   * Stop automatic session cleanup
   */
  stopSessionCleanup() {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
      logger.info('Stopped automatic session cleanup');
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      activeSessions: this.activeSessions.size,
      maxSessions: this.maxSessions,
      cacheTimeout: this.cacheTimeout,
      isConfigured: this.isAvailable(),
      sessions: this.getAllActiveSessions()
    };
  }
}

export default new PalabraSessionService();

