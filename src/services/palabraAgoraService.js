import axios from 'axios';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class PalabraAgoraService {
  constructor() {
    this.baseUrl = `${config.translation.apiUrl}`.replace(/\/$/, '');
    this.clientId = config.translation.oauth.clientId;
    this.clientSecret = config.translation.oauth.clientSecret;
    this.timeout = config.translation.timeout;
    // In-memory tracking of active Palabra Agora tasks keyed by Agora channel
    this.activeTasks = new Map();
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.baseUrl);
  }

  // Store task info for a channel
  storeTask(channel, taskInfo) {
    try {
      const taskId = taskInfo?.data?.task_id || taskInfo?.task_id;
      if (!channel || !taskId) {
        logger.warn('Attempted to store invalid Palabra task', { channel, hasTaskId: Boolean(taskId) });
        return;
      }
      this.activeTasks.set(channel, { taskId, taskInfo, createdAt: Date.now() });
      logger.info('Stored Palabra Agora task', { channel, taskId });
    } catch (e) {
      logger.error('Failed to store Palabra Agora task', { channel, error: e.message });
    }
  }

  // Retrieve stored task info by channel
  getTask(channel) {
    return this.activeTasks.get(channel) || null;
  }

  // Stop Palabra translation task via Agora integration
  async stopTranslationTask(channel) {
    if (!this.isConfigured()) {
      throw new Error('Palabra Agora service is not configured (missing ClientID/ClientSecret)');
    }

    const stored = this.getTask(channel);
    if (!stored) {
      logger.warn('Attempted to stop non-existent Palabra Agora task', { channel });
      return false;
    }

    const { taskId } = stored;
    const url = `${this.baseUrl}/agora/translations/${taskId}`;

    try {
      logger.info('Calling Palabra DELETE /agora/translations/{taskId}', { url, channel, taskId });
      await axios.delete(url, {
        headers: {
          ClientID: this.clientId,
          ClientSecret: this.clientSecret,
          Accept: 'application/json'
        },
        timeout: this.timeout
      });

      this.activeTasks.delete(channel);
      logger.info('Palabra Agora task stopped and removed', { channel, taskId });
      return true;
    } catch (error) {
      logger.error('Failed to stop Palabra Agora task', {
        channel,
        taskId,
        error: error.message,
        response: error.response?.data
      });
      // Best-effort cleanup even on failure
      this.activeTasks.delete(channel);
      return false;
    }
  }

  /**
   * Start Palabra translation task via Agora integration
   * @param {Object} params
   * @param {string} params.channel - Agora channel name
   * @param {Object} params.channelTokenData - { token, channel, uid } for the speaker (published audio)
   * @param {Object} params.receiverTokenData - { token, channel, uid } for Palabra to subscribe to original stream
   * @param {Object} params.translatorTokenData - { token, channel, uid } for Palabra to publish translated audio
   * @param {string} params.sourceLanguage - e.g. 'en'
   * @param {string} params.targetLanguage - e.g. 'es'
   * @param {Object} [params.srOptions] - speech recognition options
   * @param {Object} [params.translationOptions] - translation options
   * @returns {Promise<Object>} Palabra task/session info
   */
  async startTranslationTask({
    channel,
    channelTokenData,
    receiverTokenData,
    translatorTokenData,
    sourceLanguage,
    targetLanguage,
    srOptions = {},
    translationOptions = {}
  }) {
    if (!this.isConfigured()) {
      throw new Error('Palabra Agora service is not configured (missing ClientID/ClientSecret)');
    }

    const url = `${this.baseUrl}/agora/translations`;

    const body = {
      channel: channelTokenData.channel || channel,
      remote_uid: channelTokenData.uid,
      local_uid: receiverTokenData.uid,
      token: receiverTokenData.token,
      speech_recognition: {
        source_language: sourceLanguage,
        options: srOptions || {}
      },
      translations: [
        {
          token: translatorTokenData.token,
          local_uid: translatorTokenData.uid,
          target_language: targetLanguage,
          options: translationOptions || {}
        }
      ]
    };

    logger.info('Calling Palabra /agora/translations', {
      url,
      channel: body.channel,
      sourceLanguage,
      targetLanguage
    });

    const response = await axios.post(url, body, {
      headers: {
        ClientID: this.clientId,
        ClientSecret: this.clientSecret,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: this.timeout
    });

    return response.data;
  }
}

export default new PalabraAgoraService();
