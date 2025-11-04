import axios from 'axios';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class PalabraOAuthService {
  constructor() {
    console.log(config.translation.oauth.clientId,"config.translation.oauth.clientId",config.translation.oauth.clientSecret);
    
    this.clientId = config.translation.oauth.clientId;
    this.clientSecret = config.translation.oauth.clientSecret;
    this.tokenUrl = config.translation.oauth.tokenUrl;
    this.scope = config.translation.oauth.scope;
    this.cachedToken = null;
    this.tokenExpiry = null;
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Palabra OAuth credentials not configured. OAuth service will be disabled.');
    }
  }

  /**
   * Check if OAuth service is available
   * @returns {boolean} True if service is configured
   */
  isAvailable() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get valid OAuth token (cached or fresh)
   * @returns {Promise<string>} OAuth access token
   */
  async getValidToken() {
    try {
      // Check if we have a cached token that's still valid
      if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        logger.debug('Using cached OAuth token');
        return this.cachedToken;
      }

      // Request new token
      logger.info('Requesting new Palabra OAuth token');
      const token = await this.requestNewToken();
      
      // Cache the token (subtract 5 minutes for safety margin)
      this.cachedToken = token.access_token;
      this.tokenExpiry = Date.now() + (token.expires_in * 1000) - (5 * 60 * 1000);
      
      logger.info('OAuth token obtained and cached', {
        expiresIn: token.expires_in,
        expiresAt: new Date(this.tokenExpiry).toISOString()
      });

      return this.cachedToken;

    } catch (error) {
      logger.error('Failed to get OAuth token', {
        error: error.message,
        response: error.response?.data
      });
      throw new Error(`OAuth token request failed: ${error.message}`);
    }
  }

  /**
   * Request new OAuth token from Palabra
   * @returns {Promise<Object>} Token response
   */
  async requestNewToken() {
    if (!this.isAvailable()) {
      throw new Error('OAuth service is not configured');
    }

    const requestData = {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: this.scope
    };
    console.log(requestData,"requestData");
    
    const response = await axios.post(this.tokenUrl, requestData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout: config.translation.timeout
    });

    if (!response.data.access_token) {
      throw new Error('Invalid token response from Palabra OAuth');
    }

    return response.data;
  }

  /**
   * Clear cached token (force refresh on next request)
   */
  clearCachedToken() {
    logger.info('Clearing cached OAuth token');
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get token status information
   * @returns {Object} Token status
   */
  getTokenStatus() {
    return {
      hasToken: !!this.cachedToken,
      isExpired: this.tokenExpiry ? Date.now() >= this.tokenExpiry : true,
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      isConfigured: this.isAvailable()
    };
  }
}

export default new PalabraOAuthService();

