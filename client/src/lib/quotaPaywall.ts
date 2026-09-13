import { isLoggedIn } from './auth'

/** Signed-up Free is 3 imports / calendar month; guests are 3 / IP / UTC day. */
export function freeImportLimitReason(): 'FREE_MONTHLY_LIMIT_REACHED' | 'FREE_DAILY_LIMIT_REACHED' {
  return isLoggedIn() ? 'FREE_MONTHLY_LIMIT_REACHED' : 'FREE_DAILY_LIMIT_REACHED'
}
