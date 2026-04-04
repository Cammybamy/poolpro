'use client'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/profile'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'

const RouteMap = dynamic(() => import('./components/RouteMap'), { ssr: false })
import AddressInput from './components/AddressInput'

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Dashboard
  const [stats, setStats] = useState({ customers: 0, todayJobs: 0, unpaidInvoices: 0, pendingJobs: 0 })
  const [todayJobs, setTodayJobs] = useState([])
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])

  // Customers
  const [customers, setCustomers] = useState([])
  const [customerForm, setCustomerForm] = useState({ name: '', address: '', phone: '', email: '', notes: '', service_frequency: 'none', monthly_rate: '', pool_size_gallons: '', pool_type: '', filter_type: '', equipment_brand: '', equipment_notes: '' })
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [newCustomerPhotos, setNewCustomerPhotos] = useState([])
  const [newCustomerUploading, setNewCustomerUploading] = useState(false)
  const newCustomerFileRef = useRef()

  // Jobs
  const [jobs, setJobs] = useState([])
  const [jobForm, setJobForm] = useState({ customer_id: '', scheduled_date: '', technician: '', notes: '', status: 'pending' })
  const [showJobForm, setShowJobForm] = useState(false)
  const [technicians, setTechnicians] = useState([])

  // Route
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0])
  const [routeJobs, setRouteJobs] = useState([])
  const [optimizing, setOptimizing] = useState(false)

  // Revenue forecast
  const [forecast, setForecast] = useState(0)

  // Chemicals
  const [chemLogs, setChemLogs] = useState([])

  // Invoices
  const [invoices, setInvoices] = useState([])

  // Reports
  const [reportCustomers, setReportCustomers] = useState([])
  const [selectedReportCustomer, setSelectedReportCustomer] = useState('')
  const [reportLogs, setReportLogs] = useState([])

  // Tech
  const [techTab, setTechTab] = useState('jobs')
  const [techTodayJobs, setTechTodayJobs] = useState([])
  const [techUpcomingJobs, setTechUpcomingJobs] = useState([])
  const [techRouteDate, setTechRouteDate] = useState(new Date().toISOString().split('T')[0])
  const [techRouteJobs, setTechRouteJobs] = useState([])

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (!profile) return
    if (activeTab === 'dashboard') fetchDashboard()
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'jobs') { fetchJobs(); fetchCustomers(); fetchTechnicians() }
    if (activeTab === 'route') fetchRouteJobs(routeDate)
    if (activeTab === 'chemicals') fetchChemicals()
    if (activeTab === 'invoices') fetchInvoices()
    if (activeTab === 'reports') fetchReportCustomers()
  }, [activeTab, profile])

  useEffect(() => {
    if (activeTab === 'route') fetchRouteJobs(routeDate)
  }, [routeDate])

  async function loadProfile() {
    const p = await getProfile()
    setProfile(p)
    if (p?.role === 'technician') {
      fetchTechJobs(p.full_name)
      fetchTechRoute(p.full_name, new Date().toISOString().split('T')[0])
    }
  }

  async function fetchTechJobs(name) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('jobs')
      .select('*, customers(name, address, phone)')
      .eq('technician', name)
      .neq('status', 'complete')
      .order('scheduled_date', { ascending: true })
    const todayList = (data || []).filter(j => j.scheduled_date === today)
    const upcoming = (data || []).filter(j => j.scheduled_date > today)
    setTechTodayJobs(todayList)
    setTechUpcomingJobs(upcoming)
  }

  async function fetchTechRoute(name, date) {
    const { data } = await supabase
      .from('jobs')
      .select('*, customers(name, address, phone)')
      .eq('technician', name)
      .eq('scheduled_date', date)
      .order('route_order', { ascending: true })
    setTechRouteJobs(data || [])
  }

  async function fetchDashboard() {
    const today = new Date().toISOString().split('T')[0]
    const [cRes, tRes, uRes, pRes, tjRes, uiRes, mrRes, fcRes] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('scheduled_date', today),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'unpaid'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs').select('*, customers(name, address)').eq('scheduled_date', today).order('route_order'),
      supabase.from('invoices').select('*, customers(name)').eq('status', 'unpaid').order('due_date').limit(5),
      supabase.from('monthly_revenue').select('*').limit(6),
      supabase.from('customers').select('monthly_rate'),
    ])
    setStats({ customers: cRes.count || 0, todayJobs: tRes.count || 0, unpaidInvoices: uRes.count || 0, pendingJobs: pRes.count || 0 })
    setTodayJobs(tjRes.data || [])
    setUnpaidInvoices(uiRes.data || [])
    setMonthlyRevenue(mrRes.data || [])
    const total = (fcRes.data || []).reduce((sum, c) => sum + (parseFloat(c.monthly_rate) || 0), 0)
    setForecast(total)
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
  }

  async function addCustomer() {
    if (!customerForm.name) return
    const { data: newCust } = await supabase.from('customers').insert([customerForm]).select().single()
    if (newCust && newCustomerPhotos.length > 0) {
      setNewCustomerUploading(true)
      const results = await Promise.all(newCustomerPhotos.map(async pending => {
        const safeName = pending.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileName = `${newCust.id}/${Date.now()}-${safeName}`
        const { error } = await supabase.storage.from('equipment-photos').upload(fileName, pending.file)
        if (error) return null
        const { data: urlData } = supabase.storage.from('equipment-photos').getPublicUrl(fileName)
        return { url: urlData.publicUrl, name: pending.name.trim() || 'Photo' }
      }))
      const entries = results.filter(Boolean)
      if (entries.length > 0) {
        await supabase.from('customers').update({ equipment_photos: entries }).eq('id', newCust.id)
      }
      setNewCustomerUploading(false)
    }
    setCustomerForm({ name: '', address: '', phone: '', email: '', notes: '', service_frequency: 'none', monthly_rate: '', pool_size_gallons: '', pool_type: '', filter_type: '', equipment_brand: '', equipment_notes: '' })
    setNewCustomerPhotos([])
    setShowCustomerForm(false)
    fetchCustomers()
  }

  async function fetchTechnicians() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician').order('full_name')
    setTechnicians(data || [])
  }

  async function fetchJobs() {
    const { data } = await supabase.from('jobs').select('*, customers(name)').order('scheduled_date', { ascending: false })
    setJobs(data || [])
  }

  async function addJob() {
    if (!jobForm.customer_id || !jobForm.scheduled_date) return
    await supabase.from('jobs').insert([jobForm])
    setJobForm({ customer_id: '', scheduled_date: '', technician: '', notes: '', status: 'pending' })
    setShowJobForm(false)
    fetchJobs()
  }

  async function fetchRouteJobs(date) {
    const { data } = await supabase.from('jobs').select('*, customers(name, address)').eq('scheduled_date', date).order('route_order')
    setRouteJobs(data || [])
  }

  async function optimizeRoute() {
    if (routeJobs.length < 2) return
    setOptimizing(true)
    try {
      const res = await fetch('/api/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: routeJobs })
      })
      const { order } = await res.json()
      const reordered = order.map(jobId => routeJobs.find(j => j.id === jobId)).filter(Boolean)
      await Promise.all(reordered.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
      setRouteJobs(reordered)
    } catch (e) {}
    setOptimizing(false)
  }

  async function moveJob(index, direction) {
    const newJobs = [...routeJobs]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newJobs.length) return
    const temp = newJobs[index]
    newJobs[index] = newJobs[swapIndex]
    newJobs[swapIndex] = temp
    await Promise.all(newJobs.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
    setRouteJobs(newJobs)
  }

  async function fetchChemicals() {
    const { data } = await supabase.from('chemical_logs').select('*, customers(name), jobs(technician), chemical_treatments(*)').order('created_at', { ascending: false })
    setChemLogs(data || [])
  }

  async function fetchReportCustomers() {
    const { data } = await supabase.from('customers').select('id, name').order('name')
    setReportCustomers(data || [])
  }

  async function fetchReportLogs(customerId) {
    const { data } = await supabase
      .from('chemical_logs')
      .select('*, chemical_treatments(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true })
    setReportLogs(data || [])
  }

  async function fetchInvoices() {
    const { data } = await supabase.from('invoices').select('*, customers(name)').order('created_at', { ascending: false })
    setInvoices(data || [])
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return <div className="p-6 text-gray-400">Loading...</div>

  const isTech = profile.role === 'technician'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (isTech) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <span className="text-blue-600 font-bold text-lg">PoolPro</span>
            <div className="text-xs text-gray-400">{profile.full_name} · Technician</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setTechTab('jobs')} className={`px-3 py-1.5 text-sm rounded-lg transition ${techTab === 'jobs' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}>My Jobs</button>
            <button onClick={() => { setTechTab('route'); fetchTechRoute(profile.full_name, techRouteDate) }} className={`px-3 py-1.5 text-sm rounded-lg transition ${techTab === 'route' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}>Route</button>
          </div>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">Sign Out</button>
        </nav>

        <div className="max-w-lg mx-auto p-4">
          {techTab === 'jobs' && (
            <div>
              <div className="mb-2">
                <p className="text-gray-400 text-sm">{today}</p>
              </div>

              <h3 className="font-semibold text-gray-700 mb-2 mt-4">Today</h3>
              {techTodayJobs.length === 0 && <p className="text-gray-400 text-sm mb-4">No jobs today</p>}
              <div className="space-y-2 mb-6">
                {techTodayJobs.map(job => (
                  <Link href={`/my-jobs/${job.id}`} key={job.id} className="block bg-white rounded-xl shadow-sm border border-blue-100 p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{job.customers?.name}</div>
                        <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                        <div className="text-gray-400 text-sm">{job.customers?.phone}</div>
                      </div>
                      <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
                    </div>
                    {job.notes && <p className="text-gray-500 text-sm mt-2 bg-blue-50 rounded-lg p-2">{job.notes}</p>}
                  </Link>
                ))}
              </div>

              <h3 className="font-semibold text-gray-700 mb-2">Upcoming</h3>
              {techUpcomingJobs.length === 0 && <p className="text-gray-400 text-sm">No upcoming jobs</p>}
              <div className="space-y-2">
                {techUpcomingJobs.map(job => (
                  <Link href={`/my-jobs/${job.id}`} key={job.id} className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{job.customers?.name}</div>
                        <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                        <div className="text-blue-400 text-xs mt-1">{new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      </div>
                      <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {techTab === 'route' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">My Route</h2>
              <input
                type="date"
                className="w-full border rounded-xl p-3 text-gray-800 bg-white shadow-sm mb-3"
                value={techRouteDate}
                onChange={e => { setTechRouteDate(e.target.value); fetchTechRoute(profile.full_name, e.target.value) }}
              />
              {techRouteJobs.length >= 2 && (
                <button onClick={async () => {
                  setOptimizing(true)
                  try {
                    const res = await fetch('/api/optimize-route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobs: techRouteJobs }) })
                    const { order } = await res.json()
                    const reordered = order.map(jobId => techRouteJobs.find(j => j.id === jobId)).filter(Boolean)
                    await Promise.all(reordered.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
                    setTechRouteJobs(reordered)
                  } catch (e) {}
                  setOptimizing(false)
                }} disabled={optimizing} className="w-full mb-4 bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm">{optimizing ? 'Optimizing route...' : 'Optimize Route with AI'}</button>
              )}
              {techRouteJobs.length === 0
                ? <p className="text-center text-gray-400 mt-8">No jobs on this day</p>
                : <RouteMap
                    jobs={techRouteJobs}
                    onReorder={async (newJobs) => {
                      setTechRouteJobs(newJobs)
                      await Promise.all(newJobs.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
                    }}
                  />
              }
            </div>
          )}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'customers', label: 'Customers' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'route', label: 'Route' },
    { id: 'chemicals', label: 'Chemicals' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'reports', label: 'Reports' },
    ...(profile.role === 'owner' ? [{ id: 'users', label: 'Users' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="text-blue-600 font-bold text-lg">PoolPro</span>
          <div className="text-xs text-gray-400">{profile.full_name} · <span className="capitalize">{profile.role}</span></div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'users' ? router.push('/users') : setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap ml-2">Sign Out</button>
      </nav>

      <div className="max-w-4xl mx-auto p-4">

        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
              <p className="text-gray-400 text-sm mt-1">{today}</p>
              <p className="text-gray-500 text-sm">{profile.companies?.name} — <span className="capitalize">{profile.role}</span></p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.todayJobs}</div>
                <div className="text-gray-500 text-xs mt-1">Jobs Today</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-3xl font-bold text-yellow-500">{stats.pendingJobs}</div>
                <div className="text-gray-500 text-xs mt-1">Pending Jobs</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{stats.customers}</div>
                <div className="text-gray-500 text-xs mt-1">Customers</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <div className="text-3xl font-bold text-red-500">{stats.unpaidInvoices}</div>
                <div className="text-gray-500 text-xs mt-1">Unpaid Invoices</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-700">Revenue — Last 6 Months</h3>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Monthly Forecast</div>
                  <div className="text-lg font-bold text-green-600">${forecast.toFixed(2)}</div>
                </div>
              </div>
              {monthlyRevenue.length === 0 && <p className="text-gray-400 text-sm">No invoice data yet</p>}
              <div className="space-y-2">
                {monthlyRevenue.map((row, i) => {
                  const month = new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  const pct = row.potential > 0 ? Math.round((row.actual / row.potential) * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{month}</span>
                        <span className="text-gray-800 font-medium">${Number(row.actual).toFixed(2)} <span className="text-gray-400 font-normal">/ ${Number(row.potential).toFixed(2)}</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-700">Today's Jobs</h3>
                  <button onClick={() => setActiveTab('jobs')} className="text-blue-600 text-xs hover:underline">View all</button>
                </div>
                {todayJobs.length === 0 && <p className="text-gray-400 text-sm">No jobs scheduled today</p>}
                <div className="space-y-2">
                  {todayJobs.map(job => (
                    <Link href={`/jobs/${job.id}`} key={job.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{job.customers?.name}</div>
                        <div className="text-xs text-gray-400">{job.customers?.address}</div>
                      </div>
                      <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-700">Unpaid Invoices</h3>
                  <button onClick={() => setActiveTab('invoices')} className="text-blue-600 text-xs hover:underline">View all</button>
                </div>
                {unpaidInvoices.length === 0 && <p className="text-gray-400 text-sm">No unpaid invoices</p>}
                <div className="space-y-2">
                  {unpaidInvoices.map(inv => (
                    <Link href={`/invoices/${inv.id}`} key={inv.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{inv.customers?.name}</div>
                        <div className="text-xs text-gray-400">Due: {inv.due_date || 'No due date'}</div>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">${inv.amount}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Customers</h2>
              <button onClick={() => setShowCustomerForm(!showCustomerForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Add Customer</button>
            </div>
            {showCustomerForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Name *" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
                <AddressInput className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Address" value={customerForm.address} onChange={val => setCustomerForm({...customerForm, address: val})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Phone" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-500 text-xs block mb-1">Monthly Rate ($)</label>
                    <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="0.00" value={customerForm.monthly_rate || ''} onChange={e => setCustomerForm({...customerForm, monthly_rate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs block mb-1">Pool Size (gallons)</label>
                    <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="e.g. 15000" value={customerForm.pool_size_gallons || ''} onChange={e => setCustomerForm({...customerForm, pool_size_gallons: e.target.value})} />
                  </div>
                </div>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.service_frequency || 'none'} onChange={e => setCustomerForm({...customerForm, service_frequency: e.target.value})}>
                  <option value="none">No recurring schedule</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.pool_type || ''} onChange={e => setCustomerForm({...customerForm, pool_type: e.target.value})}>
                  <option value="">Select pool type</option>
                  <option value="Gunite">Gunite</option>
                  <option value="Fiberglass">Fiberglass</option>
                  <option value="Vinyl">Vinyl</option>
                </select>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.filter_type || ''} onChange={e => setCustomerForm({...customerForm, filter_type: e.target.value})}>
                  <option value="">Select filter type</option>
                  <option value="DE">DE Filter</option>
                  <option value="Cartridge">Cartridge Filter</option>
                  <option value="Sand">Sand Filter</option>
                </select>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.equipment_brand || ''} onChange={e => setCustomerForm({...customerForm, equipment_brand: e.target.value})}>
                  <option value="">Select equipment brand</option>
                  <option value="Pentair">Pentair</option>
                  <option value="Jandy">Jandy</option>
                  <option value="Hayward">Hayward</option>
                  <option value="Other">Other</option>
                </select>

                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Equipment / Area Notes (trees, debris, quirks...)" value={customerForm.equipment_notes || ''} onChange={e => setCustomerForm({...customerForm, equipment_notes: e.target.value})} />
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="General Notes" value={customerForm.notes || ''} onChange={e => setCustomerForm({...customerForm, notes: e.target.value})} />

                <div>
                  <label className="text-gray-500 text-xs block mb-2">Equipment Pad Photos</label>
                  {newCustomerPhotos.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {newCustomerPhotos.map((p, i) => (
                        <div key={i} className="flex gap-3 items-center border rounded-lg p-2 bg-gray-50">
                          <img src={p.preview} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                          <input className="flex-1 border rounded-lg p-2 text-gray-800 bg-white text-sm" placeholder="Photo name" value={p.name} onChange={e => { const updated = [...newCustomerPhotos]; updated[i].name = e.target.value; setNewCustomerPhotos(updated) }} />
                          <button onClick={() => setNewCustomerPhotos(newCustomerPhotos.filter((_, j) => j !== i))} className="text-red-400 text-xs flex-shrink-0">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={newCustomerFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const staged = Array.from(e.target.files).map(f => ({ file: f, name: f.name.replace(/\.[^/.]+$/, ''), preview: URL.createObjectURL(f) })); setNewCustomerPhotos(prev => [...prev, ...staged]); newCustomerFileRef.current.value = '' }} />
                  <button type="button" onClick={() => newCustomerFileRef.current.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-400 transition">+ Add Photos</button>
                </div>

                <button onClick={addCustomer} disabled={newCustomerUploading} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">{newCustomerUploading ? 'Saving...' : 'Save Customer'}</button>
              </div>
            )}
            <div className="space-y-2">
              {customers.map(c => (
                <Link href={`/customers/${c.id}`} key={c.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div>
                    <div className="font-semibold text-gray-800">{c.name}</div>
                    <div className="text-gray-500 text-sm">{c.address}</div>
                  </div>
                  <span className="text-gray-400 text-sm">{c.phone}</span>
                </Link>
              ))}
              {customers.length === 0 && <p className="text-center text-gray-400 mt-8">No customers yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Jobs</h2>
              <button onClick={() => setShowJobForm(!showJobForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Add Job</button>
            </div>
            {showJobForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={jobForm.customer_id} onChange={e => setJobForm({...jobForm, customer_id: e.target.value})}>
                  <option value="">Select Customer *</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={jobForm.scheduled_date} onChange={e => setJobForm({...jobForm, scheduled_date: e.target.value})} />
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={jobForm.technician} onChange={e => setJobForm({...jobForm, technician: e.target.value})}>
                  <option value="">Unassigned</option>
                  {technicians.map(t => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                </select>
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" value={jobForm.notes} onChange={e => setJobForm({...jobForm, notes: e.target.value})} />
                <button onClick={addJob} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save Job</button>
              </div>
            )}
            <div className="space-y-2">
              {jobs.map(j => (
                <Link href={`/jobs/${j.id}`} key={j.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div>
                    <div className="font-semibold text-gray-800">{j.customers?.name}</div>
                    <div className="text-gray-500 text-sm">{j.scheduled_date}{j.technician ? ` — ${j.technician}` : ''}</div>
                  </div>
                  <span className={j.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{j.status}</span>
                </Link>
              ))}
              {jobs.length === 0 && <p className="text-center text-gray-400 mt-8">No jobs yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'route' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Daily Route</h2>
            <input type="date" className="w-full border rounded-xl p-3 text-gray-800 bg-white shadow-sm mb-3" value={routeDate} onChange={e => setRouteDate(e.target.value)} />
            {routeJobs.length >= 2 && (
              <button onClick={optimizeRoute} disabled={optimizing} className="w-full mb-4 bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm">{optimizing ? 'Optimizing route...' : 'Optimize Route with AI'}</button>
            )}
            {routeJobs.length === 0 && <p className="text-center text-gray-400 mt-8">No jobs scheduled for this day</p>}
            <div className="space-y-3">
              {routeJobs.map((job, index) => (
                <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveJob(index, -1)} className="text-gray-400 hover:text-blue-600 text-lg leading-none">▲</button>
                    <button onClick={() => moveJob(index, 1)} className="text-gray-400 hover:text-blue-600 text-lg leading-none">▼</button>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{index + 1}</div>
                  <div className="flex-1">
                    <Link href={`/jobs/${job.id}`} className="font-semibold text-gray-800 hover:text-blue-600">{job.customers?.name}</Link>
                    <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                    {job.technician && <div className="text-gray-400 text-xs">Tech: {job.technician}</div>}
                  </div>
                  <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chemicals' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Chemical Logs</h2>
            <div className="space-y-3">
              {chemLogs.map(log => (
                <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-semibold text-gray-800">{log.customers?.name}</div>
                    <div className="text-gray-400 text-sm">{new Date(log.created_at).toLocaleDateString()}</div>
                  </div>
                  {log.jobs?.technician && (
                    <div className="text-xs text-blue-500 mb-2">Tech: {log.jobs.technician}</div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Chlorine</div>
                      <div className="font-semibold text-gray-800">{log.chlorine ?? '-'}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">pH</div>
                      <div className="font-semibold text-gray-800">{log.ph ?? '-'}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Alkalinity</div>
                      <div className="font-semibold text-gray-800">{log.alkalinity ?? '-'}</div>
                    </div>
                  </div>
                  {log.chemical_treatments?.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-2 mb-2">
                      <div className="text-xs text-gray-400 mb-1">Chemicals Added</div>
                      {log.chemical_treatments.map(t => (
                        <div key={t.id} className="text-xs text-gray-700 flex justify-between">
                          <span>{t.product}</span>
                          {t.amount && <span className="text-gray-500">{t.amount} {t.unit}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {log.notes && <p className="text-gray-500 text-sm">{log.notes}</p>}
                </div>
              ))}
              {chemLogs.length === 0 && <p className="text-center text-gray-400 mt-8">No chemical logs yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Invoices</h2>
            <div className="space-y-2">
              {invoices.map(inv => (
                <Link href={`/invoices/${inv.id}`} key={inv.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div>
                    <div className="font-semibold text-gray-800">{inv.customers?.name}</div>
                    <div className="text-gray-500 text-sm">Due: {inv.due_date || 'No due date'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">${inv.amount}</div>
                    <span className={inv.status === 'paid' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-red-100 text-red-700'}>{inv.status}</span>
                  </div>
                </Link>
              ))}
              {invoices.length === 0 && <p className="text-center text-gray-400 mt-8">No invoices yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Chemical Reports</h2>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <label className="text-gray-500 text-sm block mb-2">Select Customer</label>
              <select
                className="w-full border rounded-lg p-2 text-gray-800 bg-white"
                value={selectedReportCustomer}
                onChange={e => { setSelectedReportCustomer(e.target.value); fetchReportLogs(e.target.value) }}
              >
                <option value="">Choose a customer...</option>
                {reportCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {selectedReportCustomer && reportLogs.length === 0 && (
              <p className="text-center text-gray-400 mt-8">No chemical logs for this customer yet</p>
            )}

            {reportLogs.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {['chlorine', 'ph', 'alkalinity'].map(metric => {
                    const values = reportLogs.map(l => l[metric]).filter(v => v !== null)
                    const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '—'
                    const latest = reportLogs[reportLogs.length - 1]?.[metric] ?? '—'
                    const colors = { chlorine: 'blue', ph: 'green', alkalinity: 'yellow' }
                    const c = colors[metric]
                    return (
                      <div key={metric} className={`bg-${c}-50 rounded-xl p-3 text-center`}>
                        <div className="text-xs text-gray-400 capitalize mb-1">{metric}</div>
                        <div className="text-xl font-bold text-gray-800">{latest}</div>
                        <div className="text-xs text-gray-400">avg {avg}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">History</h3>
                  <div className="space-y-2">
                    {[...reportLogs].reverse().map(log => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
                          <div>
                            <div className="text-xs text-gray-400">Chlorine</div>
                            <div className="font-semibold text-gray-800">{log.chlorine ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">pH</div>
                            <div className="font-semibold text-gray-800">{log.ph ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Alkalinity</div>
                            <div className="font-semibold text-gray-800">{log.alkalinity ?? '—'}</div>
                          </div>
                        </div>
                        {log.chemical_treatments?.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-2 mt-2">
                            <div className="text-xs text-gray-400 mb-1">Chemicals Added</div>
                            <div className="space-y-1">
                              {log.chemical_treatments.map(t => (
                                <div key={t.id} className="text-xs text-gray-700 flex justify-between">
                                  <span>{t.product}</span>
                                  {t.amount && <span className="text-gray-500">{t.amount} {t.unit}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.notes && <p className="text-gray-400 text-xs mt-2">{log.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
