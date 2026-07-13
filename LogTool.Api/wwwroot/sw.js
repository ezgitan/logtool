self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'LogTool'
  const body = data.body || "Don't forget to submit today's work log."

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    }),
  )
})

self.addEventListener('fetch', () => {
  // No offline support needed; an empty handler is required by some
  // browsers before they allow installing LogTool as an app.
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    }),
  )
})
