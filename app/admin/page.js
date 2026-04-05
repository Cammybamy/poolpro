'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/profile'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Top-level Admin Shell ────────────────────────────────────────────────────
export default function AdminPanel() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({ companies: 0, users: 0, jobs: 0, leads: 0 })

  useEffect(() => { init() }, [])

  async function init() {
    const p = await getProfile()
    if (!p?.super_admin) { router.push('/'); return }
    setProfile(p)
    fetchStats()
  }

  async function fetchStats() {
    const [c, u, j, l] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
    ])
    setStats({ companies: c.count || 0, users: u.count || 0, jobs: j.count || 0, leads: l.count || 0 })
  }

  if (!profile) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-lg">Pool Pilot</span>
            <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {['overview', 'companies', 'leads'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden md:block">{profile.full_name}</span>
          <button
            onClick={() => { sessionStorage.setItem('adminPreview', 'true'); router.push('/') }}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition border border-gray-700"
          >
            👁 Preview App
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'overview' && <OverviewTab stats={stats} onNavigate={setTab} />}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'leads' && <LeadsTab />}
      </div>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({ stats, onNavigate }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">System Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Companies', value: stats.companies, color: 'text-blue-400', tab: 'companies' },
          { label: 'Total Users', value: stats.users, color: 'text-green-400', tab: 'companies' },
          { label: 'Total Jobs', value: stats.jobs, color: 'text-purple-400', tab: 'companies' },
          { label: 'Leads', value: stats.leads, color: 'text-yellow-400', tab: 'leads' },
        ].map(s => (
          <button key={s.label} onClick={() => onNavigate(s.tab)}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left hover:border-gray-700 transition">
            <div className={`text-4xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-sm mt-1">{s.label}</div>
          </button>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-300 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => onNavigate('companies')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-sm font-semibold transition">
            + Create New Company
          </button>
          <button onClick={() => onNavigate('leads')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl text-sm font-semibold transition">
            View Interest Form Leads
          </button>
          <button onClick={() => onNavigate('companies')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl text-sm font-semibold transition">
            Browse All Companies
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Companies Tab ─────────────────────────────────────────────────────────────
function CompaniesTab() {
  const [companies, setCompanies] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ company_name: '', owner_name: '', owner_email: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('companies').select('*').order('name')
    setCompanies(data || [])
  }

  async function createCompany() {
    if (!form.company_name || !form.owner_name || !form.owner_email) { setMsg('All fields required'); return }
    setLoading(true); setMsg('')
    const res = await window.fetch('/api/create-company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const result = await res.json()
    if (result.error) { setMsg('Error: ' + result.error) }
    else { setMsg('Company created and invite sent!'); setForm({ company_name: '', owner_name: '', owner_email: '' }); setShowNew(false); fetch() }
    setLoading(false)
  }

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  if (selected) return <CompanyDetail companyId={selected} onBack={() => { setSelected(null); fetch() }} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Companies ({companies.length})</h2>
        <button onClick={() => setShowNew(!showNew)}
          className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-yellow-300 transition">
          + New Company
        </button>
      </div>

      {msg && <div className={`rounded-xl p-3 mb-4 text-sm ${msg.startsWith('Error') ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{msg}</div>}

      {showNew && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 space-y-3">
          <h3 className="font-semibold text-gray-300">Create Company + Invite Owner</h3>
          <input className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
            placeholder="Company Name *" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              placeholder="Owner Full Name *" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
            <input className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              placeholder="Owner Email *" type="email" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} />
          </div>
          <button onClick={createCompany} disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-semibold transition disabled:opacity-50">
            {loading ? 'Creating...' : 'Create & Send Invite'}
          </button>
        </div>
      )}

      <input className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-gray-600"
        placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="space-y-3">
        {filtered.map(c => (
          <CompanyCard key={c.id} company={c} onOpen={() => setSelected(c.id)} />
        ))}
      </div>
    </div>
  )
}

