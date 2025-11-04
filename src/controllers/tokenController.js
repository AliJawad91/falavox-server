import tokenService from '../services/tokenService.js';

class TokenController {
  /**
   * Generate Agora RTC token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async generateToken(req, res) {
    try {
      const { channel, uid, expireSeconds } = req.query;
      
      // Validate parameters
      const validation = tokenService.validateTokenParams(channel, uid);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: validation.errors
        });
      }

      // Parse numeric parameters
      const parsedUid = uid ? parseInt(uid) : null;
      const parsedExpireSeconds = expireSeconds ? parseInt(expireSeconds) : null;
      
      // Generate token
      const tokenData = tokenService.generateToken(channel, parsedUid, parsedExpireSeconds);
      
      res.json({
        success: true,
        data: tokenData
      });

    } catch (error) {
      console.error('Token generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  healthCheck(req, res) {
    res.json({
      success: true,
      message: 'Token server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
}

export default new TokenController();
