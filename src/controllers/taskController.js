import mongoose from 'mongoose';
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
  console.log(userId)

  try {
    for (const clientTask of tasks) {
      // 1. Check if the client provided a valid MongoDB ObjectId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(clientTask._id);
      
      let serverTask = null;
      if (isValidObjectId) {
        serverTask = await Task.findOne({ _id: clientTask._id, user: userId });
      }

      if (!serverTask) {
        /**
         * FIX FOR VALIDATION ERROR:
         * Instead of just stripping _id, we explicitly create a new 
         * instance and then save. This ensures Mongoose generates 
         * the _id if it's missing from the payload.
         */
        const { _id, ...cleanData } = clientTask;
        const newTask = new Task({
          ...cleanData,
          userId: userId,
         _id: new mongoose.Types.ObjectId()
        });
        
        await newTask.save();
      } else {
        // 2. Last-Write-Wins Logic for existing tasks
        const clientDate = new Date(clientTask.lastModified || clientTask.updatedAt).getTime();
        const serverDate = new Date(serverTask.updatedAt).getTime();

        if (clientDate > serverDate) {
          // Update the existing document with the newer client data
          await Task.findByIdAndUpdate(
            serverTask._id, 
            { ...clientTask, updatedAt: new Date() }, 
            { new: true, runValidators: false } // Disable validators for sync updates to prevent conflicts
          );
        }
      }
    }

    // 3. Return the fully updated list to the client
    const finalTasks = await Task.find({ user: userId, isDeleted: false });
    res.status(200).json({ success: true, data: finalTasks });
  } catch (error) {
    console.error("SYNC ERROR:", error); 
    res.status(400).json({ success: false, message: error.message });
  }
};