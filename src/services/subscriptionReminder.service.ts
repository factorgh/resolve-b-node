import Institution from '../models/institution.model';
import User from '../models/user.model';
import BillingInvoice from '../models/billing.model';
import { notificationService } from './notification.service';
import { auditLogger } from '../utils/auditLogger';

export const subscriptionReminderService = {
  /**
   * Check for institutions with subscriptions due in 3 days (or ending without payment)
   * and send automated 3-day notice via In-App, Email, and SMS.
   */
  checkAndSendSubscriptionDueReminders: async () => {
    try {
      console.log('🔔 [SubscriptionReminder] Running 3-day subscription due check for financial institutions...');
      const now = new Date();
      
      // 3 days from now threshold
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Find active institutions with a subscription fee whose nextBillingDate is within the next 3 days
      // or past due, and haven't received a reminder in the last 3 days
      const institutions = await Institution.find({
        isActive: true,
        subscriptionFee: { $gt: 0 },
        nextBillingDate: { $lte: threeDaysFromNow },
        $or: [
          { lastDueReminderSentAt: { $exists: false } },
          { lastDueReminderSentAt: null },
          { lastDueReminderSentAt: { $lte: threeDaysAgo } },
        ],
      });

      console.log(`[SubscriptionReminder] Found ${institutions.length} candidate institution(s) due for check.`);

      let remindersSent = 0;

      for (const inst of institutions) {
        // Check if there's already an active paid invoice covering the upcoming cycle
        const recentPaidInvoice = await BillingInvoice.findOne({
          institutionId: inst._id,
          status: 'Paid',
          billingDate: { $gte: inst.lastBillingDate },
        });

        if (recentPaidInvoice) {
          // Payment has already been done for this cycle, skip sending due notice
          continue;
        }

        const dueDateStr = inst.nextBillingDate
          ? new Date(inst.nextBillingDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'in 3 days';

        const feeFormatted = Number(inst.subscriptionFee || 80000).toLocaleString();

        const title = `⚠️ Subscription Renewal Notice: GH₵ ${feeFormatted} Due in 3 Days`;
        const message = `Notice for ${inst.name}: Your monthly ResolveBridge institutional subscription fee of GH₵ ${feeFormatted} is ending/due on ${dueDateStr}. Please settle your invoice on the partner billing desk to ensure uninterrupted API access and underwriting privileges.`;
        const smsMessage = `ResolveBridge Notice: Institutional subscription of GH₵ ${feeFormatted} for ${inst.name} is due in 3 days (${dueDateStr}). Please settle invoice on partner portal.`;

        // Find all institution admin users
        const adminUsers = await User.find({
          institutionId: inst._id,
          role: { $in: ['InstitutionAdmin', 'PartnerAdmin', 'Admin'] },
          isActive: true,
        });

        // 1. Send in-app notification to all institution admins
        for (const admin of adminUsers) {
          try {
            await notificationService.notifyUser({
              userId: admin._id.toString(),
              type: 'BILLING',
              title,
              message,
              targetId: inst._id.toString(),
              email: false,
              sms: false,
            });
          } catch (err: any) {
            console.warn(`[SubscriptionReminder] In-app notification error for user ${admin._id}:`, err.message);
          }
        }

        // 2. Send email notification to institution email and all admin emails
        const emailsToSend = new Set<string>();
        if (inst.email) emailsToSend.add(inst.email);
        adminUsers.forEach((u) => {
          if (u.email) emailsToSend.add(u.email);
        });

        for (const email of Array.from(emailsToSend)) {
          try {
            await notificationService.sendEmailNotification(
              email,
              `[Action Required] ResolveBridge Subscription Notice for ${inst.name} — Due in 3 Days`,
              `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; borderRadius: 16px;">
                <h2 style="color: #0d1b3e; margin-top: 0;">Institutional Subscription Renewal Notice</h2>
                <p>Dear <strong>${inst.name}</strong> Team,</p>
                <p>This is a formal 3-day notice that your ResolveBridge institutional platform subscription is due for renewal.</p>
                <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0 0 8px;"><strong>Institution:</strong> ${inst.name}</p>
                  <p style="margin: 0 0 8px;"><strong>Renewal Fee:</strong> GH₵ ${feeFormatted}</p>
                  <p style="margin: 0;"><strong>Due Date:</strong> ${dueDateStr}</p>
                </div>
                <p>Please log in to your <a href="https://resolvebridge.com/admin/billing" style="color: #2563eb; font-weight: bold;">Partner Billing Desk</a> to review and settle your monthly invoice.</p>
                <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Thank you for partnering with ResolveBridge Financial Infrastructure.</p>
              </div>`
            );
          } catch (err: any) {
            console.warn(`[SubscriptionReminder] Email notification error for ${email}:`, err.message);
          }
        }

        // 3. Send SMS notification to primary institution phone and admin phones
        const phonesToSend = new Set<string>();
        if (inst.phoneNumber) phonesToSend.add(inst.phoneNumber);
        adminUsers.forEach((u) => {
          if (u.phoneNumber) phonesToSend.add(u.phoneNumber);
        });

        for (const phone of Array.from(phonesToSend)) {
          try {
            await notificationService.sendSmsNotification(phone, smsMessage);
          } catch (err: any) {
            console.warn(`[SubscriptionReminder] SMS notification error for ${phone}:`, err.message);
          }
        }

        // 4. Update lastDueReminderSentAt timestamp on the institution
        inst.lastDueReminderSentAt = new Date();
        await inst.save();

        // 5. Audit log
        await auditLogger.log({
          adminId: (adminUsers[0]?._id as any) || (inst._id as any),
          action: 'Subscription3DayDueNoticeSent',
          targetId: inst._id as any,
          details: `Dispatched 3-day subscription due notice for ${inst.name} (GH₵ ${feeFormatted} due ${dueDateStr}) via In-App, Email, and SMS.`,
        });

        remindersSent++;
        console.log(`✅ [SubscriptionReminder] 3-day due notice sent to ${inst.name} (${dueDateStr})`);
      }

      console.log(`[SubscriptionReminder] Completed check. Sent ${remindersSent} 3-day due notice(s).`);
      return { count: remindersSent };
    } catch (error: any) {
      console.error('[SubscriptionReminder] Error running 3-day due reminders check:', error.message);
      throw error;
    }
  },

  /**
   * Start automated background cron / interval timer for subscription reminders.
   * Runs upon server startup and checks every 12 hours.
   */
  startSubscriptionReminderScheduler: () => {
    // Initial run after 15 seconds to allow DB connection stabilization
    setTimeout(() => {
      subscriptionReminderService.checkAndSendSubscriptionDueReminders().catch((err) => {
        console.warn('[SubscriptionReminder] Initial background reminder run error:', err.message);
      });
    }, 15000);

    // Recurring check every 12 hours
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    setInterval(() => {
      subscriptionReminderService.checkAndSendSubscriptionDueReminders().catch((err) => {
        console.warn('[SubscriptionReminder] Scheduled reminder interval error:', err.message);
      });
    }, TWELVE_HOURS_MS);

    console.log('⏰ [SubscriptionReminder] 3-day subscription due notice scheduler active (12h cycle).');
  },
};
