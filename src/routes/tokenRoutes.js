import express from 'express';
import tokenController from '../controllers/tokenController.js';

const router = express.Router();

// Token generation endpoint
router.get('/token', tokenController.generateToken.bind(tokenController));

// Health check endpoint
router.get('/health', tokenController.healthCheck.bind(tokenController));

export default router;
