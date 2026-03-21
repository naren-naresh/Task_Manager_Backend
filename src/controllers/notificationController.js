import webpush from 'web-push';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// @desc    Subscribe user to Web Push Notifications
// @route   POST /api/notifications/subscribe
export const subscribeUser = async (req, res, next) => {
  const subscription = req.body;

  try {
    // Add the subscription to the user's array if it doesn't already exist
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { pushSubscriptions: subscription }
    });

    res.status(201).json({ success: true, message: 'Subscribed to notifications' });
  } catch (error) {
    next(error);
  }
};

// Utility function to be used by internal services (e.g., cron jobs for due dates)
export const sendPushNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId).lean(); // .lean() for performance, we only need the data
    if (!user || user.pushSubscriptions.length === 0) return;

    const expiredEndpoints = [];

    const notifications = user.pushSubscriptions.map(sub => 
      webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Collect expired endpoints instead of saving immediately
          expiredEndpoints.push(sub.endpoint);
        } else {
          logger.error(`Push error: ${err.message}`);
        }
      })
    );

    await Promise.all(notifications);

    // ATOMIC FIX: Remove all expired subscriptions in ONE single database call
    if (expiredEndpoints.length > 0) {
      logger.warn(`Cleaning up ${expiredEndpoints.length} expired subscriptions for user ${userId}`);
      await User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } } }
      );
    }
  } catch (error) {
    logger.error(`Failed to send push notification: ${error.message}`);
  }
};