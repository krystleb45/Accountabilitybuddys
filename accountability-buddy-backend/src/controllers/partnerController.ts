import { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification"; // Ensure this matches your model export
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";

/**
 * @desc Create a new notification
 * @route POST /api/notifications
 * @access Private
 */
export const createNotification = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const {
      userId,
      message,
      type,
    }: { userId: string; message: string; type?: string } = sanitize(req.body);

    if (!userId || !message) {
      sendResponse(res, 400, false, "User ID and message are required");
      return;
    }

    const newNotification = await Notification.create({
      user: userId,
      message,
      type,
    });

    // Just call sendResponse, don't return it
    sendResponse(res, 201, true, "Notification created successfully", {
      notification: newNotification,
    });
  }
);

/**
 * @desc Get user notifications with pagination
 * @route GET /api/notifications
 * @access Private
 */
export const getUserNotifications = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalNotifications = await Notification.countDocuments({ user: userId });

    sendResponse(res, 200, true, "User notifications fetched successfully", {
      notifications,
      pagination: {
        total: totalNotifications,
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
      },
    });
  }
);

/**
 * @desc Mark a notification as read
 * @route PATCH /api/notifications/:notificationId/read
 * @access Private
 */
export const markAsRead = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { notificationId } = req.params;

    const updatedNotification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!updatedNotification) {
      sendResponse(res, 404, false, "Notification not found");
      return;
    }

    sendResponse(res, 200, true, "Notification marked as read", {
      notification: updatedNotification,
    });
  }
);

/**
 * @desc Mark all user notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
export const markAllAsRead = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    const result = await Notification.updateMany({ user: userId, read: false }, { read: true });

    sendResponse(res, 200, true, "All notifications marked as read", {
      modifiedCount: result.modifiedCount,
    });
  }
);

/**
 * @desc Delete a notification
 * @route DELETE /api/notifications/:notificationId
 * @access Private
 */
export const deleteNotification = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { notificationId } = req.params;

    const deletedNotification = await Notification.findByIdAndDelete(notificationId);

    if (!deletedNotification) {
      sendResponse(res, 404, false, "Notification not found");
      return;
    }

    sendResponse(res, 200, true, "Notification deleted successfully");
  }
);

/**
 * @desc Delete all user notifications
 * @route DELETE /api/notifications
 * @access Private
 */
export const deleteAllNotifications = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    const result = await Notification.deleteMany({ user: userId });

    sendResponse(res, 200, true, "All notifications deleted successfully", {
      deletedCount: result.deletedCount,
    });
  }
);
