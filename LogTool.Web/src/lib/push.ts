import { getPushPublicKey, registerPushSubscription } from '../api/pushApi'

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/**
 * PushManager.subscribe() can transiently throw "AbortError: Registration
 * failed - push service error" when hit with back-to-back subscribe calls
 * (e.g. unsubscribe immediately followed by a fresh subscribe, or someone
 * changing their reminder time again right after their first setup) - the
 * browser's push service (FCM etc.) briefly rate-limits itself. Retrying
 * after a short pause resolves it without the person having to notice.
 */
async function subscribeWithRetry(
  pushManager: PushManager,
  options: PushSubscriptionOptionsInit,
  attempts = 3,
): Promise<PushSubscription> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await pushManager.subscribe(options)
    } catch (error) {
      lastError = error
      console.error(`Push subscribe attempt ${attempt}/${attempts} failed`, error)
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 700 * attempt))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!isPushSupported()) return null
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('This browser does not support notifications.')
  }
  return withTimeout(
    Notification.requestPermission(),
    20000,
    'No response to the notification permission prompt. Check your address bar for a permission ' +
      'icon (often a bell or lock) and allow it, then try again.',
  )
}

export async function setupReminderPush(memberName: string, hour: number, minute: number) {
  if (!isPushSupported()) {
    throw new Error('This browser does not support notifications.')
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const registration = await navigator.serviceWorker.register('/sw.js')
  await withTimeout(
    navigator.serviceWorker.ready,
    20000,
    'Timed out waiting for the notification service to start. Try reloading the page.',
  )

  const { publicKey } = await getPushPublicKey()

  // Always drop any existing subscription and create a fresh one, rather
  // than reusing whatever's cached. Reusing a stale subscription (e.g. one
  // bound to a VAPID key the server no longer has, after Data\ got
  // regenerated) silently fails - re-subscribing against the server's
  // *current* key is the only way to guarantee this actually works.
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    await existing.unsubscribe()
  }
  const subscription = await subscribeWithRetry(registration.pushManager, {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const subscriptionJson = subscription.toJSON()
  if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
    throw new Error('Could not create a notification subscription.')
  }

  await registerPushSubscription({
    memberName,
    subscription: {
      endpoint: subscriptionJson.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      },
    },
    reminderHour: hour,
    reminderMinute: minute,
  })
}
