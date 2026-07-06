import mongoose from 'mongoose';
import { Response, NextFunction } from 'express';
import Notification, { INotificationRecipient, NotificationChannel, NotificationTargetType } from '../models/Notification.model';
import User from '../models/User.model';
import Hotel from '../models/Hotel.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { sendNotificationEmail } from '../utils/email';

const asObjectIds = (value: unknown): mongoose.Types.ObjectId[] => {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return list
    .map(String)
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));
};

const asChannels = (value: unknown): NotificationChannel[] => {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const channels = list.map(String).filter((channel): channel is NotificationChannel => ['push', 'email'].includes(channel));
  return channels.length ? Array.from(new Set(channels)) : ['push'];
};

const buildRecipients = async (
  targetType: NotificationTargetType,
  targetUserIds: mongoose.Types.ObjectId[],
  targetHotelIds: mongoose.Types.ObjectId[]
): Promise<INotificationRecipient[]> => {
  if (targetType === 'hotels') {
    const hotels = await Hotel.find({ _id: { $in: targetHotelIds }, isDeleted: { $ne: true } })
      .select('name managerId')
      .populate('managerId', 'name email')
      .lean();

    return hotels.map((hotel: any) => ({
      recipientType: 'hotel',
      recipientId: hotel._id,
      name: hotel.name,
      email: hotel.managerId?.email,
    }));
  }

  const userFilter: any = { isDeleted: { $ne: true }, isActive: { $ne: false } };
  if (targetType === 'users') userFilter._id = { $in: targetUserIds };
  if (targetType === 'all') userFilter.role = { $in: ['user', 'manager'] };

  const users = await User.find(userFilter).select('name email').lean();
  return users.map((user: any) => ({
    recipientType: 'user',
    recipientId: user._id,
    name: user.name,
    email: user.email,
  }));
};

const sendEmails = async (recipients: INotificationRecipient[], title: string, message: string): Promise<number> => {
  const emailRecipients = recipients.filter(recipient => recipient.email);
  const results = await Promise.allSettled(
    emailRecipients.map(recipient => sendNotificationEmail(recipient.email as string, recipient.name || 'there', title, message))
  );
  return results.filter(result => result.status === 'fulfilled').length;
};

const adminId = (req: AuthRequest) => req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;

export const getAdminNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.search) {
      filter.$or = [
        { title: new RegExp(String(req.query.search), 'i') },
        { message: new RegExp(String(req.query.search), 'i') },
      ];
    }

    const currentAdminId = adminId(req);
    if (req.query.status === 'read' && currentAdminId) filter.readByAdminIds = currentAdminId;
    if (req.query.status === 'unread' && currentAdminId) filter.readByAdminIds = { $ne: currentAdminId };

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).lean();
    const now = new Date();
    const mapped = notifications.map((notification: any) => {
      const isRead = currentAdminId
        ? (notification.readByAdminIds || []).some((id: any) => String(id) === String(currentAdminId))
        : false;
      const snooze = currentAdminId
        ? (notification.adminSnoozes || []).find((item: any) => String(item.adminId) === String(currentAdminId) && new Date(item.until) > now)
        : null;
      return {
        ...notification,
        isRead,
        isSnoozed: Boolean(snooze),
        snoozedUntil: snooze?.until,
      };
    });

    res.json({
      success: true,
      count: mapped.length,
      unreadCount: mapped.filter(item => !item.isRead).length,
      notifications: mapped,
    });
  } catch (err) { next(err); }
};

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const now = new Date();
    const notifications = await Notification.find({
      recipients: {
        $elemMatch: {
          recipientType: 'user',
          recipientId: currentUserId,
          $or: [
            { snoozedUntil: { $exists: false } },
            { snoozedUntil: { $lte: now } },
          ],
        },
      },
    }).sort({ createdAt: -1 }).lean();

    const mapped = notifications.map((notification: any) => {
      const recipient = (notification.recipients || []).find(
        (item: any) => item.recipientType === 'user' && String(item.recipientId) === String(currentUserId)
      );
      return {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        channels: notification.channels,
        priority: notification.priority,
        isRead: Boolean(recipient?.readAt),
        readAt: recipient?.readAt,
        createdAt: notification.createdAt,
      };
    });

    res.json({
      success: true,
      count: mapped.length,
      unreadCount: mapped.filter(item => !item.isRead).length,
      notifications: mapped,
    });
  } catch (err) { next(err); }
};

