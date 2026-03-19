import express from 'express';
import { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  syncTasks 
} from '../controllers/taskController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { taskSchema } from '../utils/validationSchemas.js';

const router = express.Router();

// All task routes require authentication
router.use(protect);

router.route('/')
  .get(getTasks)
  .post(validate(taskSchema), createTask);

router.post('/sync', syncTasks); // The offline sync endpoint

router.route('/:id')
  .put(validate(taskSchema), updateTask)
  .delete(deleteTask);

export default router;