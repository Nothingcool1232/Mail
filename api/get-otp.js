import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { email, appPassword } = req.body;

  if (!email || !appPassword) {
    return res.status(400).json({ error: 'Email and App Password required' });
  }

  const config = {
    imap: {
      user: email,
      password: appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 10000,
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length === 0) {
      return res.status(200).json({ success: true, message: 'No unread OTP emails found.' });
    }

    for (let item of messages) {
      const all = item.parts.find(part => part.which === 'TEXT');
      const id = item.attributes.uid;
      const body = all.body;

      // OTP extractor (4–8 digit number)
      const otpMatch = body.match(/\b\d{4,8}\b/);
      if (otpMatch) {
        return res.status(200).json({
          success: true,
          otp: otpMatch[0],
          message: 'OTP extracted from unread email.'
        });
      }
    }

    return res.status(200).json({ success: false, message: 'No OTP found in unread emails.' });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

