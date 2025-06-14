import { simpleParser } from "mailparser";
import imaps from "imap-simple";
import fetch from "node-fetch";

const webhookUrl = "https://api.bots.business/v1/bots/2018361/new-webhook?&command=%2FonWebhook&public_user_token=5d596f7f2412aeca49d1fd4256d4c57a&user_id=48885563";

export default async function handler(req, res) {
  const { mail, appPassword } = req.body;

  if (!mail || !appPassword) {
    return res.status(400).json({ error: "Missing mail or appPassword" });
  }

  const config = {
    imap: {
      user: mail,
      password: appPassword,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: [""],
      markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const item of messages) {
      const all = item.parts.find(part => part.which === "");
      const parsed = await simpleParser(all.body);

      const body = parsed.text || parsed.html || "";
      const match = body.match(/\b\d{4,8}\b/); // Match OTP

      if (match) {
        const otp = match[0];

        // Send to Bot Webhook
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp, mail })
        });

        return res.status(200).json({ status: "sent", otp });
      }
    }

    return res.status(200).json({ status: "no otp found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to read email", details: err.message });
  }
}
