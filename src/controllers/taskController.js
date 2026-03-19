import Task from '../models/Task.js';
import { logger } from '../utils/logger.js';

// @desc    Get user tasks
// @route   GET /api/tasks
export const getTasks = async (req, res, next) => {
  try {
    // Only fetch tasks that are not soft-deleted
    const tasks = await Task.find({ userId: req.user._id, isDeleted: false });
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
export const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({
      ...req.body,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, lastModified: Date.now() },
      { new: true, runValidators: true }
    );

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }
    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task (Soft Delete for Sync)
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res, next) => {
  try {
    // We soft delete so offline devices know this was removed during sync
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDeleted: true, lastModified: Date.now() },
      { new: true }
    );

    if (!task) {
      res.status(404);
      throw new Error('Task not found');
    }
    res.json({ success: true, message: 'Task removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk sync offline changes
// @route   POST /api/tasks/sync
export const syncTasks = async (req, res, next) => {
  const { tasks } = req.body; // Array of tasks from client's sync_queue

  try {
    const syncResults = [];

    for (const clientTask of tasks) {
      const serverTask = await Task.findOne({ _id: clientTask._id, userId: req.user._id });

      if (!serverTask) {
        // Task doesn't exist on server, create it
        const newTask = await Task.create({ ...clientTask, userId: req.user._id });
        syncResults.push(newTask);
      } else {
        // Conflict Resolution: Last-Write-Wins (LWW)
        const clientTime = new Date(clientTask.lastModified).getTime();
        const serverTime = new Date(serverTask.lastModified).getTime();

        if (clientTime > serverTime) {
          // Client has newer data, update server
          const updatedTask = await Task.findByIdAndUpdate(
            clientTask._id,
            { ...clientTask },
            { new: true }
          );
          syncResults.push(updatedTask);
        } else {
          // Server has newer data, keep server version
          syncResults.push(serverTask);
        }
      }
    }

    logger.info(`Synced ${syncResults.length} tasks for user ${req.user.email}`);
    
    // Return the absolute latest state of all tasks to the client
    const allTasks = await Task.find({ userId: req.user._id, isDeleted: false });
    res.json({ success: true, data: allTasks });
  } catch (error) {
    next(error);
  }
};