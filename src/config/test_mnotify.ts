import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testSms() {
  const mNotifyKey = process.env.MNOTIFY || "";
  const senderId = process.env.MNOTIFY_SENDER_ID || "ResBridge";
  const phone = "+233246219871";

  console.log("Using API Key:", mNotifyKey);
  console.log("Using Sender ID:", senderId);

  const formattedPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  let finalPhone = formattedPhone;
  if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
    finalPhone = '233' + formattedPhone.substring(1);
  }

  console.log("Sending to formatted number:", finalPhone);

  const payload = {
    recipient: [finalPhone],
    sender: senderId,
    message: "Your ResolveBridge verification access code is: 632075. Valid for 5 minutes.",
  };

  try {
    const response = await axios.post(
      `https://api.mnotify.com/api/sms/quick?key=${mNotifyKey}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("SUCCESS Response:", response.data);
  } catch (error: any) {
    console.error("ERROR Response:", error.response?.data || error.message);
  }
}

testSms();
