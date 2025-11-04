import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import { config } from '../config/index.js';

class TokenService {
  constructor() {
    this.appId = config.agora.appId;
    this.appCert = config.agora.appCert;
    
    if (!this.appId || !this.appCert) {
      throw new Error('Agora App ID and App Certificate are required');
    }
  }

  /**
   * Generate Agora RTC token
   * @param {string} channel - Channel name
   * @param {number} uid - User ID (optional, will generate random if not provided)
   * @param {number} expireSeconds - Token expiration time in seconds
   * @returns {Object} Token data including token, uid, channel, and expiration
   */
  generateToken(channel, uid = null, expireSeconds = null) {
    console.log("generate Town");
    
    try {
      // Validate channel
      if (!channel || typeof channel !== 'string') {
        throw new Error('Channel name is required and must be a string');
      }

      // Generate UID if not provided
      const finalUid = uid || Math.floor(Math.random() * config.token.defaultUidRange);
      
      // Use default expiration if not provided
      const finalExpireSeconds = expireSeconds || config.token.defaultExpireSeconds;
      
      // Calculate timestamps
      const currentTs = Math.floor(Date.now() / 1000);
      const privilegeTs = currentTs + finalExpireSeconds;

      console.log('Token generation details:', {
        channel,
        uid: finalUid,
        currentTs,
        expireSeconds: finalExpireSeconds,
        privilegeTs,
        serverTime: new Date().toISOString()
      });

      // Generate token
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCert,
        channel,
        finalUid,
        RtcRole.PUBLISHER,
        privilegeTs
      );

      console.log(`Generated token for channel: ${channel}, uid: ${finalUid}`);

      return {
        token,
        uid: finalUid,
        channel,
        expiresAt: privilegeTs,
        generatedAt: currentTs
      };
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Validate token parameters
   * @param {string} channel - Channel name
   * @param {number} uid - User ID
   * @returns {Object} Validation result
   */
  validateTokenParams(channel, uid) {
    const errors = [];

    if (!channel || typeof channel !== 'string') {
      errors.push('Channel name is required and must be a string');
    }

    if (uid !== null && uid !== undefined && (typeof uid !== 'number' || uid < 0)) {
      errors.push('UID must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new TokenService();
