/**
 * Forwards an existing videotext.io web session into the extension.
 * Reads only the same localStorage keys the website already uses (client/src/lib/auth.ts).
 * Does not modify the page.
 */
function readSiteSession() {
  try {
    const token = localStorage.getItem('authToken')
    const userId = localStorage.getItem('userId')
    if (!token || !userId) return null
    return {
      token,
      userId,
      plan: (localStorage.getItem('plan') || 'free').toLowerCase(),
      email: localStorage.getItem('userEmail') || '',
    }
  } catch {
    return null
  }
}

function sync() {
  const session = readSiteSession()
  if (!session) return
  chrome.runtime.sendMessage({ type: 'STORE_SESSION', session }, () => {
    void chrome.runtime.lastError
  })
}

sync()
window.addEventListener('videotext:plan-updated', sync)
window.addEventListener('storage', (event) => {
  if (event.key === 'authToken' || event.key === 'plan') sync()
})
