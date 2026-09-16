/**
 * Session storage for the extension.
 *
 * The token is the VideoText web session's own JWT, handed over by
 * /extension-auth. It lives in chrome.storage.local, which is per-profile and
 * not readable by web pages or other extensions. We never store a password, and
 * we never mint a credential of our own.
 *
 * Expiry is read from the JWT's own `exp` claim — decoded, not verified. The
 * server verifies the signature on every request; the local check only avoids
 * showing a signed-in UI for a token that is already dead.
 */
import { STORAGE_KEYS } from './config.js';
function decodeJwtExpiry(token) {
    const parts = token.split('.');
    if (parts.length !== 3)
        return null;
    try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
        const claims = JSON.parse(json);
        return typeof claims.exp === 'number' ? claims.exp : null;
    }
    catch {
        return null;
    }
}
/** True when the token carries an `exp` claim that has already passed. */
export function isExpired(token, nowSeconds = Math.floor(Date.now() / 1000)) {
    const exp = decodeJwtExpiry(token);
    return exp != null && exp <= nowSeconds;
}
/** The stored session, or null when signed out or the token has expired (expired tokens are cleared). */
export async function getSession() {
    const stored = await chrome.storage.local.get([
        STORAGE_KEYS.authToken,
        STORAGE_KEYS.plan,
        STORAGE_KEYS.email,
    ]);
    const token = stored[STORAGE_KEYS.authToken];
    if (!token)
        return null;
    if (isExpired(token)) {
        await clearSession();
        return null;
    }
    return {
        token,
        plan: stored[STORAGE_KEYS.plan] || 'free',
        email: stored[STORAGE_KEYS.email] || '',
    };
}
export async function clearSession() {
    await chrome.storage.local.remove([
        STORAGE_KEYS.authToken,
        STORAGE_KEYS.plan,
        STORAGE_KEYS.email,
    ]);
}
/** Persist plan/email refreshed from GET /api/usage/current so the popup header stays accurate. */
export async function updateSessionDetails(plan, email) {
    const patch = { [STORAGE_KEYS.plan]: plan };
    if (email)
        patch[STORAGE_KEYS.email] = email;
    await chrome.storage.local.set(patch);
}
export async function getActiveJob() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.activeJob);
    return stored[STORAGE_KEYS.activeJob] ?? null;
}
export async function setActiveJob(job) {
    await chrome.storage.local.set({ [STORAGE_KEYS.activeJob]: job });
}
export async function clearActiveJob() {
    await chrome.storage.local.remove(STORAGE_KEYS.activeJob);
}
