import crypto from 'crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const unsubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { message: 'Too many requests. Please try again later.' },
})

export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32)
}


async function unsubscribeEmail(email: string, token: string): Promise<'success' | 'invalid'> {
  const expected = generateUnsubscribeToken(email)
  if (token !== expected) return 'invalid'

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { newsletterSubscribed: false },
    })
  }

  // Treat unknown addresses as success to avoid email enumeration.
  return 'success'
}

function renderUnsubscribeHtml(status: 'success' | 'invalid' | 'error'): string {
  const content = {
    success: {
      title: "You've been unsubscribed",
      body: "You won't receive further newsletter emails from VideoText.io.",
    },
    invalid: {
      title: 'Invalid unsubscribe link',
      body: 'This link may be expired or malformed. Please use the unsubscribe link from a recent email.',
    },
    error: {
      title: 'Something went wrong',
      body: "We couldn't process your unsubscribe request. Please try again or reply to any newsletter email to be removed.",
    },
  }[status]

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${content.title} | VideoText</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}
    main{max-width:420px;text-align:center;background:#111827;border:1px solid #334155;border-radius:18px;padding:36px 28px;box-shadow:0 20px 50px rgba(0,0,0,.35)}
    .icon{width:52px;height:52px;border-radius:999px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;background:${status === 'success' ? '#14532d' : '#7f1d1d'};font-size:28px}
    h1{font-size:24px;line-height:1.2;margin:0 0 12px}
    p{color:#cbd5e1;line-height:1.55;margin:0 0 24px}
    a{color:#60a5fa;text-decoration:none;font-weight:600}
  </style>
</head>
<body>
  <main>
    <div class="icon" aria-hidden="true">${status === 'success' ? '✓' : '!'}</div>
    <h1>${content.title}</h1>
    <p>${content.body}</p>
    <a href="https://videotext.io/">← Back to VideoText</a>
  </main>
</body>
</html>`
}

router.get('/unsubscribe', unsubscribeLimiter, async (req, res) => {
  const email = req.query.email as unknown
  const token = req.query.token as unknown

  if (!email || typeof email !== 'string' || !token || typeof token !== 'string') {
    return res.status(400).type('html').send(renderUnsubscribeHtml('invalid'))
  }

  try {
    const status = await unsubscribeEmail(email, token)
    return res.status(status === 'success' ? 200 : 400).type('html').send(renderUnsubscribeHtml(status))
  } catch (e) {
    log.warn({ msg: 'Unsubscribe error', error: (e as Error)?.message })
    return res.status(500).type('html').send(renderUnsubscribeHtml('error'))
  }
})

router.post('/unsubscribe', unsubscribeLimiter, async (req, res) => {
  // Accept params from body (browser fetch) or query string (RFC 8058 one-click from email clients)
  const email = (req.body?.email ?? req.query.email) as unknown
  const token = (req.body?.token ?? req.query.token) as unknown

  if (!email || typeof email !== 'string' || !token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Missing email or token.' })
  }

  try {
    const status = await unsubscribeEmail(email, token)
    if (status === 'invalid') return res.status(400).json({ message: 'Invalid unsubscribe link.' })
    return res.json({ success: true })
  } catch (e) {
    log.warn({ msg: 'Unsubscribe error', error: (e as Error)?.message })
    return res.status(500).json({ message: 'Failed to unsubscribe. Please try again.' })
  }
})

export default router
