import axios from "axios";
import Notification from "../models/notification.model";
import User from "../models/user.model";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";

export const notificationService = {
  createNotification: async ({
    userId,
    type,
    title,
    message,
    targetId,
  }: {
    userId: string;
    type: string;
    title: string;
    message: string;
    targetId?: string;
  }) => {
    return Notification.create({ userId, type, title, message, targetId });
  },

  getUserNotifications: async (userId: string, limit = 25, skip = 0) => {
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  markAsRead: async (notificationId: string, userId: string) => {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });
    if (!notification) return null;
    notification.isRead = true;
    notification.readAt = new Date();
    return notification.save();
  },

  notifyUser: async ({
    userId,
    type,
    title,
    message,
    targetId,
    email = false,
    sms = false,
  }: {
    userId: string;
    type: string;
    title: string;
    message: string;
    targetId?: string;
    email?: boolean;
    sms?: boolean;
  }) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found for notifications");
    }

    await Notification.create({ userId, type, title, message, targetId });

    const sendPromises: Promise<unknown>[] = [];

    if (email && user.email) {
      sendPromises.push(
        notificationService.sendEmailNotification(user.email, title, message),
      );
    }
    if (sms && user.phoneNumber) {
      sendPromises.push(
        notificationService.sendSmsNotification(user.phoneNumber, message),
      );
    }

    await Promise.allSettled(sendPromises);
  },

  sendEmailNotification: async (
    email: string,
    subject: string,
    body: string,
  ) => {
    if (!SENDGRID_API_KEY) {
      console.log(`Email notification stub: ${email} | ${subject} | ${body}`);
      return null;
    }

    try {
      await axios.post(
        "https://api.sendgrid.com/v3/mail/send",
        {
          personalizations: [
            {
              to: [{ email }],
              subject,
            },
          ],
          from: {
            email:
              process.env.NOTIFICATION_FROM_EMAIL ||
              "noreply@resolvebridge.com",
            name: "ResolveBridge",
          },
          content: [{ type: "text/plain", value: body }],
        },
        {
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error: any) {
      console.warn("Failed to send email notification", error.message || error);
    }
  },

  sendSmsNotification: async (phone: string, message: string) => {
    const mNotifyKey = process.env.MNOTIFY || "";
    if (mNotifyKey) {
      try {
        const senderId = process.env.MNOTIFY_SENDER_ID || "ResBridge";
        const formattedPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
        let finalPhone = formattedPhone;
        if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
          finalPhone = '233' + formattedPhone.substring(1);
        }

        const response = await axios.post(
          `https://api.mnotify.com/api/sms/quick?key=${mNotifyKey}`,
          {
            recipient: [finalPhone],
            sender_id: senderId,
            message: message,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log(`mNotify SMS response for ${finalPhone}:`, response.data);
        return response.data;
      } catch (error: any) {
        console.warn("Failed to send mNotify SMS notification", error.response?.data || error.message);
        return null;
      }
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      console.log(`SMS notification stub: ${phone} | ${message}`);
      return null;
    }

    try {
      const payload = new URLSearchParams();
      payload.append("From", TWILIO_FROM_NUMBER);
      payload.append("To", phone);
      payload.append("Body", message);

      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        payload.toString(),
        {
          auth: {
            username: TWILIO_ACCOUNT_SID,
            password: TWILIO_AUTH_TOKEN,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
    } catch (error: any) {
      console.warn("Failed to send SMS notification", error.message || error);
    }
  },
};
