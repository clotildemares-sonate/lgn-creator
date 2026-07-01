import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'LaGrowthNews';
    const listIdsRaw = process.env.BREVO_LIST_ID;
    const replyTo = process.env.BREVO_REPLY_TO;

    if (!apiKey) {
      return res.status(500).json({ error: 'BREVO_API_KEY not configured' });
    }
    if (!senderEmail) {
      return res.status(500).json({ error: 'BREVO_SENDER_EMAIL not configured' });
    }
    if (!listIdsRaw) {
      return res.status(500).json({ error: 'BREVO_LIST_ID not configured' });
    }

    const listIds = listIdsRaw
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value));

    if (listIds.length === 0) {
      return res.status(500).json({ error: 'BREVO_LIST_ID is invalid (expected numeric list id(s))' });
    }

    const { name, subject, html, previewText } = req.body ?? {};

    if (!subject) {
      return res.status(400).json({ error: 'subject is required' });
    }
    if (!html || String(html).length < 10) {
      return res.status(400).json({ error: 'html content is required' });
    }

    const payload: Record<string, unknown> = {
      name: name || 'LaGrowthNews',
      subject,
      sender: { name: senderName, email: senderEmail },
      htmlContent: html,
      recipients: { listIds },
    };

    if (previewText) {
      payload.previewText = previewText;
    }
    if (replyTo) {
      payload.replyTo = replyTo;
    }

    const response = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Erreur lors de la création de la campagne Brevo',
        code: data.code,
      });
    }

    return res.status(201).json({ id: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