export const markMyNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        'recipients.recipientType': 'user',
        'recipients.recipientId': currentUserId,
      },
      { $set: { 'recipients.$.readAt': new Date() } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) { next(err); }
};

export const createNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, message } = req.body;
    const targetType = String(req.body.targetType || 'all') as NotificationTargetType;
    if (!title || !message) {
      res.status(400).json({ success: false, message: 'Title and message are required' });
      return;
    }
    if (!['all', 'users', 'hotels'].includes(targetType)) {
      res.status(400).json({ success: false, message: 'Invalid target type' });
      return;
    }

    const targetUserIds = asObjectIds(req.body.targetUserIds);
    const targetHotelIds = asObjectIds(req.body.targetHotelIds);
    if (targetType === 'users' && targetUserIds.length === 0) {
      res.status(400).json({ success: false, message: 'Choose at least one user' });
      return;
    }
    if (targetType === 'hotels' && targetHotelIds.length === 0) {
      res.status(400).json({ success: false, message: 'Choose at least one hotel' });
      return;
    }

    const channels = asChannels(req.body.channels);
    const recipients = await buildRecipients(targetType, targetUserIds, targetHotelIds);
    const emailSentCount = channels.includes('email') ? await sendEmails(recipients, String(title), String(message)) : 0;
    const pushQueuedCount = channels.includes('push') ? recipients.length : 0;

    const notification = await Notification.create({
      title,
      message,
      targetType,
      channels,
      priority: req.body.priority || 'normal',
      recipients,
      targetUserIds,
      targetHotelIds,
      emailSentCount,
      pushQueuedCount,
      createdBy: req.user?.id,
      createdByName: req.user?.email,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    });

    await logAudit({
      action: 'create',
      entityType: 'Notification',
      entityId: notification.id,
      entityName: notification.title,
      req,
      meta: { targetType, recipientCount: recipients.length, channels },
    });

    res.status(201).json({ success: true, message: 'Notification created', notification });
  } catch (err) { next(err); }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = asObjectIds(req.body.ids);
    const currentAdminId = adminId(req);
    if (!currentAdminId || ids.length === 0) {
      res.status(400).json({ success: false, message: 'Notification IDs are required' });
      return;
    }

    await Notification.updateMany({ _id: { $in: ids } }, { $addToSet: { readByAdminIds: currentAdminId } });
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) { next(err); }
};

export const snoozeNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = asObjectIds(req.body.ids);
    const currentAdminId = adminId(req);
    const until = req.body.until ? new Date(req.body.until) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (!currentAdminId || ids.length === 0 || Number.isNaN(until.getTime())) {
      res.status(400).json({ success: false, message: 'Valid notification IDs and snooze date are required' });
      return;
    }

    await Notification.updateMany({ _id: { $in: ids } }, { $pull: { adminSnoozes: { adminId: currentAdminId } } });
    await Notification.updateMany({ _id: { $in: ids } }, { $push: { adminSnoozes: { adminId: currentAdminId, until } } });
    res.json({ success: true, message: 'Notifications snoozed' });
  } catch (err) { next(err); }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    await logAudit({ action: 'hard-delete', entityType: 'Notification', entityId: notification.id, entityName: notification.title, req });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
};

export const cleanupNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = Math.max(Number(req.body.days || 90), 1);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ success: true, message: 'Old notifications cleaned up', deletedCount: result.deletedCount || 0 });
  } catch (err) { next(err); }
};
