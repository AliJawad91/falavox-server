import translationService from '../services/translationService.js';
import palabraSessionService from '../services/palabraSessionService.js';
import logger from '../utils/logger.js';
import tokenService from '../services/tokenService.js';
import palabraAgoraService from '../services/palabraAgoraService.js';

/**
 * Validate language code
 * @param {string} languageCode - Language code to validate
 * @returns {boolean} True if valid
 */
const isValidLanguageCode = (languageCode) => {
  return typeof languageCode === 'string' &&
    languageCode.length >= 2 &&
    languageCode.length <= 5 &&
    /^[a-z]{2}(-[A-Z]{2})?$/.test(languageCode);
};

/**
 * Build Agora token data using backend generator
 * @param {string} channel
 * @param {number|undefined} preferredUid
 * @returns {{ token: string, channel: string, uid: number }}
 */
const buildAgoraTokenData = (channel, preferredUid) => {
  const tokenData = tokenService.generateToken(channel, preferredUid);
  return {
    token: tokenData.token,
    channel: tokenData.channel,
    uid: tokenData.uid
  };
};

/**
 * Socket.IO event handlers
 * @param {Object} io - Socket.IO server instance
 */
export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle channel joining
    socket.on('join_channel', ({ channel, uid }) => {
      try {
        if (!channel) {
          socket.emit('error', { message: 'Channel name is required' });
          return;
        }

        console.log(`User ${uid || 'anonymous'} joined channel: ${channel}`);
        socket.join(channel);

        // Notify the client of successful join
        socket.emit('channel_joined', {
          channel,
          uid: uid || socket.id,
          timestamp: new Date().toISOString()
        });

        // Notify other users in the channel
        socket.to(channel).emit('user_joined', {
          uid: uid || socket.id,
          channel,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error in join_channel:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Handle channel leaving
    socket.on('leave_channel', ({ channel, uid }) => {
      try {
        if (!channel) {
          socket.emit('error', { message: 'Channel name is required' });
          return;
        }

        console.log(`User ${uid || 'anonymous'} left channel: ${channel}`);
        socket.leave(channel);

        // Notify other users in the channel
        socket.to(channel).emit('user_left', {
          uid: uid || socket.id,
          channel,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error in leave_channel:', error);
        socket.emit('error', { message: 'Failed to leave channel' });
      }
    });

    // Handle translation requests with Palabra integration
    socket.on('translation_request', async ({ channel, text, sourceLanguage, targetLanguage, requestId }) => {
      try {
        const reqId = requestId || Date.now();

        logger.info('Translation request received', {
          requestId: reqId,
          channel,
          textLength: text?.length || 0,
          sourceLanguage,
          targetLanguage,
          clientId: socket.id
        });

        // Validate request
        if (!text || typeof text !== 'string') {
          socket.emit('translation_error', {
            requestId: reqId,
            error: 'Text is required and must be a string',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!channel) {
          socket.emit('translation_error', {
            requestId: reqId,
            error: 'Channel is required',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Acknowledge the request
        socket.emit('translation_acknowledged', {
          requestId: reqId,
          status: 'processing',
          timestamp: new Date().toISOString()
        });

        // Broadcast to other users in the channel that translation is happening
        socket.to(channel).emit('translation_in_progress', {
          requestId: reqId,
          sourceLanguage,
          targetLanguage,
          timestamp: new Date().toISOString()
        });

        // Process translation
        const translationResult = await translationService.translateText(
          text,
          sourceLanguage,
          targetLanguage
        );

        if (translationResult.success) {
          // Send successful translation to the requester
          socket.emit('translation_completed', {
            requestId: reqId,
            ...translationResult,
            timestamp: new Date().toISOString()
          });

          // Broadcast translation to other users in the channel
          socket.to(channel).emit('translation_broadcast', {
            requestId: reqId,
            originalText: translationResult.originalText,
            translatedText: translationResult.translatedText,
            sourceLanguage: translationResult.sourceLanguage,
            targetLanguage: translationResult.targetLanguage,
            confidence: translationResult.confidence,
            timestamp: new Date().toISOString()
          });

          logger.info('Translation completed successfully', {
            requestId: reqId,
            channel,
            sourceLanguage: translationResult.sourceLanguage,
            targetLanguage: translationResult.targetLanguage
          });
        } else {
          // Send error to the requester
          socket.emit('translation_error', {
            requestId: reqId,
            error: translationResult.error,
            timestamp: new Date().toISOString()
          });

          logger.error('Translation failed', {
            requestId: reqId,
            channel,
            error: translationResult.error
          });
        }

      } catch (error) {
        logger.error('Error in translation_request handler', {
          error: error.message,
          stack: error.stack,
          clientId: socket.id
        });

        socket.emit('translation_error', {
          requestId: requestId || Date.now(),
          error: 'Internal server error during translation',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle start translation (listener-initiated flow) using Palabra Agora integration
    socket.on('start_translation', async ({ channel, sourceLanguage, targetLanguage, channelTokenData, options = {} }) => {
      try {
        console.log("call receievd for start translationn", channel,
          sourceLanguage,
          targetLanguage,
          options,
          channelTokenData,
          socket.id, "END");

        // channelTokenData = JSON.parse(channelTokenData);
        // console.log(channelTokenData,"parsed channelTokenData");

        logger.info('Start translation request received', {
          channel,
          sourceLanguage,
          targetLanguage,
          options,
          hasChannelTokenData: Boolean(channelTokenData),
          clientId: socket.id
        });

        // Validate required parameters
        if (!channel) {
          socket.emit('translation_start_error', {
            error: 'Channel name is required',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!sourceLanguage || !targetLanguage) {
          socket.emit('translation_start_error', {
            error: 'Source and target languages are required',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!isValidLanguageCode(sourceLanguage) || !isValidLanguageCode(targetLanguage)) {
          socket.emit('translation_start_error', {
            error: 'Invalid language codes provided',
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!palabraAgoraService.isConfigured()) {
          socket.emit('translation_start_error', {
            error: 'Palabra integration is not configured on the server',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Acknowledge the request
        socket.emit('translation_start_acknowledged', {
          channel,
          sourceLanguage,
          targetLanguage,
          status: 'processing',
          timestamp: new Date().toISOString()
        });

        // Prepare three token datasets per Palabra docs
        // 1) channelTokenData must represent the speaker's stream (provided by client or generated if needed)
        const finalChannelTokenData = channelTokenData && channelTokenData.token && channelTokenData.uid
          ? { token: channelTokenData.token, channel, uid: Number(channelTokenData.uid) }
          : buildAgoraTokenData(channel);

        // 2) receiverTokenData - for Palabra to retrieve original stream
        const receiverTokenData = buildAgoraTokenData(channel);

        // 3) translatorTokenData - for Palabra to publish translated stream
        const translatorTokenData = buildAgoraTokenData(channel);

        // Call Palabra Agora integration
        const palabraResponse = await palabraAgoraService.startTranslationTask({
          channel,
          channelTokenData: finalChannelTokenData,
          receiverTokenData,
          translatorTokenData,
          sourceLanguage,
          targetLanguage,
          srOptions: options.srOptions || {},
          translationOptions: options.translationOptions || {}
        });

        logger.info('palabraResponse Start', palabraResponse, "END");

        // Store task by channel to allow stopping later
        try {
          palabraAgoraService.storeTask(channel, palabraResponse);
        } catch (e) {
          logger.error('Failed to store Palabra task after start', { channel, error: e.message });
        }

        // Send full info to the user who started translation
        socket.emit('translation_started', {
          channel,
          sourceLanguage,
          targetLanguage,
          receiverTokenData,
          translatorTokenData,
          palabraTask: palabraResponse,
          timestamp: new Date().toISOString()
        });

        // Also broadcast the translation start (with essential info) to all listeners
        socket.to(channel).emit('translation_started', {
          channel,
          sourceLanguage,
          targetLanguage,
          receiverTokenData,
          translatorTokenData,
          palabraTask: palabraResponse,
          startedBy: socket.id,
          timestamp: new Date().toISOString()
        });

        // Inform others in channel
        socket.to(channel).emit('translation_session_started', {
          channel,
          sourceLanguage,
          targetLanguage,
          startedBy: socket.id,
          timestamp: new Date().toISOString()
        });

        logger.info('Palabra Agora translation started', {
          channel,
          sourceLanguage,
          targetLanguage
        });

      } catch (error) {
        logger.error('Failed to start Palabra Agora translation', {
          error: error.message,
          channel,
          sourceLanguage,
          targetLanguage,
          clientId: socket.id
        });

        socket.emit('translation_start_error', {
          error: 'Failed to start translation session',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle stop translation
    socket.on('stop_translation', async ({ channel }) => {
      try {
        logger.info('Stop translation request received', {
          channel,
          clientId: socket.id
        });

        if (!channel) {
          socket.emit('translation_stop_error', {
            error: 'Channel name is required',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Acknowledge the request
        socket.emit('translation_stop_acknowledged', {
          channel,
          status: 'processing',
          timestamp: new Date().toISOString()
        });
        console.log(channel,"channel");

        // Stop the Palabra Agora translation task associated with this channel
        const success = await palabraAgoraService.stopTranslationTask(channel);
        console.log(success,"Stop Translation success");

        if (success) {
          socket.to(channel).emit('translation_stopped', { 
              channel, 
              status: 'stopped', 
              timestamp: new Date().toISOString()
             });
          socket.emit('translation_stopped', {
            channel,
            status: 'stopped',
            timestamp: new Date().toISOString()
          });

          socket.to(channel).emit('translation_session_stopped', {
            channel,
            stoppedBy: socket.id,
            timestamp: new Date().toISOString()
          });

          logger.info('Translation session stopped successfully', {
            channel,
            clientId: socket.id
          });
        } else {
          socket.emit('translation_stop_error', {
            error: 'Translation session not found or already ended',
            timestamp: new Date().toISOString()
          });
        }

      } catch (error) {
        logger.error('Failed to stop translation session', {
          error: error.message,
          channel,
          clientId: socket.id
        });

        socket.emit('translation_stop_error', {
          error: 'Failed to stop translation session',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Handle server-level errors
  io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
  });
};
