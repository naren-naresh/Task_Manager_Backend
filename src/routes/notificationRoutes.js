import express from 'express';
import { subscribeUser } from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/subscribe', protect, subscribeUser);

export default router;