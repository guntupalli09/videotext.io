/**
 * Idempotently provision (or refresh) a normal-customer Pro account for the
 * Zapier reviewer, e.g. integration-testing@zapier.com.
 *
 * This grants the SAME entitlements a paying Pro customer gets — it just
 * sets `plan: 'pro'` on the user row and leaves `billingPeriodEnd` /
 * `subscriptionId` unset, so `enforceSubscriptionState()`
 * (server/src/utils/subscriptionGuard.ts) never auto-downgrades it: that
 * function only downgrades when `billingPeriodEnd` has passed AND there is
 * no `subscriptionId` — with `billingPeriodEnd` unset the "expired" check
 * is false, so the account is Pro indefinitely without a real Stripe
 * subscription. It is not a founder/admin account (see
 * server/src/utils/founderAccount.ts) — it has ordinary Pro permissions,
 * nothing more.
 *
 * Idempotent: re-running with the same --email updates the existing user
 * (plan, limits) in place rather than creating a duplicate. A password is
 * only generated on first creation.
 *
 * Usage (from server/):
 *   npx tsx scripts/provision-zapier-reviewer.ts --email integration-testing@zapier.com
 *   npx tsx scripts/provision-zapier-reviewer.ts --email integration-testing@zapier.com --reset-password
 *
 * Flags:
 *   --email <email>       required
 *   --plan <plan>         default "pro" (any PlanType except founding_workflow/business)
 *   --reset-password      generate and print a brand-new password even if the user exists
 *
 * SECURITY: the generated password is printed to stdout exactly once and is
 * NEVER written to a file or committed. Copy it immediately into the Zapier
 * submission form's reviewer-credentials field and then discard it from
 * your terminal history. Do not paste it into chat, a ticket, or a repo.
 */
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const credPath = path.join(__dirname, 'verify-credentials.env')
if (fs.existsSync(credPath)) {
  const lines = fs.readFileSync(credPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}
import '../src/env'
import bcrypt from 'bcryptjs'
import { getUserByEmail, saveUser } from '../src/models/User'
import { getPlanLimits } from '../src/utils/limits'
import type { User, PlanType } from '../src/models/User'

const ALLOWED_PLANS: PlanType[] = ['free', 'basic', 'pro', 'agency', 'business']

function parseArgs(argv: string[]): { email?: string; plan: PlanType; resetPassword: boolean } {
  let email: string | undefined
  let plan: PlanType = 'pro'
  let resetPassword = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--email') email = argv[++i]
    else if (arg === '--plan') {
      const raw = argv[++i]
      if (!(ALLOWED_PLANS as string[]).includes(raw)) {
        throw new Error(`--plan must be one of: ${ALLOWED_PLANS.join(', ')}`)
      }
      plan = raw as PlanType
    } else if (arg === '--reset-password') resetPassword = true
  }
  return { email, plan, resetPassword }
}

function generatePassword(): string {
  // 24 random bytes, base64url — well above any reasonable entropy bar for a
  // one-off reviewer account; never derived from anything guessable.
  return crypto.randomBytes(24).toString('base64url')
}

async function main() {
  const { email: rawEmail, plan, resetPassword } = parseArgs(process.argv.slice(2))
  if (!rawEmail) {
    console.error('Usage: npx tsx scripts/provision-zapier-reviewer.ts --email <email> [--plan pro] [--reset-password]')
    process.exit(1)
  }
  const email = rawEmail.trim().toLowerCase()
  const now = new Date()
  const limits = getPlanLimits(plan)

  const existing = await getUserByEmail(email)
  let printedPassword: string | undefined

  if (existing) {
    existing.plan = plan
    existing.limits = limits
    // Never let a real Stripe subscription/expiry sneak in here — this
    // account's Pro access must not depend on billing state.
    existing.subscriptionId = undefined
    existing.billingPeriodEnd = undefined
    existing.subscriptionStatus = undefined
    existing.cancelAtPeriodEnd = false
    existing.suspended = false
    existing.updatedAt = now
    if (resetPassword) {
      const password = generatePassword()
      existing.passwordHash = await bcrypt.hash(password, 10)
      printedPassword = password
    }
    await saveUser(existing)
    console.log(`Updated existing user ${email} -> plan=${plan} (non-expiring: no billingPeriodEnd/subscriptionId set).`)
  } else {
    const password = generatePassword()
    const user: User = {
      id: email,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      plan,
      stripeCustomerId: undefined,
      subscriptionId: undefined,
      paymentMethodId: undefined,
      usageThisMonth: {
        totalMinutes: 0,
        videoCount: 0,
        batchCount: 0,
        languageCount: 0,
        translatedMinutes: 0,
        importCount: 0,
        resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        importCountToday: 0,
        importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        dailyMinutesToday: 0,
        dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      limits,
      overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
      createdAt: now,
      updatedAt: now,
    }
    await saveUser(user)
    printedPassword = password
    console.log(`Created new user ${email} -> plan=${plan} (non-expiring: no billingPeriodEnd/subscriptionId set).`)
  }

  if (printedPassword) {
    console.log('')
    console.log('One-time password (copy now, this is never printed or stored again):')
    console.log(printedPassword)
    console.log('')
    console.log('Paste this directly into the Zapier "reviewer credentials" submission field, then clear your terminal scrollback.')
  } else {
    console.log('Existing password unchanged. Pass --reset-password to generate a new one.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => process.exit(0))
