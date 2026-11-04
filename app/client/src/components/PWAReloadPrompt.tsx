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
    if (
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    )
      return

    let disposed = false
    let reloadRequested = false
    let updateInterval: number | undefined
    let removeUpdateListeners: (() => void) | undefined

    const handleControllerChange = () => {
      if (reloadRequested) window.location.reload()
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    )

    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        if (disposed) return

        const promptForUpdate = (waitingWorker = registration.waiting) => {
          if (!waitingWorker || !navigator.serviceWorker.controller) return

          toast(
            (toastInstance) => (
              <div className="flex items-center gap-3">
                <span className="text-sm">A new version is available.</span>
                <button
                  onClick={() => {
                    reloadRequested = true
                    toast.dismiss(toastInstance.id)
                    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
                  }}
                  className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium"
                >
                  Reload
                </button>
              </div>
            ),
            { id: TOAST_ID, duration: Infinity }
          )
        }

        const handleUpdateFound = () => {
          const installingWorker = registration.installing
          if (!installingWorker) return
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              promptForUpdate(installingWorker)
            }
          })
        }

        const checkForUpdate = () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            void registration.update().catch(() => undefined)
          }
        }

        promptForUpdate()
        registration.addEventListener('updatefound', handleUpdateFound)
        document.addEventListener('visibilitychange', checkForUpdate)
        window.addEventListener('online', checkForUpdate)
        updateInterval = window.setInterval(checkForUpdate, 60 * 60 * 1000)
        removeUpdateListeners = () => {
          registration.removeEventListener('updatefound', handleUpdateFound)
          document.removeEventListener('visibilitychange', checkForUpdate)
          window.removeEventListener('online', checkForUpdate)
        }
      })
      .catch(() => {
        // The app remains usable online if service worker registration fails.
      })

    return () => {
      disposed = true
      if (updateInterval !== undefined) window.clearInterval(updateInterval)
      removeUpdateListeners?.()
      toast.dismiss(TOAST_ID)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      )
    }
  }, [])

  return null
}
