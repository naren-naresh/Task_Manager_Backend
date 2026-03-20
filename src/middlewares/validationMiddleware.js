import { logger } from '../utils/logger.js';

export const validate = (schema) => async (req, res, next) => {
  try {
    // 1. Await validation AND reassign the sanitized result to req.body
    const validatedData = await schema.validate(req.body, { 
      abortEarly: false, 
      stripUnknown: true 
    });
    
    req.body = validatedData;
    next();
  } catch (error) {
    // 2. Safe error handling
    if (error.inner) {
      const errors = error.inner.map((err) => ({ path: err.path, message: err.message }));
      res.status(400).json({ success: false, errors });
    } else {
      logger.error(`Validation Error: ${error.message}`);
      res.status(400).json({ success: false, message: 'Invalid payload format' });
    }
  }
};