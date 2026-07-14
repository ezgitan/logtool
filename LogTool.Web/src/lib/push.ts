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
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

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
