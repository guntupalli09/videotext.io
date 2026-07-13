/**
 * One-off: remove null-star ("—") Feedback rows and a specific bad entry.
 * Run in prod: docker exec videotools-api npx tsx scripts/cleanupFeedbackRatings.ts
 * Dry run by default — pass --apply to actually delete.
 */
import '../src/env'
import { prisma } from '../src/db'

const BAD_IDS = ['5b930332-66a1-44b7-a902-5faeddefc417']
const apply = process.argv.includes('--apply')

async function main() {
  const nullStars = await prisma.feedback.findMany({
    where: { stars: null },
    select: { id: true, email: true, comment: true, createdAt: true },
  })
  const badEntries = await prisma.feedback.findMany({
    where: { id: { in: BAD_IDS } },
    select: { id: true, email: true, stars: true, comment: true, createdAt: true },
  })

  console.log(`Null-star rows: ${nullStars.length}`)
  for (const r of nullStars) console.log(`  ${r.id} ${r.email ?? ''} ${r.comment ?? ''} ${r.createdAt.toISOString()}`)

  console.log(`\nSpecific bad-id rows: ${badEntries.length}`)
  for (const r of badEntries) console.log(`  ${r.id} stars=${r.stars} ${r.email ?? ''} ${r.createdAt.toISOString()}`)

  if (!apply) {
    console.log('\nDry run only — pass --apply to delete these rows.')
    return
  }

  const del1 = await prisma.feedback.deleteMany({ where: { stars: null } })
  const del2 = await prisma.feedback.deleteMany({ where: { id: { in: BAD_IDS } } })
  console.log(`\nDeleted ${del1.count} null-star rows and ${del2.count} specific-id rows.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
