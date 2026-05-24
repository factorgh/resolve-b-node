import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const webhookUrl =
  process.env.APP_URL?.replace(/\/\/$/, "") || "http://localhost:5001";
const endpoint = `${webhookUrl}/api/v1/Payments/webhook`;
const secret = process.env.PAYSTACK_WEBHOOK_SECRET || "";

const payload = {
  event: "charge.success",
  data: {
    id: 1234567890,
    domain: "test",
    status: "success",
    reference: "PSK-TEST-REFERENCE",
    amount: 50000,
    currency: "GHS",
    transaction_date: new Date().toISOString(),
    channel: "card",
    ip_address: "127.0.0.1",
    metadata: {
      userId: "000000000000000000000000",
    },
    authorization: {
      authorization_code: "AUTH_code",
      bin: "408408",
      last4: "4081",
      exp_month: "12",
      exp_year: "2025",
      channel: "card",
      card_type: "visa",
      bank: "TEST BANK",
      country_code: "GH",
      reusable: false,
      signature: "SIG_value",
    },
    customer: {
      id: 12345,
      email: "test@example.com",
      phone: "0240000000",
      name: "Test User",
    },
    gateway_response: "Approved",
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const payloadString = JSON.stringify(payload);
const signature = crypto
  .createHmac("sha512", secret)
  .update(payloadString)
  .digest("hex");

(async () => {
  try {
    const response = await axios.post(endpoint, payloadString, {
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": signature,
      },
    });

    console.log("Webhook response status:", response.status);
    console.log("Webhook response data:", response.data);
  } catch (error: any) {
    console.error("Webhook simulation failed:");
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
})();
