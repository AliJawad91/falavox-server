import express from 'express';
import translationSessionController from '../controllers/translationSessionController.js';

const router = express.Router();

// Start translation session
router.post('/sessions/start', translationSessionController.startTranslation.bind(translationSessionController));

// Stop translation session
router.delete('/sessions/:channel', translationSessionController.stopTranslation.bind(translationSessionController));

// Get session status
router.get('/sessions/:channel/status', translationSessionController.getSessionStatus.bind(translationSessionController));

// Get all active sessions
router.get('/sessions', translationSessionController.getAllSessions.bind(translationSessionController));

// Get OAuth status
router.get('/oauth/status', translationSessionController.getOAuthStatus.bind(translationSessionController));

export default router;

