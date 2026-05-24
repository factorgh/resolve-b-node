import { Response } from "express";
import Message from "../models/message.model";
import User from "../models/user.model";
import { responseFactory } from "../utils/responseFactory";

export const chatController = {
  // Send a message
  sendMessage: async (req: any, res: Response) => {
    try {
      const senderId = req.user.id;
      const { text, recipientId } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json(responseFactory.error("Message text is required"));
      }

      // Fetch sender details
      const sender = await User.findById(senderId);
      if (!sender) {
        return res.status(404).json(responseFactory.notFound("Sender user not found"));
      }

      // Create new message
      const message = new Message({
        senderId,
        senderName: `${sender.firstName} ${sender.lastName}`.trim(),
        senderRole: sender.role,
        recipientId: recipientId || undefined,
        text: text.trim(),
        isRead: false
      });

      await message.save();

      return res.json(
        responseFactory.success(message, "Message sent successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Get conversation history between a client and admin/support
  getChatHistory: async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      
      // If client: fetch their own messages
      // If admin/superadmin: fetch history of a target client passed in params
      let targetClientId = currentUserId;
      if (["SuperAdmin", "Admin"].includes(currentUserRole) && req.params.userId) {
        targetClientId = req.params.userId;
      }

      // Fetch all messages involving the target client
      const history = await Message.find({
        $or: [
          { senderId: targetClientId },
          { recipientId: targetClientId }
        ]
      })
      .sort({ createdAt: 1 })
      .populate("senderId", "firstName lastName role email")
      .populate("recipientId", "firstName lastName role email");

      // Mark unread messages received by the current user as read
      await Message.updateMany(
        {
          recipientId: currentUserId,
          senderId: targetClientId,
          isRead: false
        },
        { $set: { isRead: true } }
      );

      // Also support marking public support messages as read for admins
      if (["SuperAdmin", "Admin"].includes(currentUserRole)) {
        await Message.updateMany(
          {
            senderId: targetClientId,
            recipientId: { $exists: false },
            isRead: false
          },
          { $set: { isRead: true } }
        );
      }

      return res.json(
        responseFactory.success(history, "Chat history retrieved successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Compile list of unique client conversation channels for the Admin Panel
  getAdminConversations: async (req: any, res: Response) => {
    try {
      // Find all messages that are from Customers or sent to Customers
      const allMessages = await Message.find()
        .sort({ createdAt: -1 })
        .populate("senderId", "firstName lastName email role")
        .populate("recipientId", "firstName lastName email role");

      const threadsMap: { [key: string]: any } = {};

      allMessages.forEach((msg: any) => {
        // Determine the customer in this message
        let customer: any = null;
        if (msg.senderRole === "Customer") {
          customer = msg.senderId;
        } else if (msg.recipientId && msg.recipientId.role === "Customer") {
          customer = msg.recipientId;
        }

        if (!customer || !customer._id) return;

        const customerId = customer._id.toString();

        if (!threadsMap[customerId]) {
          threadsMap[customerId] = {
            customerId,
            customerName: `${customer.firstName} ${customer.lastName}`.trim(),
            customerEmail: customer.email,
            latestMessage: msg.text,
            latestTimestamp: msg.createdAt,
            unreadCount: 0
          };
        }

        // Count as unread if the message was sent by customer and not read yet
        if (msg.senderRole === "Customer" && !msg.isRead) {
          threadsMap[customerId].unreadCount += 1;
        }
      });

      const conversations = Object.values(threadsMap).sort(
        (a: any, b: any) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
      );

      return res.json(
        responseFactory.success(conversations, "Admin support conversations compiled successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  }
};
