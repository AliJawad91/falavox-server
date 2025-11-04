import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 8000,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  agora: {
    appId: process.env.AGORA_APP_ID,
    appCert: process.env.AGORA_APP_CERT
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  token: {
    defaultExpireSeconds: parseInt(process.env.TOKEN_EXPIRE_SECONDS) || 3600,
    defaultUidRange: parseInt(process.env.DEFAULT_UID_RANGE) || 100000
  },
  translation: {
    apiKey: process.env.PALABRA_API_KEY,
    apiUrl: process.env.PALABRA_API_URL || 'https://api.palabra.ai',//'https://api.palabra.com',
    defaultSourceLang: process.env.PALABRA_DEFAULT_SOURCE_LANG || 'en',
    defaultTargetLang: process.env.PALABRA_DEFAULT_TARGET_LANG || 'es',
    timeout: parseInt(process.env.PALABRA_TIMEOUT) || 10000,
    oauth: {
      clientId: process.env.PALABRA_CLIENT_ID,
      clientSecret: process.env.PALABRA_CLIENT_SECRET,
      tokenUrl: process.env.PALABRA_TOKEN_URL || 'https://api.palabra.ai/v1/oauth/token',//'https://api.palabra.com/oauth/token',
      scope: process.env.PALABRA_SCOPE || 'translation:stream'
    },
    session: {
      cacheTimeout: parseInt(process.env.PALABRA_SESSION_CACHE_TIMEOUT) || 3600000, // 1 hour
      maxSessions: parseInt(process.env.PALABRA_MAX_SESSIONS) || 100
    }
  }
};

export default config;
