'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Export handleWebhook(req, res), used by POST /webhooks in app.js.
// Also export _processedIds (your Set or Map) for test inspection/reset.
//
// Steps (in order):
//  1. Verify HMAC-SHA256 signature
//     - Signature header: req.headers['x-webhook-signature'] → 'sha256=<hex>'
//     - Compute: crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex')
//     - Compare: crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(received,'hex'))
//     - Mismatch or missing → res.status(401).json({ error: 'Invalid signature' })
//
//  2. Parse body: const event = JSON.parse(req.body)
//
//  3. Idempotency: if _processedIds.has(event.id) → res.status(200).json({ status: 'already_processed' })
//
//  4. Mark: _processedIds.add(event.id)
//
//  5. Acknowledge: res.status(200).json({ status: 'received' })
//     Then call handleEvent(event) inside setImmediate(() => { ... })

const { handleEvent } = require('./eventHandlers');
const crypto = require('node:crypto');

const _processedIds = new Set();

async function handleWebhook(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest();
  const receivedHex = typeof signature === 'string'
    ? signature.match(/^sha256=([0-9a-f]{64})$/i)
    : null;

  if (!receivedHex) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const received = Buffer.from(receivedHex[1], 'hex');
  if (!crypto.timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body);

  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  _processedIds.add(event.id);
  res.status(200).json({ status: 'received' });
  setImmediate(() => handleEvent(event));
}

module.exports = { handleWebhook, _processedIds };