function CompanyCard({ company, onOpen }) {
  const [users, setUsers] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('*').eq('company_id', company.id).then(({ data }) => setUsers(data || []))
  }, [company.id])

  const owner = users.find(u => u.role === 'owner')
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700 transition">
      <div>
        <div className="font-semibold text-white text-lg">{company.name}</div>
        <div className="text-gray-500 text-sm mt-0.5">
          {users.length} member{users.length !== 1 ? 's' : ''}
          {owner ? ` · Owner: ${owner.full_name}` : ''}
        </div>
        <div className="flex gap-2 mt-2">
          {['owner', 'manager', 'technician'].map(role => {
            const count = users.filter(u => u.role === role).length
            if (!count) return null
            return <span key={role} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full capitalize">{count} {role}{count > 1 ? 's' : ''}</span>
          })}
        </div>
      </div>
      <button onClick={onOpen} className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-yellow-300 transition">
        Manage →
      </button>
    </div>
  )
}

// ─── Company Detail ────────────────────────────────────────────────────────────
function CompanyDetail({ companyId, onBack }) {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [tab, setTab] = useState('team')
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [invoices, setInvoices] = useState([])
  const [chemLogs, setChemLogs] = useState([])

  useEffect(() => { loadAll() }, [companyId])

  async function loadAll() {
    const [co, us, cu, jo, inv, chem] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('profiles').select('*').eq('company_id', companyId).order('full_name'),
      supabase.from('customers').select('*').eq('company_id', companyId).order('name'),
      supabase.from('jobs').select('*, customers(name, address)').eq('company_id', companyId).order('scheduled_date', { ascending: false }).limit(100),
      supabase.from('invoices').select('*, customers(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
      supabase.from('chemical_logs').select('*, jobs(scheduled_date, customers(name))').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
    ])
    setCompany(co.data)
    setUsers(us.data || [])
    setCustomers(cu.data || [])
    setJobs(jo.data || [])
    setInvoices(inv.data || [])
    setChemLogs(chem.data || [])
  }

  function viewAs(user) {
    sessionStorage.setItem('adminView', JSON.stringify({
      company_id: companyId,
      company_name: company?.name,
      role: user.role,
      user_name: user.full_name,
      user_id: user.id
    }))
    router.push('/')
  }

  if (!company) return <div className="text-gray-500 py-8 text-center">Loading...</div>

  const subTabs = ['team', 'customers', 'jobs', 'invoices', 'logs']

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">← Companies</button>
        <div>
          <h2 className="text-2xl font-bold">{company.name}</h2>
          <div className="text-gray-500 text-sm">{users.length} users · {customers.length} customers · {jobs.length} jobs</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {subTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}>
            {t === 'logs' ? 'Chem Logs' : t}
            <span className={`ml-1.5 text-xs ${tab === t ? 'text-gray-700' : 'text-gray-600'}`}>
              {t === 'team' ? users.length : t === 'customers' ? customers.length : t === 'jobs' ? jobs.length : t === 'invoices' ? invoices.length : chemLogs.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'team' && <TeamTab users={users} companyId={companyId} onViewAs={viewAs} onRefresh={loadAll} />}
      {tab === 'customers' && <CustomersTab customers={customers} companyId={companyId} onRefresh={loadAll} />}
      {tab === 'jobs' && <JobsTab jobs={jobs} customers={customers} users={users} companyId={companyId} onRefresh={loadAll} />}
      {tab === 'invoices' && <InvoicesTab invoices={invoices} />}
      {tab === 'logs' && <ChemLogsTab logs={chemLogs} />}
    </div>
  )
}

