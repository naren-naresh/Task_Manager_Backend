import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { authSchema } from '../utils/validationSchemas.js';

const router = express.Router();

router.post('/register', validate(authSchema), registerUser);
router.post('/login', validate(authSchema), loginUser);

export default router;