import { useCallback, useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { addMember, deactivateMember, getMembers } from '../api/logsApi'
import { notifyAllMembers, notifyMember } from '../api/pushApi'
import { StatusMessage } from '../components/StatusMessage'
import type { Member } from '../types/log'

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'The Excel file is open or in use by another process. Close it and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function AdminUsersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingName, setRemovingName] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null)

  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)

  const [notifyTarget, setNotifyTarget] = useState<string | null>(null)
  const [notifyMessageText, setNotifyMessageText] = useState('')
  const [notifySending, setNotifySending] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setMembers(await getMembers())
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return

    setAdding(true)
    setMessage(null)
    try {
      await addMember(trimmed)
      setNewName('')
      setMessage({ tone: 'success', text: `"${trimmed}" was added.` })
      await refresh()
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(memberName: string) {
    if (!window.confirm(`Remove "${memberName}"?`)) {
      return
    }

    setRemovingName(memberName)
    setMessage(null)
    try {
      await deactivateMember(memberName)
      setMessage({ tone: 'success', text: `"${memberName}" was removed.` })
      await refresh()
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setRemovingName(null)
    }
  }

  async function handleBroadcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = broadcastMessage.trim()
    if (!trimmed) return

    setBroadcastSending(true)
    setMessage(null)
    try {
      const result = await notifyAllMembers(trimmed)
      setBroadcastMessage('')
      setMessage(
        result.sentCount > 0
          ? { tone: 'success', text: `Notification sent to ${result.sentCount} device(s).` }
          : { tone: 'error', text: 'No devices have notifications enabled yet.' },
      )
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setBroadcastSending(false)
    }
  }

  function openNotifyModal(memberName: string) {
    setNotifyTarget(memberName)
    setNotifyMessageText('')
  }

  function closeNotifyModal() {
    setNotifyTarget(null)
    setNotifyMessageText('')
  }

  async function handleNotifyMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!notifyTarget) return
    const trimmed = notifyMessageText.trim()
    if (!trimmed) return

    setNotifySending(true)
    try {
      const result = await notifyMember(notifyTarget, trimmed)
      setMessage(
        result.sentCount > 0
          ? { tone: 'success', text: `Notification sent to ${notifyTarget}.` }
          : { tone: 'error', text: `${notifyTarget} has no notifications enabled.` },
      )
      closeNotifyModal()
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setNotifySending(false)
    }
  }

  return (
    <>
      <section className="intro">
        <div>
          <h1>User Management</h1>
        </div>
      </section>

      {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

      <div className="workspace-grid admin-workspace-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>Add user</h2>
            </div>
          </div>

          <form onSubmit={handleAdd} className="admin-add-form">
            <label>
              Full name
              <input
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Jane Doe"
                required
              />
            </label>
            <button type="submit" disabled={adding || !newName.trim()}>
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
        </section>

        <section className="panel form-panel broadcast-panel">
          <div className="panel-heading">
            <div>
              <h2>Send notification</h2>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="admin-add-form">
            <label>
              Message
              <textarea
                value={broadcastMessage}
                onChange={(event) => setBroadcastMessage(event.target.value)}
                placeholder="Message to send to all users"
                rows={3}
                required
              />
            </label>
            <button type="submit" disabled={broadcastSending || !broadcastMessage.trim()}>
              {broadcastSending ? 'Sending…' : 'Send to all users'}
            </button>
          </form>
        </section>

        <section className="panel side-panel">
          <div className="panel-heading">
            <div>
              <h2>Active users</h2>
            </div>
            <span className="count-badge">{members.length}</span>
          </div>

          {loading && <p className="empty-state">Loading…</p>}

          {!loading && members.length === 0 && <p className="empty-state">No active users found.</p>}

          {!loading && members.length > 0 && (
            <ul className="admin-member-list">
              {members.map((member) => (
                <li key={member.name} className="admin-member-row">
                  <span>{member.name}</span>
                  <div className="admin-member-actions">
                    <button type="button" className="admin-notify-button" onClick={() => openNotifyModal(member.name)}>
                      Notify
                    </button>
                    <button
                      type="button"
                      className="admin-remove-button"
                      onClick={() => handleRemove(member.name)}
                      disabled={removingName === member.name}
                    >
                      {removingName === member.name ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {notifyTarget && (
        <div className="modal-overlay" onClick={closeNotifyModal}>
          <div className="panel notify-member-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">SEND NOTIFICATION</p>
            <h2>{notifyTarget}</h2>

            <form onSubmit={handleNotifyMember} className="admin-add-form">
              <label>
                Message
                <textarea
                  value={notifyMessageText}
                  onChange={(event) => setNotifyMessageText(event.target.value)}
                  placeholder={`Message to send to ${notifyTarget}`}
                  rows={3}
                  autoFocus
                  required
                />
              </label>
              <div className="reminder-actions">
                <button type="button" onClick={closeNotifyModal}>
                  Cancel
                </button>
                <button type="submit" disabled={notifySending || !notifyMessageText.trim()}>
                  {notifySending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
