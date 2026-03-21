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
  const { tasks } = req.body; // Array of tasks from IndexedDB
  const userId = req.user._id;

  try {
    const syncedTasks = [];

    for (const clientTask of tasks) {
      const serverTask = await Task.findOne({ _id: clientTask._id, user: userId });

      if (!serverTask) {
        // 1. Task doesn't exist on server -> Create it
        const newTask = await Task.create({ ...clientTask, user: userId });
        syncedTasks.push(newTask);
      } else {
        // 2. CONFLICT RESOLUTION: Last-Write-Wins (LWW)
        // We convert both to Date objects for a safe comparison
        const clientDate = new Date(clientTask.lastModified).getTime();
        const serverDate = new Date(serverTask.updatedAt).getTime();

        // Only update if the client's change is actually newer than the server's last known state
        if (clientDate > serverDate) {
          const updated = await Task.findByIdAndUpdate(
            serverTask._id,
            { ...clientTask, updatedAt: new Date() }, // Server sets the NEW truth
            { new: true }
          );
          syncedTasks.push(updated);
        } else {
          // Server version is newer or same -> Send server version back to client to overwrite IDB
          syncedTasks.push(serverTask);
        }
      }
    }

    // 3. Final Step: Fetch any tasks on the server that the client doesn't have at all
    // (e.g., tasks created on a different device)
    const allServerTasks = await Task.find({ user: userId, isDeleted: false });
    
    res.status(200).json({
      success: true,
      data: allServerTasks // Return the full reconciled list
    });
  } catch (error) {
    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
};