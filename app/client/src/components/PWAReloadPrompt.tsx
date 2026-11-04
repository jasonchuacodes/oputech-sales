'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'

const TOAST_ID = 'pwa-update'

/**
 * Registers the service worker and, when a new version has been precached,
 * surfaces a toast prompting the user to reload into the fresh build.
 * Rendered once at the app root.
 */
export const PWAReloadPrompt = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return

    let refreshing = false
    const handleControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      const promptForUpdate = () => {
        if (!registration.waiting) return
        toast(
          (toastInstance) => (
            <div className="flex items-center gap-3">
              <span className="text-sm">A new version is available.</span>
              <button
                onClick={() => {
                  toast.dismiss(toastInstance.id)
                  registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                }}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Reload
              </button>
            </div>
          ),
          { id: TOAST_ID, duration: Infinity }
        )
      }

      promptForUpdate()
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', promptForUpdate)
      })
      window.setInterval(() => void registration.update(), 60 * 60 * 1000)
    })

    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  return null
}
