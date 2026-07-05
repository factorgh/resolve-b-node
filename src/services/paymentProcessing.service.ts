import PaymentTransaction from "../models/paymentTransaction.model";
import BillingInvoice from "../models/billing.model";

export type PaymentClaimResult = {
  claimed: boolean;
  idempotent: boolean;
  transaction: InstanceType<typeof PaymentTransaction> | null;
};

/**
 * Atomically claim a payment as successful. Only one concurrent handler wins.
 */
export async function claimPaymentSuccess(
  reference: string,
  verificationResponse: Record<string, unknown>,
  paymentMethod?: string,
): Promise<PaymentClaimResult> {
  const existing = await PaymentTransaction.findOne({ reference });
  if (!existing) {
    return { claimed: false, idempotent: false, transaction: null };
  }

  if (existing.status === "success") {
    return { claimed: false, idempotent: true, transaction: existing };
  }

  const updated = await PaymentTransaction.findOneAndUpdate(
    { reference, status: { $ne: "success" } },
    {
      $set: {
        status: "success",
        verificationData: {
          verifiedAt: new Date(),
          verificationResponse,
        },
        paymentMethod: paymentMethod || "unknown",
        providerResponse: verificationResponse,
      },
    },
    { new: true },
  );

  if (!updated) {
    const current = await PaymentTransaction.findOne({ reference });
    return {
      claimed: false,
      idempotent: current?.status === "success",
      transaction: current,
    };
  }

  return { claimed: true, idempotent: false, transaction: updated };
}

/**
 * Atomically mark invoice as paid (prevents double settlement).
 */
export async function claimInvoicePaid(invoiceId: string) {
  return BillingInvoice.findOneAndUpdate(
    { _id: invoiceId, status: { $ne: "Paid" } },
    { $set: { status: "Paid", paidAt: new Date() } },
    { new: true },
  );
}
