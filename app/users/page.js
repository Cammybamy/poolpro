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
    const [form, setForm] = useState({ email: '', full_name: '', role: 'technician', password: '' })
    const [message, setMessage] = useState('')

    useEffect(() => {
      loadProfile()
    }, [])

    async function loadProfile() {
      const p = await getProfile()
      if (!p || p.role !== 'owner') {
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

    async function addUser() {
      if (!form.email || !form.password || !form.full_name) {
        setMessage('Name, email and password are required')
        return
      }

      try {
        setMessage('Creating user...')
        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            role: form.role,
            company_id: profile.company_id
          })
        })

        const result = await res.json()

        if (result.error) {
          setMessage('Error: ' + result.error)
          return
        }

        setMessage('User added successfully!')
        setForm({ email: '', full_name: '', role: 'technician', password: '' })
        setShowForm(false)
        fetchUsers(profile.company_id)
      } catch (e) {
        setMessage('Error: ' + e.message)
      }
    }

    async function updateRole(userId, newRole) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      fetchUsers(profile.company_id)
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Manage Users</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          {message && (
            <div className="bg-green-50 text-green-700 rounded-xl p-3 mb-4 text-sm">{message}</div>
          )}

          <button onClick={() => setShowForm(!showForm)} className="w-full bg-blue-600 text-white py-3 rounded-xl
  font-semibold mb-4">
            + Add User
          </button>

          {showForm && (
            <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Full Name *" 
  value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Email *" type="email" 
  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Temporary Password *" 
  type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.role} onChange={e =>
  setForm({...form, role: e.target.value})}>
                <option value="technician">Technician</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
              <button onClick={addUser} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save
  User</button>
            </div>
          )}

          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-800">{u.full_name}</div>
                  <div className="text-gray-500 text-sm">{u.email}</div>
                </div>
                <select
                  className="border rounded-lg p-1 text-sm text-gray-800 bg-white"
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value)}
                >
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }