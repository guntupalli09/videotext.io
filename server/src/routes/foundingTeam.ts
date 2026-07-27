import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const submitLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.ip ?? 'unknown'),
  message: { message: 'Too many submissions. Please try again later.' },
})

function sanitize(v: unknown, maxLen = 5000): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, maxLen)
}

function sanitizeOrNull(v: unknown, maxLen = 5000): string | null {
  const s = sanitize(v, maxLen)
  return s || null
}

router.post('/apply', submitLimit, async (req: Request, res: Response) => {
  try {
    const b = req.body as Record<string, unknown>

    const fullName = sanitize(b.fullName, 200)
    const email = sanitize(b.email, 500)
    const linkedIn = sanitize(b.linkedIn, 500)
    const impactDescription = sanitize(b.impactDescription)
    const whyVideoText = sanitize(b.whyVideoText)
    const opportunities = sanitize(b.opportunities)
    const first90Days = sanitize(b.first90Days)
    const hoursPerWeek = sanitize(b.hoursPerWeek, 50)
    const preferredCollaboration = sanitize(b.preferredCollaboration, 50)

    if (!fullName || !email || !linkedIn || !impactDescription || !whyVideoText || !opportunities || !first90Days || !hoursPerWeek || !preferredCollaboration) {
      return res.status(400).json({ message: 'Please fill in all required fields.' })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }

    const areasOfHelp = Array.isArray(b.areasOfHelp)
      ? (b.areasOfHelp as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 20)
      : []

    const application = await prisma.foundingTeamApplication.create({
      data: {
        fullName,
        email,
        phone: sanitizeOrNull(b.phone, 50),
        linkedIn,
        portfolio: sanitizeOrNull(b.portfolio, 500),
        resumeUrl: sanitizeOrNull(b.resumeUrl, 1000),
        resumeFileName: sanitizeOrNull(b.resumeFileName, 200),
        currentCompany: sanitizeOrNull(b.currentCompany, 200),
        currentPosition: sanitizeOrNull(b.currentPosition, 200),
        yearsOfExperience: sanitizeOrNull(b.yearsOfExperience, 50),
        industry: sanitizeOrNull(b.industry, 100),
        areasOfHelp,
        impactDescription,
        hasSaasExperience: b.hasSaasExperience === true,
        saasDetails: sanitizeOrNull(b.saasDetails),
        whyVideoText,
        opportunities,
        first90Days,
        hoursPerWeek,
        preferredCollaboration,
        location: sanitizeOrNull(b.location, 200),
        anythingElse: sanitizeOrNull(b.anythingElse),
        consentGiven: b.consentGiven === true,
      },
    })

    notifyAdmin(application).catch((e) =>
      log.warn({ msg: 'Admin notification failed', error: (e as Error)?.message })
    )

    return res.status(201).json({ ok: true })
  } catch (e) {
    log.error({ msg: 'Founding team application failed', error: (e as Error)?.message })
    return res.status(500).json({ message: 'Failed to submit application. Please try again.' })
  }
})

async function notifyAdmin(app: {
  fullName: string
  email: string
  linkedIn: string
  currentCompany: string | null
  currentPosition: string | null
  industry: string | null
  hoursPerWeek: string
  preferredCollaboration: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'VideoText <onboarding@resend.dev>'
  if (!resendKey || !adminEmail) return

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2d2d4e">
        <tr>
          <td style="padding:32px 40px 16px">
            <h1 style="margin:0 0 8px;color:#ffffff;font-size:22px;font-weight:700">New Founding Team Application</h1>
            <p style="margin:0;color:#a0a0c0;font-size:14px">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">Name:</strong> ${app.fullName}</td></tr>
              <tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">Email:</strong> ${app.email}</td></tr>
              <tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">LinkedIn:</strong> ${app.linkedIn}</td></tr>
              ${app.currentCompany ? `<tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">Company:</strong> ${app.currentCompany}</td></tr>` : ''}
              ${app.currentPosition ? `<tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">Position:</strong> ${app.currentPosition}</td></tr>` : ''}
              ${app.industry ? `<tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">Industry:</strong> ${app.industry}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#a0a0c0;font-size:13px;border-bottom:1px solid #2d2d4e"><strong style="color:#fff">Availability:</strong> ${app.hoursPerWeek} hrs/wk · ${app.preferredCollaboration}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: fromEmail,
      to: [adminEmail],
      subject: `Founding Team Application: ${app.fullName}`,
      html,
    }),
    signal: AbortSignal.timeout(8000),
  })
}

export default router