// ─── Team Sub-tab ─────────────────────────────────────────────────────────────
function TeamTab({ users, companyId, onViewAs, onRefresh }) {
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'technician' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendInvite() {
    if (!form.email || !form.full_name) { setMsg('Name and email required'); return }
    setLoading(true); setMsg('')
    const res = await fetch('/api/invite-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, company_id: companyId }) })
    const result = await res.json()
    if (result.error) setMsg('Error: ' + result.error)
    else { setMsg('Invite sent!'); setForm({ email: '', full_name: '', role: 'technician' }); setShowInvite(false); onRefresh() }
    setLoading(false)
  }

  async function changeRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    onRefresh()
  }

  async function removeUser(id) {
    if (!confirm('Remove this user?')) return
    await supabase.from('profiles').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">{users.length} team member{users.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowInvite(!showInvite)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          + Invite Member
        </button>
      </div>

      {msg && <div className={`rounded-xl p-3 mb-4 text-sm ${msg.startsWith('Error') ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{msg}</div>}

      {showInvite && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Full Name *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            <input className="bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <select className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
            <button onClick={sendInvite} disabled={loading} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition">
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{u.full_name}</div>
                <div className="text-gray-500 text-sm">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <select className="bg-gray-800 border border-gray-700 rounded-lg p-1.5 text-sm text-white focus:outline-none"
                  value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
                <button onClick={() => onViewAs(u)}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                  View As
                </button>
                <button onClick={() => removeUser(u.id)}
                  className="text-red-500 hover:text-red-400 hover:bg-red-950 px-2 py-1.5 rounded-lg text-xs transition">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Customers Sub-tab ─────────────────────────────────────────────────────────
function CustomersTab({ customers, companyId, onRefresh }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  function startEdit(c) {
    setEditing(c.id)
    setForm({ name: c.name, address: c.address || '', phone: c.phone || '', email: c.email || '', monthly_rate: c.monthly_rate || '', service_frequency: c.service_frequency || 'none', pool_type: c.pool_type || '', pool_size_gallons: c.pool_size_gallons || '', notes: c.notes || '' })
  }

  async function saveEdit(id) {
    setSaving(true)
    await supabase.from('customers').update({
      ...form,
      monthly_rate: form.monthly_rate === '' ? null : parseFloat(form.monthly_rate),
      pool_size_gallons: form.pool_size_gallons === '' ? null : parseFloat(form.pool_size_gallons),
    }).eq('id', id)
    setEditing(null)
    setSaving(false)
    onRefresh()
  }

  async function deleteCustomer(id) {
    if (!confirm('Delete this customer? This cannot be undone.')) return
    await supabase.from('customers').delete().eq('id', id)
    onRefresh()
  }

  const filtered = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.address?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400 text-sm">{customers.length} customers</span>
      </div>
      <input className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-gray-600 text-sm"
        placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {editing === c.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  <input className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                <div className="grid grid-cols-3 gap-3">
                  <input className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Monthly Rate" type="number" value={form.monthly_rate} onChange={e => setForm({ ...form, monthly_rate: e.target.value })} />
                  <input className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Pool Gallons" type="number" value={form.pool_size_gallons} onChange={e => setForm({ ...form, pool_size_gallons: e.target.value })} />
                  <select className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none"
                    value={form.service_frequency} onChange={e => setForm({ ...form, service_frequency: e.target.value })}>
                    <option value="none">No schedule</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(c.id)} disabled={saving} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(null)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white">{c.name}</div>
                  <div className="text-gray-500 text-sm">{c.address}</div>
                  <div className="flex gap-3 mt-1.5 text-xs text-gray-600">
                    {c.monthly_rate && <span>${c.monthly_rate}/mo</span>}
                    {c.pool_size_gallons && <span>{c.pool_size_gallons.toLocaleString()} gal</span>}
                    {c.service_frequency && c.service_frequency !== 'none' && <span className="capitalize">{c.service_frequency}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-950 px-3 py-1.5 rounded-lg text-xs transition">Edit</button>
                  <button onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-lg text-xs transition">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Jobs Sub-tab ──────────────────────────────────────────────────────────────
function JobsTab({ jobs, customers, users, companyId, onRefresh }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const techs = users.filter(u => u.role === 'technician' || u.role === 'manager')

  function startEdit(j) {
    setEditing(j.id)
    setForm({ scheduled_date: j.scheduled_date || '', technician: j.technician || '', status: j.status || 'pending', notes: j.notes || '' })
  }

  async function saveJob(id) {
    await supabase.from('jobs').update(form).eq('id', id)
    setEditing(null)
    onRefresh()
  }

  async function deleteJob(id) {
    if (!confirm('Delete this job?')) return
    await supabase.from('jobs').delete().eq('id', id)
    onRefresh()
  }

  const filtered = jobs
    .filter(j => filter === 'all' || j.status === filter)
    .filter(j => {
      const name = j.customers?.name?.toLowerCase() || ''
      const tech = j.technician?.toLowerCase() || ''
      const q = search.toLowerCase()
      return name.includes(q) || tech.includes(q)
    })

  const statusColors = { pending: 'bg-yellow-900 text-yellow-300', complete: 'bg-green-900 text-green-300', cancelled: 'bg-red-900 text-red-300' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-gray-400 text-sm">{jobs.length} jobs</span>
        <div className="flex gap-1">
          {['all', 'pending', 'complete'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${filter === f ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <input className="flex-1 min-w-48 bg-gray-900 border border-gray-800 rounded-xl p-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gray-600"
          placeholder="Search by customer or tech..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map(j => (
          <div key={j.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {editing === j.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none"
                    value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
                  <select className="bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none"
                    value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })}>
                    <option value="">Unassigned</option>
                    {techs.map(t => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                  </select>
                </div>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none"
                  value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pending">Pending</option>
                  <option value="complete">Complete</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:outline-none resize-none"
                  placeholder="Notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={() => saveJob(j.id)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">Save</button>
                  <button onClick={() => setEditing(null)} className="bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm transition">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white">{j.customers?.name || 'Unknown'}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{j.customers?.address}</div>
                  <div className="flex gap-2 mt-1.5 items-center">
                    <span className="text-xs text-gray-500">{j.scheduled_date}</span>
                    {j.technician && <span className="text-xs text-gray-500">· {j.technician}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[j.status] || 'bg-gray-800 text-gray-400'}`}>{j.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(j)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-950 px-3 py-1.5 rounded-lg text-xs transition">Edit</button>
                  <button onClick={() => deleteJob(j.id)} className="text-red-500 hover:text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-lg text-xs transition">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-gray-600 text-sm text-center py-8">No jobs found</div>}
      </div>
    </div>
  )
}

// ─── Invoices Sub-tab ──────────────────────────────────────────────────────────
function InvoicesTab({ invoices }) {
  const total = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const unpaid = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const statusColors = { unpaid: 'bg-red-900 text-red-300', paid: 'bg-green-900 text-green-300', overdue: 'bg-orange-900 text-orange-300' }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{invoices.length}</div>
          <div className="text-gray-500 text-xs mt-1">Total Invoices</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">${total.toFixed(2)}</div>
          <div className="text-gray-500 text-xs mt-1">Total Billed</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">${unpaid.toFixed(2)}</div>
          <div className="text-gray-500 text-xs mt-1">Outstanding</div>
        </div>
      </div>
      <div className="space-y-2">
        {invoices.map(inv => (
          <div key={inv.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-white">{inv.customers?.name || 'Unknown'}</div>
              <div className="text-gray-500 text-xs mt-0.5">{inv.created_at?.split('T')[0]} · #{inv.id.slice(0, 8)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">${parseFloat(inv.amount || 0).toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inv.status] || 'bg-gray-800 text-gray-400'}`}>{inv.status}</span>
            </div>
          </div>
        ))}
        {invoices.length === 0 && <div className="text-gray-600 text-sm text-center py-8">No invoices</div>}
      </div>
    </div>
  )
}

// ─── Chemical Logs Sub-tab ────────────────────────────────────────────────────
function ChemLogsTab({ logs }) {
  return (
    <div>
      <div className="text-gray-400 text-sm mb-4">{logs.length} recent logs</div>
      <div className="space-y-3">
        {logs.map(log => (
          <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-medium text-white">{log.jobs?.customers?.name || 'Unknown'}</div>
                <div className="text-gray-500 text-xs">{log.created_at?.split('T')[0]} · Job: {log.jobs?.scheduled_date}</div>
              </div>
            </div>
            {log.readings && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(log.readings).filter(([, v]) => v !== '' && v != null).map(([k, v]) => (
                  <div key={k} className="bg-gray-800 rounded-lg p-2 text-center">
                    <div className="text-white text-sm font-semibold">{v}</div>
                    <div className="text-gray-500 text-xs">{k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && <div className="text-gray-600 text-sm text-center py-8">No chemical logs</div>}
      </div>
    </div>
  )
}

// ─── Leads Tab ────────────────────────────────────────────────────────────────
function LeadsTab() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('leads').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setLeads(data || [])
      setLoading(false)
    })
  }, [])

  async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(leads.filter(l => l.id !== id))
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Interest Form Leads ({leads.length})</h2>
      {leads.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">No leads yet</div>
      ) : (
        <div className="space-y-3">
          {leads.map(l => (
            <div key={l.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white text-lg">{l.name}</div>
                  <div className="text-blue-400 text-sm">{l.email}</div>
                  <div className="flex gap-4 mt-2 text-gray-500 text-sm flex-wrap">
                    {l.company && <span>🏢 {l.company}</span>}
                    {l.phone && <span>📞 {l.phone}</span>}
                    {l.pools_count && <span>🏊 {l.pools_count} pools</span>}
                    <span>📅 {l.created_at?.split('T')[0]}</span>
                  </div>
                </div>
                <button onClick={() => deleteLead(l.id)} className="text-red-500 hover:text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-lg text-xs transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
