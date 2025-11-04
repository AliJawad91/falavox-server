import axios from 'axios';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

class TranslationService {
  constructor() {
    this.apiKey = process.env.PALABRA_API_KEY;
    this.apiUrl = process.env.PALABRA_API_URL || 'https://api.palabra.ai',//'https://api.palabra.com';
    this.defaultSourceLang = process.env.PALABRA_DEFAULT_SOURCE_LANG || 'en';
    this.defaultTargetLang = process.env.PALABRA_DEFAULT_TARGET_LANG || 'es';
    
    if (!this.apiKey) {
      logger.warn('Palabra API key not configured. Translation service will be disabled.');
    }
  }

  /**
   * Check if translation service is available
   * @returns {boolean} True if service is configured and available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Translate text using Palabra API
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<Object>} Translation result
   */
  async translateText(text, sourceLanguage = null, targetLanguage = null) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Translation service is not configured');
      }

      if (!text || typeof text !== 'string') {
        throw new Error('Text to translate is required and must be a string');
      }

      const sourceLang = sourceLanguage || this.defaultSourceLang;
      const targetLang = targetLanguage || this.defaultTargetLang;

      logger.info('Translation request', {
        textLength: text.length,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      });

      // TODO: Implement actual Palabra API call
      // This is a placeholder implementation
      const response = await this.callPalabraAPI(text, sourceLang, targetLang);

      logger.info('Translation completed', {
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        success: true
      });

      return {
        success: true,
        originalText: text,
        translatedText: response.translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        confidence: response.confidence || 1.0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Translation failed', {
        error: error.message,
        text: text?.substring(0, 100) + '...',
        sourceLanguage,
        targetLanguage
      });

      return {
        success: false,
        error: error.message,
        originalText: text,
        sourceLanguage: sourceLanguage || this.defaultSourceLang,
        targetLanguage: targetLanguage || this.defaultTargetLang,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Call Palabra API (placeholder implementation)
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language
   * @param {string} targetLanguage - Target language
   * @returns {Promise<Object>} API response
   */
  async callPalabraAPI(text, sourceLanguage, targetLanguage) {
    // TODO: Replace with actual Palabra API implementation
    // This is a mock implementation for development
    
    const mockResponse = {
      translatedText: `[Translated from ${sourceLanguage} to ${targetLanguage}] ${text}`,
      confidence: 0.95
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return mockResponse;

    // Actual implementation would look like:
    /*
    const response = await axios.post(`${this.apiUrl}/translate`, {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
    */
  }

  /**
   * Get supported languages
   * @returns {Promise<Array>} List of supported languages
   */
  async getSupportedLanguages() {
    try {
      if (!this.isAvailable()) {
        return [];
      }

      // TODO: Implement actual Palabra API call for supported languages
      // This is a mock response
      return [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' }
      ];

    } catch (error) {
      logger.error('Failed to get supported languages', { error: error.message });
      return [];
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
           languageCode.length <= 5;
  }
}

export default new TranslationService();
