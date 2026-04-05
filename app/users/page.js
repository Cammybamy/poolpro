'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/profile'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Users() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'technician' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const p = await getProfile()
    if (!p || (p.role !== 'owner' && p.role !== 'manager')) {
      router.push('/')
      return
    }
    setProfile(p)
    fetchUsers(p.company_id)
  }

  async function fetchUsers(company_id) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', company_id)
      .order('full_name')
    setUsers(data || [])
  }

  async function sendInvite() {
    if (!form.email || !form.full_name) {
      setMessage('Name and email are required')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          company_id: profile.company_id
        })
      })
      const result = await res.json()
      if (result.error) {
        setMessage('Error: ' + result.error)
      } else {
        setMessage(`Invite sent to ${form.email}! They'll receive an email to set up their account.`)
        setForm({ email: '', full_name: '', role: 'technician' })
        setShowForm(false)
        fetchUsers(profile.company_id)
      }
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
    setLoading(false)
  }

  async function updateRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers(profile.company_id)
  }

  async function removeUser(userId) {
    if (!confirm('Remove this user? This will fully delete their account so they can be re-invited later.')) return
    await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: userId })
    })
    fetchUsers(profile.company_id)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
        <Link href="/" className="text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">Manage Team</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {message && (
          <div className={`rounded-xl p-3 mb-4 text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-4"
        >
          + Invite Team Member
        </button>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
            <input
              className="w-full border rounded-lg p-2 text-gray-800 bg-white"
              placeholder="Full Name *"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
            />
            <input
              className="w-full border rounded-lg p-2 text-gray-800 bg-white"
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <select
              className="w-full border rounded-lg p-2 text-gray-800 bg-white"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
            >
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
            <p className="text-xs text-gray-400">They'll receive an email invite to set up their own password.</p>
            <button
              onClick={sendInvite}
              disabled={loading}
              className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending invite...' : 'Send Invite'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold text-gray-800">{u.full_name}</div>
                <div className="text-gray-500 text-sm">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-lg p-1 text-sm text-gray-800 bg-white"
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value)}
                >
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
                {u.id !== profile?.id && (
                  <button
                    onClick={() => removeUser(u.id)}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
