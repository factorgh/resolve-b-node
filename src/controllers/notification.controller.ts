import { Request, Response } from "express";
import { responseFactory } from "../utils/responseFactory";
import { notificationService } from "../services/notification.service";

export const notificationController = {
  getMyNotifications: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const notifications = await notificationService.getUserNotifications(
        userId,
        50,
        0,
      );
      return res.json(
        responseFactory.success(
          notifications,
          "Notifications fetched successfully",
        ),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  markAsRead: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, userId);
      if (!notification) {
        return res
          .status(404)
          .json(responseFactory.notFound("Notification not found"));
      }
      return res.json(
        responseFactory.success(notification, "Notification marked as read"),
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },
};
