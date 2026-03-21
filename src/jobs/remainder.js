import cron from 'node-cron';
import Task from '../models/Task.js';
import { sendPushNotification } from './notificationController.js';

// Runs every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();

  const dueTasks = await Task.find({
    dueDate: { $lte: now },
    notified: { $ne: true },
  });

  for (const task of dueTasks) {
    await sendPushNotification(task.userId, {
      title: 'Task Reminder',
      body: `Task "${task.title}" is due!`,
    });

    task.notified = true;
    await task.save();
  }
});