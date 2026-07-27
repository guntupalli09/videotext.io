/**
 * Known founder/personal-testing email addresses, historically used for
 * manual account testing rather than real customer usage. Originally
 * hardcoded only in server/src/scripts/delete-test-users.ts; extracted here
 * (Analytics Sprint 2) so it can be shared with
 * server/src/scripts/backfill-user-taxonomy.ts without importing a script
 * file that has its own unrelated startup side effects (delete-test-users.ts
 * constructs a Stripe client and exits if STRIPE_SECRET_KEY is unset, purely
 * because of the file being imported, not because of anything the importer
 * actually needs).
 */
export const KNOWN_TEST_EMAILS = [
  'santhosh.guntupalli09@gmail.com',
  'rachakatlavishnupriya@gmail.com',
  'vishnupriyarachakatla07@gmail.com',
  'gvksg999@gmail.com',
  'vishnrach2000@gmail.com',
  'santhosh.guntupalli09@outlook.com',
  'santoshgfall2022@gmail.com',
]
