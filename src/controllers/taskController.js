import Task from '../models/Task.js';
import { logger } from '../utils/logger.js';
import { sendPushNotification } from './notificationController.js';

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
  await sendPushNotification(req.user._id, {
    title: 'New Task Created',
    body: `Task "${title}" was added`,
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

  await sendPushNotification(req.user._id, {
    title: 'Task Updated',
    body: `Task "${title}" was updated`,
  });

  res.json({ success: true, data: task });
};

export const deleteTask = async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isDeleted: true, lastModified: Date.now() } },
    { new: true }
  );

  if (!task) { res.status(404); throw new Error('Task not found'); }
  await sendPushNotification(req.user._id, {
    title: 'Task Deleted',
    body: 'A task was removed',
  });
  res.json({ success: true, message: 'Task removed' });
};

export const syncTasks = async (req, res) => {
  const { tasks } = req.body; 
  const userId = req.user._id;

  try {
    const results = [];
    for (const clientTask of tasks) {
      // FIX: Prevent 500 error by checking if ID is a valid MongoDB ObjectId
      const isValidId = mongoose.Types.ObjectId.isValid(clientTask._id);
      
      let serverTask = null;
      if (isValidId) {
        serverTask = await Task.findOne({ _id: clientTask._id, user: userId });
      }

      if (!serverTask) {
        // If it's a new offline task, strip the temp ID and create fresh
        const { _id, ...cleanData } = clientTask;
        const newTask = await Task.create({ ...cleanData, user: userId });
        results.push(newTask);
      } else {
        // Last-Write-Wins Logic
        const clientDate = new Date(clientTask.lastModified || clientTask.updatedAt).getTime();
        const serverDate = new Date(serverTask.updatedAt).getTime();

        if (clientDate > serverDate) {
          const updated = await Task.findByIdAndUpdate(
            serverTask._id, 
            { ...clientTask, updatedAt: new Date() }, 
            { new: true }
          );
          results.push(updated);
        } else {
          results.push(serverTask);
        }
      }
    }

    const finalTasks = await Task.find({ user: userId, isDeleted: false });
    res.status(200).json({ success: true, data: finalTasks });
  } catch (error) {
    console.error("SYNC CRASH:", error); // Vital for Vercel logs
    res.status(500).json({ success: false, message: error.message });
  }
};