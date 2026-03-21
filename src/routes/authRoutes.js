import express from 'express';
import { registerUser, loginUser, refreshAccessToken, getMe, logoutUser } from '../controllers/authController.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { authSchema } from '../utils/validationSchemas.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', validate(authSchema), registerUser);
router.post('/login', validate(authSchema), loginUser);
router.post('/refresh', refreshAccessToken);
router.get('/me', protect, getMe)
router.post('/logout', logoutUser);

export default router;