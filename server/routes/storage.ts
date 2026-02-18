import { Router, Request, Response } from 'express';
import { Client } from '@replit/object-storage';
import { requireAuth } from './auth.js';

const router = Router();
const client = new Client();

router.post('/upload', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, filename, content_type } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Base64 data is required' });
    }

    const storageKey = `uploads/${Date.now()}-${filename || 'image.png'}`;
    const buffer = Buffer.from(data, 'base64');

    await client.uploadFromBytes(storageKey, buffer);

    return res.json({ storage_key: storageKey, url: `/api/images/${encodeURIComponent(storageKey)}` });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/:key(*)', requireAuth, async (req: Request, res: Response) => {
  try {
    const storageKey = req.params.key as string;

    if (!storageKey) {
      return res.status(400).json({ error: 'Storage key is required' });
    }

    const result = await client.downloadAsBytes(storageKey);

    if (!result.ok || !result.value) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.send(result.value);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
