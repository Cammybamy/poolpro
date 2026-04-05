'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/profile'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [companies, setCompanies] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [companyForm, setCompanyForm] = useState({ company_name: '', owner_email: '', owner_name: '' })
  const [companyMsg, setCompanyMsg] = useState('')
  const [companyLoading, setCompanyLoading] = useState(false)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const p = await getProfile()
    if (!p || !p.super_admin) {
      router.push('/')
      return
    }
    setProfile(p)
    fetchAll()
  }

  async function fetchAll() {
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .order('name')

    const { data: usersData } = await supabase
      .from('profiles')
      .select('*, companies(name)')
      .order('full_name')

    setCompanies(companiesData || [])
    setAllUsers(usersData || [])
  }

  async function createCompany() {
    const { company_name, owner_email, owner_name } = companyForm
    if (!company_name || !owner_email || !owner_name) {
      setCompanyMsg('All fields are required')
      return
    }
    setCompanyLoading(true)
    setCompanyMsg('')
    try {
      const res = await fetch('/api/create-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm)
      })
      const result = await res.json()
      if (result.error) {
        setCompanyMsg('Error: ' + result.error)
      } else {
        setCompanyMsg(`Company created! Invite sent to ${owner_email}`)
        setCompanyForm({ company_name: '', owner_email: '', owner_name: '' })
        setShowNewCompany(false)
        fetchAll()
      }
    } catch (e) {
      setCompanyMsg('Error: ' + e.message)
    }
    setCompanyLoading(false)
  }

  async function updateUserRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchAll()
  }

  async function deleteUser(userId, authId) {
    if (!confirm('Remove this user? This cannot be undone.')) return
    await supabase.from('profiles').delete().eq('id', userId)
    // Auth user deletion requires service role — handled server-side if needed
    fetchAll()
  }

  const companyUsers = selectedCompany
    ? allUsers.filter(u => u.company_id === selectedCompany)
    : []

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-900 text-white p-4 flex items-center gap-3">
        <Link href="/" className="text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">Super Admin Panel</h1>
        <span className="ml-auto text-xs bg-yellow-400 text-gray-900 px-2 py-1 rounded-full font-bold">ADMIN</span>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <div className="text-3xl font-bold text-blue-600">{companies.length}</div>
            <div className="text-gray-500 text-sm mt-1">Companies</div>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <div className="text-3xl font-bold text-green-600">{allUsers.length}</div>
            <div className="text-gray-500 text-sm mt-1">Total Users</div>
          </div>
        </div>

        {/* Create Company */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Companies</h2>
            <button
              onClick={() => setShowNewCompany(!showNewCompany)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
            >
              + New Company
            </button>
          </div>

          {companyMsg && (
            <div className={`rounded-xl p-3 mb-4 text-sm ${companyMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {companyMsg}
            </div>
          )}

          {showNewCompany && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <input
                className="w-full border rounded-xl p-3 text-gray-800 bg-white"
                placeholder="Company Name *"
                value={companyForm.company_name}
                onChange={e => setCompanyForm({ ...companyForm, company_name: e.target.value })}
              />
              <input
                className="w-full border rounded-xl p-3 text-gray-800 bg-white"
                placeholder="Owner Full Name *"
                value={companyForm.owner_name}
                onChange={e => setCompanyForm({ ...companyForm, owner_name: e.target.value })}
              />
              <input
                className="w-full border rounded-xl p-3 text-gray-800 bg-white"
                placeholder="Owner Email *"
                type="email"
                value={companyForm.owner_email}
                onChange={e => setCompanyForm({ ...companyForm, owner_email: e.target.value })}
              />
              <button
                onClick={createCompany}
                disabled={companyLoading}
                className="w-full bg-green-500 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
              >
                {companyLoading ? 'Creating...' : 'Create & Send Invite'}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {companies.map(c => {
              const memberCount = allUsers.filter(u => u.company_id === c.id).length
              return (
                <div
                  key={c.id}
                  className={`border rounded-xl p-4 cursor-pointer transition-colors ${selectedCompany === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedCompany(selectedCompany === c.id ? null : c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
                    </div>
                    <span className="text-gray-400 text-sm">{selectedCompany === c.id ? '▲' : '▼'}</span>
                  </div>

                  {selectedCompany === c.id && (
                    <div className="mt-4 space-y-2" onClick={e => e.stopPropagation()}>
                      <CompanyUserManager
                        companyId={c.id}
                        users={companyUsers}
                        onRoleChange={updateUserRole}
                        onDelete={deleteUser}
                        onRefresh={fetchAll}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyUserManager({ companyId, users, onRoleChange, onDelete, onRefresh }) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'technician' })
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  async function sendInvite() {
    if (!inviteForm.email || !inviteForm.full_name) {
      setInviteMsg('Name and email are required')
      return
    }
    setInviteLoading(true)
    setInviteMsg('')
    try {
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inviteForm, company_id: companyId })
      })
      const result = await res.json()
      if (result.error) {
        setInviteMsg('Error: ' + result.error)
      } else {
        setInviteMsg(`Invite sent to ${inviteForm.email}`)
        setInviteForm({ email: '', full_name: '', role: 'technician' })
        setShowInvite(false)
        onRefresh()
      }
    } catch (e) {
      setInviteMsg('Error: ' + e.message)
    }
    setInviteLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Team Members</span>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg"
        >
          + Invite
        </button>
      </div>

      {inviteMsg && (
        <div className={`rounded-lg p-2 mb-2 text-xs ${inviteMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {inviteMsg}
        </div>
      )}

      {showInvite && (
        <div className="bg-white border rounded-xl p-3 mb-3 space-y-2">
          <input
            className="w-full border rounded-lg p-2 text-sm text-gray-800 bg-white"
            placeholder="Full Name *"
            value={inviteForm.full_name}
            onChange={e => setInviteForm({ ...inviteForm, full_name: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm text-gray-800 bg-white"
            placeholder="Email *"
            type="email"
            value={inviteForm.email}
            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
          />
          <select
            className="w-full border rounded-lg p-2 text-sm text-gray-800 bg-white"
            value={inviteForm.role}
            onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
          >
            <option value="technician">Technician</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
          <button
            onClick={sendInvite}
            disabled={inviteLoading}
            className="w-full bg-green-500 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-2">No members yet</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800 text-sm">{u.full_name}</div>
                <div className="text-gray-400 text-xs">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-lg p-1 text-xs text-gray-800 bg-white"
                  value={u.role}
                  onChange={e => onRoleChange(u.id, e.target.value)}
                >
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  onClick={() => onDelete(u.id)}
                  className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
