import palabraSessionService from '../services/palabraSessionService.js';
import palabraOAuthService from '../services/palabraOAuthService.js';
import logger from '../utils/logger.js';

class TranslationSessionController {
  /**
   * Start translation session for a channel
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startTranslation(req, res) {
    try {
      const { channel, sourceLanguage, targetLanguage, options = {} } = req.body;

      // Validate required parameters
      if (!channel) {
        return res.status(400).json({
          success: false,
          error: 'Channel name is required'
        });
      }

      if (!sourceLanguage || !targetLanguage) {
        return res.status(400).json({
          success: false,
          error: 'Source and target languages are required'
        });
      }

      // Validate language codes
      if (!this.isValidLanguageCode(sourceLanguage) || !this.isValidLanguageCode(targetLanguage)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid language codes provided'
        });
      }

      logger.info('Starting translation session', {
        channel,
        sourceLanguage,
        targetLanguage,
        options
      });

      // Create Palabra session
      const sessionData = await palabraSessionService.createSession(
        channel,
        sourceLanguage,
        targetLanguage,
        options
      );

      // Return session information to client
      res.json({
        success: true,
        data: {
          sessionId: sessionData.sessionId,
          channel: sessionData.channel,
          sourceLanguage: sessionData.sourceLanguage,
          targetLanguage: sessionData.targetLanguage,
          streamUrl: sessionData.streamUrl,
          websocketUrl: sessionData.websocketUrl,
          status: sessionData.status,
          createdAt: sessionData.createdAt,
          expiresAt: sessionData.expiresAt
        }
      });

    } catch (error) {
      logger.error('Failed to start translation session', {
        error: error.message,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Failed to start translation session',
        message: error.message
      });
    }
  }

  /**
   * Stop translation session for a channel
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async stopTranslation(req, res) {
    try {
      const { channel } = req.params;

      if (!channel) {
        return res.status(400).json({
          success: false,
          error: 'Channel name is required'
        });
      }

      logger.info('Stopping translation session', { channel });

      const success = await palabraSessionService.endSession(channel);

      if (success) {
        res.json({
          success: true,
          message: 'Translation session stopped successfully',
          data: { channel }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Translation session not found or already ended'
        });
      }

    } catch (error) {
      logger.error('Failed to stop translation session', {
        error: error.message,
        channel: req.params.channel
      });

      res.status(500).json({
        success: false,
        error: 'Failed to stop translation session',
        message: error.message
      });
    }
  }

  /**
   * Get translation session status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSessionStatus(req, res) {
    try {
      const { channel } = req.params;

      if (!channel) {
        return res.status(400).json({
          success: false,
          error: 'Channel name is required'
        });
      }

      const status = palabraSessionService.getSessionStatus(channel);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get session status', {
        error: error.message,
        channel: req.params.channel
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get session status',
        message: error.message
      });
    }
  }

  /**
   * Get all active translation sessions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllSessions(req, res) {
    try {
      const sessions = palabraSessionService.getAllActiveSessions();
      const stats = palabraSessionService.getStats();

      res.json({
        success: true,
        data: {
          sessions,
          stats
        }
      });

    } catch (error) {
      logger.error('Failed to get all sessions', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
        message: error.message
      });
    }
  }

  /**
   * Get OAuth token status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getOAuthStatus(req, res) {
    try {
      const status = palabraOAuthService.getTokenStatus();

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Failed to get OAuth status', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get OAuth status',
        message: error.message
      });
    }
  }

  /**
   * Validate language code
   * @param {string} languageCode - Language code to validate
   * @returns {boolean} True if valid
   */
  isValidLanguageCode(languageCode) {
    return typeof languageCode === 'string' && 
           languageCode.length >= 2 && 
           languageCode.length <= 5 &&
           /^[a-z]{2}(-[A-Z]{2})?$/.test(languageCode);
  }
}

export default new TranslationSessionController();

