import Task from '../models/Task.js';
import { logger } from '../utils/logger.js';

export const getTasks = async (req, res) => {
  // Added a hard limit to prevent Out-Of-Memory crashes
  const tasks = await Task.find({ userId: req.user._id, isDeleted: false }).limit(500);
  res.json({ success: true, data: tasks });
};

export const createTask = async (req, res) => {
  // Explicitly extract safe fields
  const { _id, title, description, status, orderIndex } = req.body;
  const task = await Task.create({
    _id, title, description, status, orderIndex, userId: req.user._id,
  });
  res.status(201).json({ success: true, data: task });
};

export const updateTask = async (req, res) => {
  const { title, description, status, orderIndex } = req.body;
  
  const task = await Task.findOneAndUpdate(
    // Filter by the task's string ID and the owner's ID
    { _id: req.params.id, userId: req.user._id },
    { $set: { title, description, status, orderIndex, lastModified: Date.now() } },
    { 
      returnDocument: 'after', 
      runValidators: true 
    }
  );
  
  if (!task) { 
    res.status(404); 
    throw new Error('Task not found'); 
  }
  res.json({ success: true, data: task });
};

export const deleteTask = async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isDeleted: true, lastModified: Date.now() } },
    { new: true }
  );

  if (!task) { res.status(404); throw new Error('Task not found'); }
  res.json({ success: true, message: 'Task removed' });
};

export const syncTasks = async (req, res) => {
  const { tasks } = req.body;
  const userId = req.user._id;
  const serverNow = Date.now();

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.json({ success: true, data: await Task.find({ userId, isDeleted: false }).limit(500) });
  }

  const incomingIds = tasks.map(t => t._id);
  // Bulk fetch to solve N+1 bottleneck
  const existingTasks = await Task.find({ _id: { $in: incomingIds }, userId });
  const existingMap = new Map(existingTasks.map(t => [t._id, t]));
  const bulkOps = [];

  for (const clientTask of tasks) {
    const serverTask = existingMap.get(clientTask._id);
    const clientTime = new Date(clientTask.lastModified).getTime();

    // SECURITY: Prevent "Clock Spoofing" lockout
    if (clientTime > serverNow + 300000) {
      logger.warn(`Clock spoofing detected for task ${clientTask._id}`);
      continue; 
    }

    const safeData = {
      title: clientTask.title,
      description: clientTask.description,
      status: clientTask.status,
      orderIndex: clientTask.orderIndex,
      lastModified: clientTask.lastModified,
      isDeleted: clientTask.isDeleted || false,
    };

    if (!serverTask) {
      // Upsert new task (Prevents E11000 Duplicate Key crashes)
      bulkOps.push({
        updateOne: {
          filter: { _id: clientTask._id, userId },
          update: { $setOnInsert: safeData },
          upsert: true,
        }
      });
    } else {
      // Last-Write-Wins (LWW)
      const serverTime = new Date(serverTask.lastModified).getTime();
      if (clientTime > serverTime) {
        bulkOps.push({
          updateOne: { filter: { _id: clientTask._id, userId }, update: { $set: safeData } }
        });
      }
    }
  }

  if (bulkOps.length > 0) {
    await Task.bulkWrite(bulkOps, { ordered: false }).catch(e => logger.error(`BulkWrite errors: ${e.message}`));
  }

  const allTasks = await Task.find({ userId, isDeleted: false }).limit(500);
  res.json({ success: true, data: allTasks });
};