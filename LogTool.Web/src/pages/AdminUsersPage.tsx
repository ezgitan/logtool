import { useCallback, useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { addMember, deactivateMember, getMembers } from '../api/logsApi'
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

  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>User Management</h1>
        </div>
      </section>

      {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

      <div className="workspace-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">NEW USER</p>
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

        <section className="panel side-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TEAM</p>
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
                  <button
                    type="button"
                    className="admin-remove-button"
                    onClick={() => handleRemove(member.name)}
                    disabled={removingName === member.name}
                  >
                    {removingName === member.name ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
