import { Response } from "express";
import Message from "../models/message.model";
import User from "../models/user.model";
import Application from "../models/application.model";
import FinancialProduct from "../models/product.model";
import { responseFactory } from "../utils/responseFactory";

export const chatController = {
  // Send a message
  sendMessage: async (req: any, res: Response) => {
    try {
      const senderId = req.user.id;
      const { text, recipientId, institutionId } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json(responseFactory.error("Message text is required"));
      }

      // Fetch sender details
      const sender = await User.findById(senderId);
      if (!sender) {
        return res.status(404).json(responseFactory.notFound("Sender user not found"));
      }

      // Multi-tenant check: B2B partner roles must only message their applicants
      if (recipientId && !["SuperAdmin", "Admin"].includes(sender.role)) {
        const recipient = await User.findById(recipientId);
        if (recipient && recipient.role === "Customer") {
          if (!sender.institutionId) {
            return res.status(403).json(responseFactory.error("Forbidden: Access denied to this user"));
          }
          const products = await FinancialProduct.find({ institutionId: sender.institutionId });
          const productIds = products.map(p => p._id);
          const appExists = await Application.exists({ userId: recipientId, productId: { $in: productIds } });
          if (!appExists) {
            return res.status(403).json(responseFactory.error("Forbidden: Access denied to this user"));
          }
        }
      }

      const messagePayload: any = {
        senderId,
        senderName: `${sender.firstName} ${sender.lastName}`.trim(),
        senderRole: sender.role,
        text: text.trim(),
        isRead: false
      };

      if (sender.role === "Customer") {
        if (institutionId) {
          messagePayload.institutionId = institutionId;
          
          let targetRecipientId = recipientId;
          if (!targetRecipientId) {
            // Find a partner staff user belonging to the institution to set as recipient
            const staffUser = await User.findOne({ institutionId, role: { $ne: "Customer" } }).sort({ createdAt: 1 });
            if (staffUser) {
              targetRecipientId = staffUser._id;
            }
          }
          if (targetRecipientId) {
            messagePayload.recipientId = targetRecipientId;
          }
        } else {
          // Standard platform support chat: assign recipient to support admin
          if (recipientId) {
            messagePayload.recipientId = recipientId;
          } else {
            const supportUser = await User.findOne({ role: { $in: ["SuperAdmin", "Admin"] } }).sort({ createdAt: 1 });
            if (supportUser) {
              messagePayload.recipientId = supportUser._id;
            }
          }
        }
      } else {
        // Sender is Partner/Staff/Admin
        if (sender.institutionId) {
          messagePayload.institutionId = sender.institutionId;
        }
        if (recipientId) {
          messagePayload.recipientId = recipientId;
        }
      }

      // Create new message
      const message = new Message(messagePayload);

      await message.save();

      return res.json(
        responseFactory.success(message, "Message sent successfully")
      );
    } catch (error: any) {
      return res.status(500).json(responseFactory.error(error.message));
    }
  },

  // Get conversation history between a client and admin/support/partner
  getChatHistory: async (req: any, res: Response) => {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      
      // If client: fetch their own messages
      // If admin/superadmin/partner: fetch history of a target client passed in params
      let targetClientId = currentUserId;
      if (req.params.userId) {
        // Tenancy boundary check for B2B partner users
        if (!["SuperAdmin", "Admin"].includes(currentUserRole)) {
          const institutionId = req.user.institutionId;
          if (!institutionId) {
            return res.status(403).json(responseFactory.error("Forbidden: Access denied to this user"));
          }
          const products = await FinancialProduct.find({ institutionId });
          const productIds = products.map(p => p._id);
          const appExists = await Application.exists({ userId: req.params.userId, productId: { $in: productIds } });
          
          const directMsgExists = await Message.exists({
            institutionId,
            $or: [
              { senderId: req.params.userId },
              { recipientId: req.params.userId }
            ]
          });

          if (!appExists && !directMsgExists) {
            return res.status(403).json(responseFactory.error("Forbidden: Access denied to this user"));
          }
        }
        targetClientId = req.params.userId;
      }

      const query: any = {};
      const institutionId = req.query.institutionId;

      if (institutionId) {
        query.institutionId = institutionId;
        query.$or = [
          { senderId: targetClientId },
          { recipientId: targetClientId }
        ];
      } else {
        // Support Chat Desk: fetch messages where institutionId is NOT set
        query.institutionId = { $exists: false };
        query.$or = [
          { senderId: targetClientId },
          { recipientId: targetClientId }
        ];
      }

      // Fetch messages based on query
      const history = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("senderId", "firstName lastName role email")
      .populate("recipientId", "firstName lastName role email")
      .populate("institutionId", "name logoUrl");

      // Mark unread messages received by the current user as read
      const readFilter: any = {
        recipientId: currentUserId,
        isRead: false
      };

      if (currentUserRole === "Customer") {
        // Customer should mark incoming support/partner replies as read
        readFilter.senderRole = { $ne: "Customer" };
      } else {
        // Admin/Staff/Partner should mark customer messages in the selected thread as read
        readFilter.senderId = targetClientId;
      }

      // Filter read marking to the specific thread (direct/support)
      if (institutionId) {
        readFilter.institutionId = institutionId;
      } else {
        readFilter.institutionId = { $exists: false };
      }

      await Message.updateMany(readFilter, { $set: { isRead: true } });

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
      const role = req.user.role;
      const isDirect = req.query.isDirect === 'true';
      let allowedCustomerIds: string[] = [];
      const isPlatformAdmin = ["SuperAdmin", "Admin"].includes(role);

      if (!isPlatformAdmin) {
        const institutionId = req.user.institutionId;
        if (institutionId) {
          const products = await FinancialProduct.find({ institutionId });
          const productIds = products.map(p => p._id);
          const applications = await Application.find({ productId: { $in: productIds } });
          allowedCustomerIds = applications.map(app => app.userId.toString());
        }
      }

      // Define message filter query
      const msgQuery: any = {};
      if (isDirect) {
        if (!isPlatformAdmin) {
          // B2B partner sees direct conversations for their own institutionId
          msgQuery.institutionId = req.user.institutionId;
        } else {
          // Platform admin sees all direct conversations
          msgQuery.institutionId = { $exists: true };
        }
      } else {
        // Platform support conversations (where institutionId is NOT set)
        msgQuery.institutionId = { $exists: false };
      }

      // Find all messages matching the filters
      const allMessages = await Message.find(msgQuery)
        .sort({ createdAt: -1 })
        .populate("senderId", "firstName lastName email role")
        .populate("recipientId", "firstName lastName email role")
        .populate("institutionId", "name logoUrl");

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

        // Multi-tenant check: B2B partner users only see threads of their own applicants or direct contact threads
        if (
          !isPlatformAdmin && 
          !allowedCustomerIds.includes(customerId) && 
          msg.institutionId?.toString() !== req.user.institutionId?.toString()
        ) {
          return;
        }

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
