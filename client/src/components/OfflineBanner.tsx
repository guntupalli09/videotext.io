import { useEffect, useState } from 'react'

/**
 * Shows a small banner when the app goes offline so users know why requests might fail.
 * Industry standard: many leading tools surface "You're offline" for better reliability perception.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-medium"
    >
      You're offline. Uploads and processing will work when your connection is back.
    </div>
  )
}
