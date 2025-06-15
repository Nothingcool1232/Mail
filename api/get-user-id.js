// /api/get-user-id.js
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }

  const url = `https://t.me/${username}`;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Look for user ID in <meta> tags or inline JS
    const scriptTags = $('script').get();

    for (let script of scriptTags) {
      const content = $(script).html();

      if (content && content.includes('user_id')) {
        const match = content.match(/user_id":(\d+)/);
        if (match && match[1]) {
          return res.json({ username, user_id: match[1] });
        }
      }
    }

    return res.status(404).json({ error: 'User ID not found on the page' });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile page', details: err.message });
  }
}
