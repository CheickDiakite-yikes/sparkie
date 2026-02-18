import { Router, Request, Response } from 'express';
import { getRequestId, logError, logInfo, summarizeError } from '../logger.js';
import { createObjectStorageClient } from '../objectStorage.js';
import { requireAuth } from './auth.js';

const router = Router();
const client = createObjectStorageClient();

function detectMimeType(buffer: Buffer, storageKey: string): string {
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer.length >= 3 &&
      buffer[0] === 0xFF &&
      buffer[1] === 0xD8 &&
      buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  const lowerKey = storageKey.toLowerCase();
  if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerKey.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

router.post('/upload', requireAuth, async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
  try {
    const { data, filename, content_type } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Base64 data is required', request_id: requestId });
    }

    const storageKey = `uploads/${Date.now()}-${filename || 'image.png'}`;
    const buffer = Buffer.from(data, 'base64');

    const uploadResult = await client.uploadFromBytes(storageKey, buffer);
    if (!uploadResult.ok) {
      logError('storage.upload.failure', {
        requestId,
        userId: req.session.userId || null,
        storageKey,
        bytes: buffer.length,
        error: uploadResult.error,
      });
      return res.status(502).json({ error: 'Upload failed', request_id: requestId });
    }

    logInfo('storage.upload.success', {
      requestId,
      userId: req.session.userId || null,
      storageKey,
      bytes: buffer.length,
      contentTypeHint: content_type || null,
    });

    return res.json({
      storage_key: storageKey,
      url: `/api/images/${encodeURIComponent(storageKey)}`,
      request_id: requestId,
    });
  } catch (error) {
    logError('storage.upload.failure', {
      requestId,
      userId: req.session.userId || null,
      error: summarizeError(error),
    });
    return res.status(500).json({ error: 'Upload failed', request_id: requestId });
  }
});

router.get('/:key(*)', requireAuth, async (req: Request, res: Response) => {
  const requestId = getRequestId(req, res);
  try {
    const storageKey = req.params.key as string;

    if (!storageKey) {
      return res.status(400).json({ error: 'Storage key is required', request_id: requestId });
    }

    const result = await client.downloadAsBytes(storageKey);

    if (!result.ok || !result.value) {
      logInfo('storage.download.not_found', {
        requestId,
        userId: req.session.userId || null,
        storageKey,
      });
      return res.status(404).json({ error: 'Image not found', request_id: requestId });
    }

    const rawValue = result.value as unknown;
    // @google-cloud/storage `download()` returns [Buffer], so unwrap tuple first.
    const rawBytes = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const buf = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes as ArrayBufferLike);
    const contentType = detectMimeType(buf, storageKey);

    logInfo('storage.download.success', {
      requestId,
      userId: req.session.userId || null,
      storageKey,
      bytes: buf.length,
      contentType,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.send(buf);
  } catch (error) {
    logError('storage.download.failure', {
      requestId,
      userId: req.session.userId || null,
      storageKey: req.params.key || null,
      error: summarizeError(error),
    });
    return res.status(500).json({ error: 'Download failed', request_id: requestId });
  }
});

export default router;
